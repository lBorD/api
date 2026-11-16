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
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: mockUser.id, actorId: mockUser.id, role: 'owner' },
        process.env.JWT_SECRET,
        { expiresIn: '12h' },
      );
      expect(response.body).toEqual({
        token: mockToken,
        success: true,
        user: {
          id: mockUser.id,
          name: mockUser.email,
          email: mockUser.email,
          role: 'owner',
        },
      });
    });

    it('deve emitir token da funcionaria apontando para a conta da dona', async () => {
      User.findOne.mockResolvedValue({
        id: 7,
        name: 'Maria',
        email: 'maria@estudio.com',
        password: 'hashedPassword',
        role: 'staff',
        accountOwnerId: 1,
        active: true,
      });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('staff-token');

      const response = await request(app)
        .post('/login')
        .send({ email: 'maria@estudio.com', password: 'senha123' })
        .expect(200);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1, actorId: 7, role: 'staff' },
        process.env.JWT_SECRET,
        { expiresIn: '12h' },
      );
      expect(response.body.user).toEqual({
        id: 7,
        name: 'Maria',
        email: 'maria@estudio.com',
        role: 'staff',
      });
    });

    it('deve recusar funcionaria desativada', async () => {
      User.findOne.mockResolvedValue({
        id: 7,
        email: 'maria@estudio.com',
        password: 'hashedPassword',
        role: 'staff',
        accountOwnerId: 1,
        active: false,
      });
      bcrypt.compare.mockResolvedValue(true);

      await request(app)
        .post('/login')
        .send({ email: 'maria@estudio.com', password: 'senha123' })
        .expect(403);

      expect(jwt.sign).not.toHaveBeenCalled();
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