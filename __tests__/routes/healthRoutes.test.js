import request from 'supertest';
import express from 'express';
import healthRoutes from '../../src/routes/healthRoutes.js';

const app = express();
app.use('/health', healthRoutes);

describe('Health Routes', () => {
  it('responde sem autenticacao e sem permitir cache', async () => {
    const response = await request(app)
      .get('/health')
      .expect('Cache-Control', 'no-store')
      .expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });
});
