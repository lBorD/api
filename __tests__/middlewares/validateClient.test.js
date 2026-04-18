import request from 'supertest';
import express from 'express';
import validator from 'validator';
import Client from '../../src/models/Client.js';
import { isValidPhoneNumber } from '../../src/utils/phoneValidator.js';
import validateClient from '../../src/middlewares/validateClient.js';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 1 };
  next();
});
app.post('/client', validateClient, (req, res) => res.status(200).json({ success: true }));

const validPayload = {
  email: 'test@example.com',
  name: 'Maria',
  phone: '+5511999999999',
  birthDate: '1990-01-01',
};

describe('validateClient Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    if (jest.isMockFunction(Client.findOne)) {
      Client.findOne.mockResolvedValue(null);
    }

    if (jest.isMockFunction(validator.isEmail)) {
      validator.isEmail.mockReturnValue(true);
    }

    if (jest.isMockFunction(validator.isDate)) {
      validator.isDate.mockReturnValue(true);
    }

    if (jest.isMockFunction(isValidPhoneNumber)) {
      isValidPhoneNumber.mockReturnValue({ isValid: true, formatted: '+5511999999999' });
    }
  });

  it('deve permitir payload valido', async () => {
    const response = await request(app)
      .post('/client')
      .send(validPayload)
      .expect(200);

    expect(response.body).toEqual({ success: true });
  });

  it('deve bloquear quando faltar email', async () => {
    const response = await request(app)
      .post('/client')
      .send({ ...validPayload, email: '' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('deve bloquear email invalido', async () => {
    if (jest.isMockFunction(validator.isEmail)) {
      validator.isEmail.mockReturnValueOnce(false);
    }

    const response = await request(app)
      .post('/client')
      .send(validPayload)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('deve bloquear email ja existente para usuario', async () => {
    if (jest.isMockFunction(Client.findOne)) {
      Client.findOne.mockResolvedValueOnce({ id: 2 });
    }

    const response = await request(app)
      .post('/client')
      .send(validPayload)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('deve bloquear telefone invalido', async () => {
    const response = await request(app)
      .post('/client')
      .send({ ...validPayload, phone: 'abc' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('deve bloquear data invalida', async () => {
    if (jest.isMockFunction(validator.isDate)) {
      validator.isDate.mockReturnValueOnce(false);
    }

    const response = await request(app)
      .post('/client')
      .send(validPayload)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

