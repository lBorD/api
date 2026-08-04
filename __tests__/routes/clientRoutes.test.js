import request from 'supertest';
import express from 'express';
import clientRoutes from '../../src/routes/clientRoutes.js';
import Client from '../../src/models/Client.js';
import ClientPhoto from '../../src/models/ClientPhoto.js';
import Appointment from '../../src/models/Appointment.js';
import AppointmentService from '../../src/models/AppointmentService.js';

const app = express();
app.use(express.json());
app.use('/clients', clientRoutes);

const withAuth = (reqBuilder) => reqBuilder.set('Authorization', 'Bearer test-token');
const validPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const photoMetadata = {
  data: Buffer.from('normalized-webp'),
  mimeType: 'image/webp',
  byteSize: 15,
  checksum: 'a'.repeat(64),
  updatedAt: new Date('2026-08-03T12:00:00.000Z'),
};

describe('Client Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.CLIENT_PHOTO_ENABLED;
  });

  it('deve registrar cliente com sucesso', async () => {
    const response = await withAuth(request(app)
      .post('/clients/register')
      .send({
        name: 'Joao',
        lastName: 'Silva',
        phone: '+5511999999999',
        email: 'joao@example.com',
        birthDate: '1990-01-01',
        address: 'Rua Teste, 123',
      }))
      .expect(201);

    expect(response.body).toEqual({ success: true });
  });

  it('deve atualizar cliente', async () => {
    await withAuth(request(app)
      .patch('/clients/update/1')
      .send({
        name: 'Joao Atualizado',
        lastName: 'Silva',
        phone: '+5511999999999',
        email: 'joao@example.com',
        birthDate: '1990-01-01',
        address: 'Rua Nova, 456',
      }))
      .expect(200);
  });

  it('deve retornar 404 ao deletar cliente inexistente', async () => {
    await withAuth(request(app)
      .delete('/clients/delete/1'))
      .expect(404);
  });

  it('deve listar clientes com paginacao', async () => {
    const response = await withAuth(request(app)
      .get('/clients/search?page=1&limit=10'))
      .expect(200);

    expect(response.body).toHaveProperty('clients');
  });

  it('deve listar clientes sincronizados', async () => {
    const response = await withAuth(request(app)
      .get('/clients/search/sync?lastSync=2023-12-31T00:00:00.000Z'))
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('deve retornar 404 para buscas sem dados', async () => {
    await withAuth(request(app)
      .get('/clients/search/by-name?name=Joao'))
      .expect(404);

    await withAuth(request(app)
      .get('/clients/search/by-lastname?lastName=Silva'))
      .expect(404);

    await withAuth(request(app)
      .get('/clients/search/by-phone?phone=+5511999999999'))
      .expect(404);

    await withAuth(request(app)
      .get('/clients/search/by-id/1'))
      .expect(404);
  });

  it('deve validar parametros invalidos', async () => {
    const response = await withAuth(request(app)
      .get('/clients/search?page=invalid&limit=invalid'))
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('deve retornar 401 sem token', async () => {
    await request(app)
      .get('/clients/search')
      .expect(401);
  });

  it('protege as rotas de perfil e histórico da cliente', async () => {
    Client.findOne.mockResolvedValue({ id: 1, userId: 1, name: 'Maria' });
    Appointment.findAll.mockResolvedValue([]);
    AppointmentService.findAll.mockResolvedValue([]);
    await withAuth(request(app)
      .get('/clients/1/profile'))
      .expect(200);

    await withAuth(request(app)
      .get('/clients/1/appointments/history'))
      .expect(200);

    await request(app)
      .get('/clients/1/profile')
      .expect(401);

    await request(app)
      .get('/clients/1/appointments/history')
      .expect(401);
  });

  it('exige Bearer nas rotas de foto', async () => {
    await request(app).put('/clients/1/photo').expect(401);
    await request(app).get('/clients/1/photo').expect(401);
    await request(app).delete('/clients/1/photo').expect(401);
  });

  it('executa o upload antes do handler PUT de foto autenticado', async () => {
    process.env.CLIENT_PHOTO_ENABLED = 'true';
    Client.findOne.mockResolvedValue({ id: 1, userId: 1 });
    ClientPhoto.update.mockResolvedValue([1]);
    ClientPhoto.findOne.mockResolvedValue(photoMetadata);
    const response = await withAuth(request(app)
      .put('/clients/1/photo')
      .attach('photo', validPngBuffer, 'photo.png'))
      .expect(200);

    expect(response.body).toEqual({
      photoUrl: '/clients/1/photo?v=2026-08-03T12%3A00%3A00.000Z',
      photoUpdatedAt: '2026-08-03T12:00:00.000Z',
    });

    await withAuth(request(app).get('/clients/1/photo')).expect(200);
    await withAuth(request(app).delete('/clients/1/photo')).expect(204);
  });

  it('confirma propriedade antes de aceitar ou limitar o multipart da foto', async () => {
    process.env.CLIENT_PHOTO_ENABLED = 'true';
    Client.findOne.mockResolvedValue(null);

    await withAuth(request(app)
      .put('/clients/1/photo')
      .attach('photo', Buffer.alloc(5 * 1024 * 1024 + 1), 'photo.png'))
      .expect(404, { error: 'Cliente não encontrado.' });

    expect(ClientPhoto.update).not.toHaveBeenCalled();
  });

  it('oculta as três rotas de foto antes de ownership, upload ou controller durante o beta', async () => {
    delete process.env.CLIENT_PHOTO_ENABLED;
    Client.findOne.mockResolvedValue({ id: 1, userId: 1 });

    await withAuth(request(app)
      .put('/clients/1/photo')
      .attach('photo', Buffer.from('not-an-image'), 'photo.png'))
      .expect(404, { error: 'Não encontrado.' });
    await withAuth(request(app).get('/clients/1/photo')).expect(404, { error: 'Não encontrado.' });
    await withAuth(request(app).delete('/clients/1/photo')).expect(404, { error: 'Não encontrado.' });

    expect(Client.findOne).not.toHaveBeenCalled();
    expect(ClientPhoto.findOne).not.toHaveBeenCalled();
    expect(ClientPhoto.update).not.toHaveBeenCalled();
    expect(ClientPhoto.destroy).not.toHaveBeenCalled();
  });
});

