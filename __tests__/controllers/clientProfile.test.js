import request from 'supertest';
import express from 'express';
import { Op } from 'sequelize';
import Client from '../../src/models/Client.js';
import Appointment from '../../src/models/Appointment.js';
import AppointmentService from '../../src/models/AppointmentService.js';
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

describe('ClientProfileController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AppointmentService.findAll.mockResolvedValue([]);
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
});
