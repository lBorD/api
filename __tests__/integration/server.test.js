import request from 'supertest';
import express from 'express';
import cors from 'cors';
import {
  authRoutes,
  clientRoutes,
  serviceRoutes,
  appointmentRoutes,
  userRoutes,
} from '../../src/routes/index.js';

const app = express();
app.use(express.json());
app.use(cors());

app.use('/auth', authRoutes);
app.use('/clients', clientRoutes);
app.use('/services', serviceRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/users', userRoutes);

const withAuth = (reqBuilder) => reqBuilder.set('Authorization', 'Bearer test-token');

describe('Server Integration Tests', () => {
  it('deve configurar middleware JSON', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(400);

    expect(response.body).toHaveProperty('message');
  });

  it('deve configurar CORS', async () => {
    const response = await withAuth(request(app)
      .get('/clients/search')
      .set('Origin', 'http://localhost:3000'))
      .expect(200);

    expect(response.headers).toHaveProperty('access-control-allow-origin');
  });

  it('deve bloquear rota privada sem token', async () => {
    await request(app)
      .get('/clients/search')
      .expect(401);
  });

  it('deve permitir rota privada com token', async () => {
    const response = await withAuth(request(app)
      .get('/services/search'))
      .expect(200);

    expect(response.body).toHaveProperty('services');
  });

  it('deve listar clientes', async () => {
    const response = await withAuth(request(app)
      .get('/clients/search'))
      .expect(200);

    expect(response.body).toHaveProperty('clients');
  });

  it('deve listar agendamentos por janela', async () => {
    const response = await withAuth(request(app)
      .get('/appointments?from=2026-04-15T00:00:00.000Z&to=2026-04-15T23:59:59.999Z'))
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('deve retornar 404 para sugestao sem servico cadastrado no mock', async () => {
    await withAuth(request(app)
      .get('/appointments/suggestions?from=2026-04-15T11:00:00.000Z&to=2026-04-15T22:00:00.000Z&serviceId=1'))
      .expect(404);
  });

  it('deve retornar 404 para rotas inexistentes', async () => {
    await request(app)
      .get('/nonexistent')
      .expect(404);
  });
});

