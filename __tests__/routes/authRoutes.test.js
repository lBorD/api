import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/authRoutes.js';
import login from '../../src/controllers/login.js';
import User from '../../src/models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('POST /auth/login', () => {
    it('deve fazer login com sucesso', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword'
      };

      const mockToken = 'mock-jwt-token';

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue(mockToken);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toEqual({
        token: mockToken,
        success: true
      });
    });

    it('deve retornar erro 400 quando email não for encontrado', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email não encontrado em nossa base de dados.'
      });
      expect(User.findOne).toHaveBeenCalledWith({ where: { email: loginData.email } });
    });

    it('deve retornar erro 400 quando senha estiver incorreta', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword'
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toEqual({
        message: 'Senha incorreta.'
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
    });

    it('deve retornar erro 500 quando ocorrer erro interno', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const error = new Error('Erro de banco de dados');
      User.findOne.mockRejectedValue(error);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(500);

      expect(response.body).toEqual({
        message: 'Erro no servidor',
        error: {}
      });
    });

    it('deve validar formato de email', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'password123'
      };

      User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email não encontrado em nossa base de dados.'
      });
    });
  });

  describe('Métodos HTTP não suportados', () => {
    it('deve retornar 404 para GET /auth/login', async () => {
      await request(app)
        .get('/auth/login')
        .expect(404);
    });

    it('deve retornar 404 para PUT /auth/login', async () => {
      await request(app)
        .put('/auth/login')
        .expect(404);
    });

    it('deve retornar 404 para DELETE /auth/login', async () => {
      await request(app)
        .delete('/auth/login')
        .expect(404);
    });
  });

  describe('Validação de entrada', () => {
    it('deve aceitar JSON válido', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send(loginData)
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email não encontrado em nossa base de dados.'
      });
    });

    it('deve rejeitar dados não-JSON', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'text/plain')
        .send('invalid data')
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email não encontrado em nossa base de dados.'
      });
    });
  });
}); 