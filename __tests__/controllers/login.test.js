import request from 'supertest';
import express from 'express';
import login from '../../src/controllers/login.js';
import User from '../../src/models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.post('/login', login);

describe('Login Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('POST /login', () => {
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
        .post('/login')
        .send(loginData)
        .expect(200);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: loginData.email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(jwt.sign).toHaveBeenCalledWith({ id: mockUser.id }, process.env.JWT_SECRET, { expiresIn: '12h' });
      expect(response.body).toEqual({
        token: mockToken,
        success: true
      });
    });

    it('deve retornar erro quando email não for encontrado', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email não encontrado em nossa base de dados.'
      });
      expect(User.findOne).toHaveBeenCalledWith({ where: { email: loginData.email } });
    });

    it('deve retornar erro quando senha estiver incorreta', async () => {
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
        .post('/login')
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
        .post('/login')
        .send(loginData)
        .expect(500);

      expect(response.body).toEqual({
        message: 'Erro no servidor',
        error: {}
      });
    });
  });
}); 