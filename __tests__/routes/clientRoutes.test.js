import request from 'supertest';
import express from 'express';
import clientRoutes from '../../src/routes/clientRoutes.js';
import Client from '../../src/models/Client.js';
import Appointment from '../../src/models/Appointment.js';
import AppointmentService from '../../src/models/AppointmentService.js';

const app = express();
app.use(express.json());
app.use('/clients', clientRoutes);

const withAuth = (reqBuilder) => reqBuilder.set('Authorization', 'Bearer test-token');

describe('Client Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});

