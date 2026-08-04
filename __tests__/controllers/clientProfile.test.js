import request from 'supertest';
import express from 'express';
import { Op } from 'sequelize';
import Client from '../../src/models/Client.js';
import Appointment from '../../src/models/Appointment.js';
import AppointmentService from '../../src/models/AppointmentService.js';
import ClientPhoto from '../../src/models/ClientPhoto.js';
import sequelize from '../../src/config/db.js';
import ClientProfileController from '../../src/controllers/clientProfile.js';
import { encodeHistoryCursor } from '../../src/utils/clientHistoryCursor.js';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 7 };
  next();
});
app.get('/:id/profile', ClientProfileController.getProfile);
app.get('/:id/appointments/history', ClientProfileController.getHistory);
app.put('/:id/photo', express.raw({ type: '*/*' }), (req, res, next) => {
  req.file = { buffer: req.body };
  next();
}, ClientProfileController.putPhoto);
app.get('/:id/photo', ClientProfileController.getPhoto);
app.delete('/:id/photo', ClientProfileController.deletePhoto);

const clientFixture = {
  id: 1,
  userId: 7,
  name: 'Maria',
  lastName: 'Silva',
  phone: '+5511999999999',
  email: 'maria@example.com',
  birthDate: new Date('1990-01-01T00:00:00.000Z'),
  address: 'Rua das Flores, 10',
  preferencesNotes: 'Prefere natural',
};

const photoRow = {
  data: Buffer.from('normalized-webp'),
  mimeType: 'image/webp',
  byteSize: 15,
  checksum: 'a'.repeat(64),
  width: 512,
  height: 512,
  updatedAt: new Date('2026-08-03T12:00:00.000Z'),
};
const validPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('ClientProfileController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AppointmentService.findAll.mockResolvedValue([]);
    ClientPhoto.findOne.mockReset();
    ClientPhoto.update.mockReset();
    ClientPhoto.create.mockReset();
    ClientPhoto.destroy.mockReset();
  });

  it('não consulta appointments quando a cliente é alheia ou inexistente', async () => {
    Client.findOne.mockResolvedValue(null);

    await request(app).get('/1/profile').expect(404, { error: 'Cliente não encontrado.' });
    await request(app).get('/1/appointments/history').expect(404, { error: 'Cliente não encontrado.' });

    expect(Client.findOne).toHaveBeenCalledTimes(2);
    expect(Client.findOne).toHaveBeenCalledWith({ where: { id: 1, userId: 7 } });
    expect(Appointment.findAll).not.toHaveBeenCalled();
  });

  it('rejeita id, limite e cursor inválidos antes de consultar dados', async () => {
    await request(app).get('/0/profile').expect(400, { error: 'ID inválido. O ID deve ser um número inteiro positivo.' });
    await request(app).get('/1/appointments/history?limit=21').expect(400, { error: "O parâmetro 'limit' deve ser um número inteiro entre 1 e 20." });
    await request(app).get('/1/appointments/history?cursor=invalido').expect(400, { error: 'Cursor inválido.' });

    expect(Client.findOne).not.toHaveBeenCalled();
    expect(Appointment.findAll).not.toHaveBeenCalled();
  });

  it('devolve perfil operacional inicial sem campos financeiros, Google ou cancelados', async () => {
    Client.findOne.mockResolvedValue(clientFixture);
    Appointment.findAll.mockImplementation(({ where }) => {
      if (where.appointmentId) {
        return Promise.resolve([]);
      }

      if (where.startAt[Op.gte]) {
        return Promise.resolve([{
          id: 20,
          clientId: 1,
          startAt: new Date('2030-01-02T10:00:00.000Z'),
          endAt: new Date('2030-01-02T11:00:00.000Z'),
          status: 'scheduled',
          notes: 'Confirmar',
          price: 120,
          depositAmount: 30,
          googleSyncStatus: 'synced',
        }]);
      }

      return Promise.resolve([{
        id: 19,
        clientId: 1,
        startAt: new Date('2020-01-02T10:00:00.000Z'),
        endAt: new Date('2020-01-02T11:00:00.000Z'),
        status: 'completed',
        notes: null,
      }]);
    });

    const response = await request(app).get('/1/profile').expect(200);

    expect(response.body).toEqual({
      client: {
        id: 1,
        name: 'Maria',
        lastName: 'Silva',
        phone: '+5511999999999',
        email: 'maria@example.com',
        birthDate: '1990-01-01T00:00:00.000Z',
        address: 'Rua das Flores, 10',
        preferencesNotes: 'Prefere natural',
        photoUrl: null,
        photoUpdatedAt: null,
      },
      upcomingAppointments: [expect.objectContaining({ id: 20, status: 'scheduled' })],
      history: { appointments: [expect.objectContaining({ id: 19, status: 'completed' })], nextCursor: null },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/price|depositAmount|google|canceled|archivedAt/i);
  });

  it('busca uma página de histórico da cliente proprietária com limite e cursor validados', async () => {
    Client.findOne.mockResolvedValue(clientFixture);
    Appointment.findAll.mockResolvedValue([]);
    const cursor = encodeHistoryCursor({ startAt: '2026-08-01T10:00:00.000Z', id: 9 });

    const response = await request(app)
      .get(`/1/appointments/history?limit=20&cursor=${cursor}`)
      .expect(200);

    expect(response.body).toEqual({ appointments: [], nextCursor: null });
    expect(Client.findOne).toHaveBeenCalledWith({ where: { id: 1, userId: 7 } });
    expect(Appointment.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 21 }));
  });

  it('inclui somente metadados da foto versionados no perfil inicial com opt-in', async () => {
    process.env.CLIENT_PHOTO_ENABLED = 'true';
    Client.findOne.mockResolvedValue(clientFixture);
    ClientPhoto.findOne.mockResolvedValue({ ...photoRow, data: undefined });
    Appointment.findAll.mockResolvedValue([]);

    const response = await request(app).get('/1/profile').expect(200);

    expect(response.body.client).toMatchObject({
      photoUrl: '/clients/1/photo?v=2026-08-03T12%3A00%3A00.000Z',
      photoUpdatedAt: '2026-08-03T12:00:00.000Z',
    });
    expect(JSON.stringify(response.body)).not.toContain('normalized-webp');
    expect(ClientPhoto.findOne).toHaveBeenCalledWith({
      attributes: ['mimeType', 'byteSize', 'checksum', 'width', 'height', 'updatedAt'],
      where: { userId: 7, clientId: 1 },
    });
  });

  it('mantém metadados de foto nulos no perfil beta sem consultar client_photos', async () => {
    delete process.env.CLIENT_PHOTO_ENABLED;
    Client.findOne.mockResolvedValue(clientFixture);
    ClientPhoto.findOne.mockResolvedValue({ ...photoRow, data: undefined });
    Appointment.findAll.mockResolvedValue([]);

    const response = await request(app).get('/1/profile').expect(200);

    expect(response.body.client).toMatchObject({ photoUrl: null, photoUpdatedAt: null });
    const metadataQueries = ClientPhoto.findOne.mock.calls
      .map(([options]) => options)
      .filter(({ attributes }) => Array.isArray(attributes) && attributes.includes('checksum'));
    expect(metadataQueries).toEqual([]);
  });

  it('rejeita upload inválido antes de ler ou mutar fotos', async () => {
    await request(app).put('/0/photo').send(validPngBuffer).expect(400);

    expect(Client.findOne).not.toHaveBeenCalled();
    expect(ClientPhoto.findOne).not.toHaveBeenCalled();
    expect(ClientPhoto.update).not.toHaveBeenCalled();
  });

  it('não lê, processa ou remove foto quando a cliente não pertence ao usuário', async () => {
    Client.findOne.mockResolvedValue(null);

    await request(app).get('/1/photo').expect(404, { error: 'Cliente não encontrado.' });
    await request(app).put('/1/photo').send(validPngBuffer).expect(404, { error: 'Cliente não encontrado.' });
    await request(app).delete('/1/photo').expect(404, { error: 'Cliente não encontrado.' });

    expect(ClientPhoto.update).not.toHaveBeenCalled();
    expect(ClientPhoto.destroy).not.toHaveBeenCalled();
  });

  it('responde 304 sem corpo quando o ETag coincide', async () => {
    Client.findOne.mockResolvedValue({ id: 1 });
    ClientPhoto.findOne.mockResolvedValue(photoRow);

    const response = await request(app)
      .get('/1/photo')
      .set('If-None-Match', `"${photoRow.checksum}"`)
      .expect(304);

    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body).toHaveLength(0);
    expect(response.headers).toMatchObject({
      etag: `"${photoRow.checksum}"`,
      'cache-control': 'private, max-age=86400, must-revalidate',
      'x-content-type-options': 'nosniff',
    });
  });

  it.each([
    `W/"${photoRow.checksum}"`,
    '*',
    `"outro", W/"${photoRow.checksum}"`,
  ])('aceita If-None-Match fraco ou lista correspondente: %s', async (ifNoneMatch) => {
    Client.findOne.mockResolvedValue({ id: 1 });
    ClientPhoto.findOne.mockResolvedValue(photoRow);

    await request(app)
      .get('/1/photo')
      .set('If-None-Match', ifNoneMatch)
      .expect(304);
  });

  it.each([
    `W/"${photoRow.checksum}"`,
    '*',
    `"outro", W/"${photoRow.checksum}"`,
  ])('faz a comparação fraca antes de delegar o envio ao Express: %s', async (ifNoneMatch) => {
    const res = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      end: jest.fn(),
      send: jest.fn(),
    };
    Client.findOne.mockResolvedValue({ id: 1 });
    ClientPhoto.findOne.mockResolvedValue(photoRow);

    await ClientProfileController.getPhoto({
      params: { id: '1' },
      user: { id: 7 },
      get: jest.fn().mockReturnValue(ifNoneMatch),
    }, res);

    expect(res.status).toHaveBeenCalledWith(304);
    expect(res.end).toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it('retorna WebP com cache privado e tamanho exato', async () => {
    Client.findOne.mockResolvedValue({ id: 1 });
    ClientPhoto.findOne.mockResolvedValue(photoRow);

    const response = await request(app).get('/1/photo').expect(200);

    expect(response.headers).toMatchObject({
      'content-type': 'image/webp',
      'content-length': String(photoRow.byteSize),
      etag: `"${photoRow.checksum}"`,
      'cache-control': 'private, max-age=86400, must-revalidate',
      'x-content-type-options': 'nosniff',
    });
    expect(Buffer.compare(response.body, photoRow.data)).toBe(0);
  });

  it('usa o comprimento real dos bytes mesmo quando byteSize diverge', async () => {
    Client.findOne.mockResolvedValue({ id: 1 });
    ClientPhoto.findOne.mockResolvedValue({ ...photoRow, byteSize: photoRow.byteSize + 99 });

    const response = await request(app).get('/1/photo').expect(200);

    expect(response.headers['content-length']).toBe(String(photoRow.data.length));
  });

  it('preserva a foto anterior quando o processamento falha', async () => {
    Client.findOne.mockResolvedValue({ id: 1 });

    await request(app)
      .put('/1/photo')
      .send(Buffer.from('not-an-image'))
      .expect(415, { error: 'Foto inválida.' });

    expect(ClientPhoto.update).not.toHaveBeenCalled();
    expect(ClientPhoto.create).not.toHaveBeenCalled();
  });

  it('substitui a foto processada e retorna uma URL versionada', async () => {
    Client.findOne.mockResolvedValue({ id: 1 });
    ClientPhoto.update.mockResolvedValue([1]);
    ClientPhoto.findOne.mockResolvedValue({ ...photoRow, data: undefined });

    await request(app)
      .put('/1/photo')
      .set('Content-Type', 'image/png')
      .send(validPngBuffer)
      .expect(200, {
        photoUrl: '/clients/1/photo?v=2026-08-03T12%3A00%3A00.000Z',
        photoUpdatedAt: '2026-08-03T12:00:00.000Z',
      });

    expect(ClientPhoto.update).toHaveBeenCalled();
  });

  it('usa os metadados retornados pela transação de replace sem leitura posterior', async () => {
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    sequelize.transaction.mockImplementation(async (callback) => callback(transaction));
    Client.findOne.mockResolvedValue({ id: 1 });
    ClientPhoto.update.mockResolvedValue([1]);
    ClientPhoto.findOne.mockResolvedValue({ ...photoRow, data: undefined });

    await request(app)
      .put('/1/photo')
      .set('Content-Type', 'image/png')
      .send(validPngBuffer)
      .expect(200);

    const metadataCalls = ClientPhoto.findOne.mock.calls
      .map(([options]) => options)
      .filter(({ where }) => where?.userId === 7 && where?.clientId === 1);
    expect(metadataCalls).toEqual([{
      attributes: ['mimeType', 'byteSize', 'checksum', 'width', 'height', 'updatedAt'],
      where: { userId: 7, clientId: 1 },
      transaction,
    }]);
  });

  it('remove a foto de forma idempotente', async () => {
    Client.findOne.mockResolvedValue({ id: 1 });
    ClientPhoto.destroy.mockResolvedValue(0);

    await request(app).delete('/1/photo').expect(204);

    expect(ClientPhoto.destroy).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 7, clientId: 1 },
      transaction: expect.any(Object),
    }));
  });

  it('mantém 404 se a propriedade desaparecer antes da persistência', async () => {
    Client.findOne.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce(null);

    await request(app)
      .put('/1/photo')
      .set('Content-Type', 'image/png')
      .send(validPngBuffer)
      .expect(404, { error: 'Cliente não encontrado.' });
  });
});
