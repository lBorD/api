import request from 'supertest';
import express from 'express';
import serviceRoutes from '../../src/routes/serviceRoutes.js';

const app = express();
app.use(express.json());
app.use('/services', serviceRoutes);

const withAuth = (reqBuilder) => reqBuilder.set('Authorization', 'Bearer test-token');

describe('Service Routes', () => {
  it('deve listar servicos', async () => {
    const response = await withAuth(request(app)
      .get('/services/search'))
      .expect(200);

    expect(response.body).toHaveProperty('services');
  });

  it('deve listar servicos ativos', async () => {
    const response = await withAuth(request(app)
      .get('/services/search/active'))
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('deve retornar 404 ao buscar por id inexistente', async () => {
    await withAuth(request(app)
      .get('/services/search/by-id/1'))
      .expect(404);
  });

  it('deve criar servico', async () => {
    const response = await withAuth(request(app)
      .post('/services/register')
      .send({ name: 'Lashes', price: 100, estimatedTime: 60, cost: 10 }))
      .expect(201);

    expect(response.body).toEqual({ success: true });
  });

  it('deve atualizar servico', async () => {
    await withAuth(request(app)
      .patch('/services/update/1')
      .send({ name: 'Lashes', price: 120, estimatedTime: 70, cost: 20 }))
      .expect(200);
  });

  it('deve retornar 404 ao excluir servico inexistente', async () => {
    await withAuth(request(app)
      .delete('/services/delete/1'))
      .expect(404);
  });

  it('deve retornar 401 sem token', async () => {
    await request(app)
      .get('/services/search')
      .expect(401);
  });
});

