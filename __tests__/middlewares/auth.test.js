import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireOwner } from '../../src/middlewares/auth.js';
import User from '../../src/models/User.js';

const app = express();
app.get('/private', authenticateToken, (req, res) => {
  res.status(200).json({ userId: req.user.id });
});
app.get('/owner-only', authenticateToken, requireOwner, (req, res) => {
  res.status(200).json({ ok: true });
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

  it('trata token antigo, so com id, como da dona', async () => {
    const response = await request(app)
      .get('/owner-only')
      .set('Authorization', 'Bearer old-token')
      .expect(200);

    expect(response.body).toEqual({ ok: true });
    expect(User.findOne).not.toHaveBeenCalled();
  });

  describe('funcionaria', () => {
    const staffPayload = { id: 1, actorId: 7, role: 'staff' };

    beforeEach(() => {
      jwt.verify.mockImplementationOnce((token, secret, callback) => callback(null, staffPayload));
    });

    it('acessa os dados da conta da dona enquanto estiver ativa', async () => {
      User.findOne.mockResolvedValueOnce({ id: 7, accountOwnerId: 1, active: true });

      const response = await request(app)
        .get('/private')
        .set('Authorization', 'Bearer staff-token')
        .expect(200);

      expect(response.body).toEqual({ userId: 1 });
      expect(User.findOne).toHaveBeenCalledWith({
        where: { id: 7, accountOwnerId: 1, active: true },
      });
    });

    it('perde o acesso na hora ao ser desativada', async () => {
      User.findOne.mockResolvedValueOnce(null);

      await request(app)
        .get('/private')
        .set('Authorization', 'Bearer staff-token')
        .expect(403);
    });

    it('e barrada nas rotas exclusivas da dona', async () => {
      User.findOne.mockResolvedValueOnce({ id: 7, accountOwnerId: 1, active: true });

      await request(app)
        .get('/owner-only')
        .set('Authorization', 'Bearer staff-token')
        .expect(403);
    });
  });
});
