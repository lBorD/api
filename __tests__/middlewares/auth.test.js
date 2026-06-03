import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../../src/middlewares/auth.js';

const app = express();
app.get('/private', authenticateToken, (req, res) => {
  res.status(200).json({ userId: req.user.id });
});

describe('authenticateToken middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve bloquear quando token não for enviado', async () => {
    const response = await request(app)
      .get('/private')
      .expect(401);

    expect(response.body).toHaveProperty('message');
  });

  it('deve aceitar header Bearer válido', async () => {
    const response = await request(app)
      .get('/private')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(response.body).toEqual({ userId: 1 });
  });

  it('deve bloquear quando token for inválido', async () => {
    jwt.verify.mockImplementationOnce((token, secret, callback) => callback(new Error('invalid')));

    const response = await request(app)
      .get('/private')
      .set('Authorization', 'Bearer bad-token')
      .expect(403);

    expect(response.body).toHaveProperty('message');
  });
});

