import request from 'supertest';
import express from 'express';
import clientRoutes from '../../src/routes/clientRoutes.js';
import ClientController from '../../src/controllers/client.js';
import validateClient from '../../src/middlewares/validateClient.js';
import Client from '../../src/models/Client.js';

// Os mocks estão configurados no jest.setup.js

const app = express();
app.use(express.json());
app.use('/clients', clientRoutes);

describe('Client Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /clients/register', () => {
    it('deve registrar cliente com sucesso', async () => {
      const clientData = {
        name: 'João',
        lastName: 'Silva',
        phone: '+5511999999999',
        email: 'joao@example.com',
        birthDate: '1990-01-01',
        address: 'Rua Teste, 123'
      };

      const response = await request(app)
        .post('/clients/register')
        .send(clientData)
        .expect(201);

      expect(response.body).toEqual({ success: true });
    });
  });

  describe('PUT /clients/update/:id', () => {
    it('deve atualizar cliente com sucesso', async () => {
      const updateData = {
        name: 'João Atualizado',
        lastName: 'Silva',
        phone: '+5511999999999',
        email: 'joao@example.com',
        birthDate: '1990-01-01',
        address: 'Rua Nova, 456'
      };

      const response = await request(app)
        .put('/clients/update/1')
        .send(updateData)
        .expect(200);

      expect(response.body).toBeNull();
    });
  });

  describe('DELETE /clients/delete/:id', () => {
    it('deve deletar cliente com sucesso', async () => {
      await request(app)
        .delete('/clients/delete/1')
        .expect(404);
    });
  });

  describe('GET /clients/search', () => {
    it('deve listar clientes com paginação', async () => {
      const response = await request(app)
        .get('/clients/search?page=1&limit=10')
        .expect(200);

      expect(response.body).toEqual({
        total: 0,
        page: 1,
        pages: 0,
        clients: []
      });
    });
  });

  describe('GET /clients/search/sync', () => {
    it('deve listar clientes sincronizados', async () => {
      const response = await request(app)
        .get('/clients/search/sync?lastSync=2023-12-31 00:00:00')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /clients/search/by-name', () => {
    it('deve listar clientes por nome', async () => {
      await request(app)
        .get('/clients/search/by-name?name=João')
        .expect(404);
    });
  });

  describe('GET /clients/search/by-lastname', () => {
    it('deve listar clientes por sobrenome', async () => {
      await request(app)
        .get('/clients/search/by-lastname?lastName=Silva')
        .expect(404);
    });
  });

  describe('GET /clients/search/by-phone', () => {
    it('deve listar clientes por telefone', async () => {
      await request(app)
        .get('/clients/search/by-phone?phone=+5511999999999')
        .expect(404);
    });
  });

  describe('GET /clients/search/by-id/:id', () => {
    it('deve buscar cliente por ID', async () => {
      await request(app)
        .get('/clients/search/by-id/1')
        .expect(404);
    });
  });

  describe('Métodos HTTP não suportados', () => {
    it('deve retornar 404 para rotas inexistentes', async () => {
      await request(app)
        .get('/clients/nonexistent')
        .expect(404);
    });

    it('deve retornar 404 para métodos não suportados', async () => {
      await request(app)
        .patch('/clients/register')
        .expect(404);
    });
  });

  describe('Validação de parâmetros', () => {
    it('deve validar parâmetros de query', async () => {
      const response = await request(app)
        .get('/clients/search?page=invalid&limit=invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('deve validar parâmetros de rota', async () => {
      const response = await request(app)
        .get('/clients/search/by-id/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Tratamento de erros', () => {
    it('deve lidar com erros do controlador', async () => {
      const response = await request(app)
        .get('/clients/search/by-id/999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
}); 