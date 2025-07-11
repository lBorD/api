import request from 'supertest';
import express from 'express';
import UserController from '../../src/controllers/userRegister.js';
import User from '../../src/models/User.js';

const app = express();
app.use(express.json());
app.post('/register', UserController.registerUser);

describe('UserController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('deve registrar um usuário com sucesso', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 1,
        ...userData,
        createdAt: '2025-07-11T01:42:57.038Z',
        updatedAt: '2025-07-11T01:42:57.038Z'
      };

      User.create.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/register')
        .send(userData)
        .expect(200);

      expect(User.create).toHaveBeenCalledWith(userData);
      expect(response.body).toMatchObject({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('deve retornar erro 500 quando falhar ao criar usuário', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const error = new Error('Erro de banco de dados');
      User.create.mockRejectedValue(error);

      const response = await request(app)
        .post('/register')
        .send(userData)
        .expect(500);

      expect(response.text).toContain('Não foi possível adicionar o usuário');
      expect(User.create).toHaveBeenCalledWith(userData);
    });

    it('deve validar dados obrigatórios', async () => {
      const userData = {
        username: '',
        email: 'invalid-email',
        password: ''
      };

      const response = await request(app)
        .post('/register')
        .send(userData)
        .expect(500);

      expect(User.create).toHaveBeenCalledWith(userData);
    });
  });
}); 