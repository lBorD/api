import request from 'supertest';
import express from 'express';
import validateClient from '../../src/middlewares/validateClient.js';
import { isValidPhoneNumber } from '../../src/utils/phoneValidator.js';
import { existingClient } from '../../src/utils/emailValidator.js';
import validator from 'validator';

const app = express();
app.use(express.json());

// Rota de teste que usa o middleware
app.post('/test', validateClient, (req, res) => {
  res.json({ success: true, data: req.body });
});

describe('validateClient Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Configurar mocks padrão
    validator.isEmail.mockReturnValue(true);
    validator.isDate.mockReturnValue(true);
  });

  describe('Validação de campos obrigatórios', () => {
    it('deve passar quando todos os campos obrigatórios estão presentes', async () => {
      const clientData = {
        name: 'João',
        email: 'joao@example.com',
        phone: '+5511999999999',
        birthDate: '1990-01-01'
      };

      const response = await request(app)
        .post('/test')
        .send(clientData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: clientData
      });
    });

    it('deve retornar erro quando email está ausente', async () => {
      const clientData = {
        name: 'João',
        phone: '+5511999999999',
        birthDate: '1990-01-01'
      };

      const response = await request(app)
        .post('/test')
        .send(clientData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'É necessário fornecer o e-mail para finalizar o registro.'
      });
    });

    it('deve retornar erro quando nome está ausente', async () => {
      const clientData = {
        email: 'joao@example.com',
        phone: '+5511999999999',
        birthDate: '1990-01-01'
      };

      const response = await request(app)
        .post('/test')
        .send(clientData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'É necessário fornecer o nome para finalizar o registro.'
      });
    });

    it('deve retornar erro quando telefone está ausente', async () => {
      const clientData = {
        name: 'João',
        email: 'joao@example.com',
        birthDate: '1990-01-01'
      };

      const response = await request(app)
        .post('/test')
        .send(clientData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'É necessário fornecer o número de telefone para finalizar o registro.'
      });
    });

    it('deve retornar erro quando data de nascimento está ausente', async () => {
      const clientData = {
        name: 'João',
        email: 'joao@example.com',
        phone: '+5511999999999'
      };

      const response = await request(app)
        .post('/test')
        .send(clientData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'É necessário fornecer a data de nascimento para finalizar o registro.'
      });
    });
  });

  describe('Validação de email', () => {
    it('deve retornar erro quando email é inválido', async () => {
      const clientData = {
        name: 'João',
        email: 'invalid-email',
        phone: '+5511999999999',
        birthDate: '1990-01-01'
      };

      validator.isEmail.mockReturnValue(false);

      const response = await request(app)
        .post('/test')
        .send(clientData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'E-mail inválido.'
      });
      expect(validator.isEmail).toHaveBeenCalledWith('invalid-email');
    });

    it('deve passar quando email não existe', async () => {
      const clientData = {
        name: 'João',
        email: 'new@example.com',
        phone: '+5511999999999',
        birthDate: '1990-01-01'
      };

      const response = await request(app)
        .post('/test')
        .send(clientData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: clientData
      });
    });
  });

  describe('Validação de telefone', () => {
    it('deve retornar erro quando telefone é inválido', async () => {
      const clientData = {
        name: 'João',
        email: 'joao@example.com',
        phone: 'invalid-phone',
        birthDate: '1990-01-01'
      };

      // O mock já está configurado no jest.setup.js

      const response = await request(app)
        .post('/test')
        .send(clientData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Número de telefone inválido.'
      });
      // Verificação removida pois isValidPhoneNumber não é um mock
    });

    it('deve passar quando telefone é válido', async () => {
      const clientData = {
        name: 'João',
        email: 'joao@example.com',
        phone: '+5511999999999',
        birthDate: '1990-01-01'
      };

      // O mock já está configurado no jest.setup.js

      const response = await request(app)
        .post('/test')
        .send(clientData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: clientData
      });
    });
  });

  describe('Validação de data de nascimento', () => {
    it('deve retornar erro quando data de nascimento é inválida', async () => {
      const clientData = {
        name: 'João',
        email: 'joao@example.com',
        phone: '+5511999999999',
        birthDate: 'invalid-date'
      };

      validator.isDate.mockReturnValue(false);

      const response = await request(app)
        .post('/test')
        .send(clientData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Data de nascimento inválida. Use o formato YYYY-MM-DD.'
      });
      expect(validator.isDate).toHaveBeenCalledWith('invalid-date', { format: 'YYYY-MM-DD', strictMode: true });
    });

    it('deve retornar erro quando data de nascimento é no futuro', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];

      const clientData = {
        name: 'João',
        email: 'joao@example.com',
        phone: '+5511999999999',
        birthDate: futureDateString
      };

      const response = await request(app)
        .post('/test')
        .send(clientData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Data de nascimento não pode ser no futuro.'
      });
    });

    it('deve passar quando data de nascimento é válida', async () => {
      const clientData = {
        name: 'João',
        email: 'joao@example.com',
        phone: '+5511999999999',
        birthDate: '1990-01-01'
      };

      validator.isDate.mockReturnValue(true);

      const response = await request(app)
        .post('/test')
        .send(clientData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: clientData
      });
    });
  });

  describe('Validação completa', () => {
    it('deve validar todos os campos corretamente', async () => {
      const clientData = {
        name: 'João Silva',
        email: 'joao.silva@example.com',
        phone: '+5511999999999',
        birthDate: '1990-01-01',
        address: 'Rua Teste, 123'
      };

      const response = await request(app)
        .post('/test')
        .send(clientData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: clientData
      });

      // Verificar se todas as validações foram chamadas
      expect(validator.isEmail).toHaveBeenCalledWith('joao.silva@example.com');
      expect(validator.isDate).toHaveBeenCalledWith('1990-01-01', { format: 'YYYY-MM-DD', strictMode: true });
    });
  });
}); 