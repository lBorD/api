import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { authRoutes, clientRoutes, userRoutes } from '../../src/routes/index.js';

// Criar aplicação de teste
const app = express();
app.use(express.json());
app.use(cors());

// Rotas
app.use('/auth', authRoutes);
app.use('/clients', clientRoutes);
app.use('/users', userRoutes);

describe('Server Integration Tests', () => {
  describe('Configuração do servidor', () => {
    it('deve configurar middleware JSON', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(400); // Esperamos 400 porque não há usuário real no banco

      expect(response.body).toHaveProperty('message');
    });

    it('deve configurar CORS', async () => {
      const response = await request(app)
        .get('/clients/search')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Rotas de autenticação', () => {
    it('deve rejeitar credenciais inválidas', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword'
        })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email não encontrado em nossa base de dados.'
      });
    });
  });

  describe('Rotas de clientes', () => {
    it('deve listar clientes', async () => {
      const response = await request(app)
        .get('/clients/search')
        .expect(200);

      expect(response.body).toHaveProperty('clients');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pages');
    });

    it('deve listar clientes sincronizados', async () => {
      const response = await request(app)
        .get('/clients/search/sync')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });


  });

  describe('Tratamento de erros', () => {
    it('deve retornar 404 para rotas inexistentes', async () => {
      await request(app)
        .get('/nonexistent')
        .expect(404);
    });

    it('deve retornar 404 para métodos não suportados', async () => {
      await request(app)
        .patch('/auth/login')
        .expect(404);
    });
  });

  describe('Validação de entrada', () => {
    it('deve aceitar JSON válido', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(400); // Esperamos 400 porque não há usuário real

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Headers e CORS', () => {
    it('deve incluir headers CORS apropriados', async () => {
      const response = await request(app)
        .get('/clients/search')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('deve aceitar requisições de diferentes origens', async () => {
      const response = await request(app)
        .get('/clients/search')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response.status).toBe(200);
    });
  });
}); 