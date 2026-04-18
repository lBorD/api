import request from 'supertest';
import express from 'express';
import appointmentRoutes from '../../src/routes/appointmentRoutes.js';

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

  it('deve retornar 404 ao listar sugestoes sem servico no mock', async () => {
    await withAuth(request(app)
      .get('/appointments/suggestions?from=2026-04-15T11:00:00.000Z&to=2026-04-15T22:00:00.000Z&serviceId=1'))
      .expect(404);
  });

  it('deve retornar 401 sem token', async () => {
    await request(app)
      .get('/appointments?from=2026-04-15T00:00:00.000Z&to=2026-04-15T23:59:59.999Z')
      .expect(401);
  });
});

