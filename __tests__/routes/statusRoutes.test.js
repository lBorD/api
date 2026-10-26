import request from 'supertest';
import express from 'express';
import statusRoutes from '../../src/routes/statusRoutes.js';

const app = express();
app.use('/status', statusRoutes);

describe('Status Routes', () => {
  it('responde sem autenticacao, em json, e sem permitir cache', async () => {
    const response = await request(app)
      .get('/status')
      .set('Accept', 'application/json')
      .expect('Cache-Control', 'no-store')
      .expect(200);

    expect(response.body).toEqual(expect.objectContaining({
      status: 'ok',
      service: 'beautyapp-api',
    }));
    expect(response.body.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(response.body.database.status).toBe('ok');
  });

  it('entrega pagina html quando o navegador pede', async () => {
    const response = await request(app)
      .get('/status')
      .set('Accept', 'text/html,application/xhtml+xml')
      .expect('Content-Type', /html/)
      .expect(200);

    expect(response.text).toContain('API no ar');
    expect(response.text).toContain('beautyapp-api');
  });

  it('nao muda o contrato do /health', async () => {
    // O UptimeRobot monitora /health; /status e rota nova e separada.
    const healthApp = express();
    const healthRoutes = (await import('../../src/routes/healthRoutes.js')).default;
    healthApp.use('/health', healthRoutes);

    const response = await request(healthApp).get('/health').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });
});
