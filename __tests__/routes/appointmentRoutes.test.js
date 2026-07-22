import request from 'supertest';
import express from 'express';
import appointmentRoutes from '../../src/routes/appointmentRoutes.js';
import Appointment from '../../src/models/Appointment.js';

const app = express();
app.use(express.json());
app.use('/appointments', appointmentRoutes);

const withAuth = (reqBuilder) => reqBuilder.set('Authorization', 'Bearer test-token');

describe('Appointment Routes', () => {
  it('deve listar agendamentos por janela', async () => {
    const response = await withAuth(request(app)
      .get('/appointments?from=2026-04-15T00:00:00.000Z&to=2026-04-15T23:59:59.999Z'))
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('deve retornar erro de negocio ao criar sem relacoes mockadas', async () => {
    await withAuth(request(app)
      .post('/appointments')
      .send({
        clientId: 1,
        serviceId: 1,
        startAt: '2026-04-15T14:00:00.000Z',
      }))
      .expect(404);
  });

  it('deve retornar 404 ao atualizar agendamento inexistente', async () => {
    await withAuth(request(app)
      .patch('/appointments/1')
      .send({ notes: 'Atualizado' }))
      .expect(404);
  });

  it('deve retornar 404 ao atualizar status de agendamento inexistente', async () => {
    await withAuth(request(app)
      .patch('/appointments/1/status')
      .send({ status: 'canceled' }))
      .expect(404);
  });

  it('deve permitir arquivar atendimento cancelado autenticado', async () => {
    const appointment = {
      id: 1,
      userId: 1,
      clientId: 1,
      serviceId: 1,
      startAt: new Date('2026-04-15T14:00:00.000Z'),
      endAt: new Date('2026-04-15T15:00:00.000Z'),
      price: 100,
      depositAmount: 0,
      status: 'canceled',
      archivedAt: null,
      notes: '',
      googleSyncStatus: 'disabled',
      client: { id: 1, name: 'Ana' },
      services: [],
    };
    appointment.update = jest.fn(async (values) => Object.assign(appointment, values));
    Appointment.findOne.mockResolvedValue(appointment);

    const response = await withAuth(request(app)
      .patch('/appointments/1/archive'))
      .expect(200);

    expect(response.body).toEqual(expect.objectContaining({
      id: 1,
      status: 'canceled',
      archivedAt: expect.any(String),
    }));
  });

  it('deve retornar 401 sem token', async () => {
    await request(app)
      .get('/appointments?from=2026-04-15T00:00:00.000Z&to=2026-04-15T23:59:59.999Z')
      .expect(401);
  });
});

