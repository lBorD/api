import request from 'supertest';
import express from 'express';
import ServiceController from '../../src/controllers/service.js';
import Service from '../../src/models/Service.js';

const Op = {
  like: Symbol.for('like')
};

const app = express();
app.use(express.json());

// Rotas para teste seguindo padrão do projeto
app.post('/register', ServiceController.createService);
app.get('/search', ServiceController.listServices);
app.get('/search/active', ServiceController.listActiveServices);
app.get('/search/by-id/:id', ServiceController.getServiceById);
app.patch('/update/:id', ServiceController.updateService);
app.delete('/delete/:id', ServiceController.deleteService);

describe('ServiceController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createService', () => {
    it('deve criar um serviço com sucesso', async () => {
      const serviceData = {
        name: 'Maquiagem Completa',
        price: '150.00',
        estimatedTime: '90',
        cost: '30.00'
      };

      const mockService = {
        id: 1,
        name: 'Maquiagem Completa',
        price: 150.00,
        estimatedTime: 90,
        cost: 30.00
      };

      Service.create.mockResolvedValue(mockService);

      const response = await request(app)
        .post('/register')
        .send(serviceData)
        .expect(201);

      expect(Service.create).toHaveBeenCalledWith({
        name: 'Maquiagem Completa',
        price: 150.00,
        estimatedTime: 90,
        cost: 30.00
      });
      expect(response.body).toEqual({
        success: true,
        service: mockService
      });
    });

    it('deve retornar erro 400 quando campos obrigatórios não forem fornecidos', async () => {
      const serviceData = {
        name: 'Maquiagem Completa'
      };

      const response = await request(app)
        .post('/register')
        .send(serviceData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Campos obrigatórios: nome, preço e tempo estimado.'
      });
    });

    it('deve retornar erro 500 quando falhar ao criar serviço', async () => {
      const serviceData = {
        name: 'Maquiagem Completa',
        price: '150.00',
        estimatedTime: '90'
      };

      const error = new Error('Erro de banco de dados');
      Service.create.mockRejectedValue(error);

      const response = await request(app)
        .post('/register')
        .send(serviceData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Erro ao criar serviço.'
      });
    });
  });

  describe('listServices', () => {
    it('deve listar serviços com paginação', async () => {
      const mockServices = [
        { id: 1, name: 'Maquiagem Completa', price: 150.00, estimatedTime: 90 },
        { id: 2, name: 'Maquiagem Simples', price: 80.00, estimatedTime: 60 }
      ];

      Service.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockServices
      });

      const response = await request(app)
        .get('/search?page=1&limit=10')
        .expect(200);

      expect(Service.findAndCountAll).toHaveBeenCalledWith({
        where: { isActive: true },
        limit: 10,
        offset: 0,
        order: [['updatedAt', 'DESC']]
      });
      expect(response.body).toEqual({
        total: 2,
        page: 1,
        pages: 1,
        services: mockServices
      });
    });

    it('deve listar serviços com busca por nome', async () => {
      const mockServices = [
        { id: 1, name: 'Maquiagem Completa', price: 150.00, estimatedTime: 90 }
      ];

      Service.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: mockServices
      });

      const response = await request(app)
        .get('/search?search=Maquiagem')
        .expect(200);

      expect(Service.findAndCountAll).toHaveBeenCalledWith({
        where: { 
          isActive: true,
          name: { [Symbol.for('like')]: '%Maquiagem%' }
        },
        limit: 10,
        offset: 0,
        order: [['updatedAt', 'DESC']]
      });
    });

    it('deve retornar erro 400 para parâmetros inválidos', async () => {
      const response = await request(app)
        .get('/search?page=invalid')
        .expect(400);

      expect(response.body).toEqual({
        error: 'O parâmetro \'page\' deve ser um número positivo.'
      });
    });

    it('deve retornar erro 500 quando falhar ao listar serviços', async () => {
      Service.findAndCountAll.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/search')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Erro ao listar serviços.'
      });
    });
  });

  describe('getServiceById', () => {
    it('deve retornar serviço por ID com sucesso', async () => {
      const mockService = {
        id: 1,
        name: 'Maquiagem Completa',
        price: 150.00,
        estimatedTime: 90,
        cost: 30.00
      };

      Service.findByPk.mockResolvedValue(mockService);

      const response = await request(app)
        .get('/search/by-id/1')
        .expect(200);

      expect(Service.findByPk).toHaveBeenCalledWith('1');
      expect(response.body).toEqual(mockService);
    });

    it('deve retornar erro 400 para ID inválido', async () => {
      const response = await request(app)
        .get('/search/by-id/invalid')
        .expect(400);

      expect(response.body).toEqual({
        error: 'ID inválido. O ID deve ser um número positivo.'
      });
    });

    it('deve retornar erro 404 quando serviço não for encontrado', async () => {
      Service.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .get('/search/by-id/999')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Serviço não encontrado com o ID: 999'
      });
    });

    it('deve retornar erro 500 quando falhar ao buscar serviço', async () => {
      Service.findByPk.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/search/by-id/1')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Erro ao buscar serviço.'
      });
    });
  });

  describe('updateService', () => {
    it('deve atualizar serviço com sucesso', async () => {
      const updateData = {
        name: 'Maquiagem Completa Atualizada',
        price: '180.00',
        estimatedTime: '100',
        cost: '35.00'
      };

      const updatedService = {
        id: 1,
        name: 'Maquiagem Completa Atualizada',
        price: 180.00,
        estimatedTime: 100,
        cost: 35.00
      };

      Service.update.mockResolvedValue([1]);
      Service.findByPk.mockResolvedValue(updatedService);

      const response = await request(app)
        .patch('/update/1')
        .send(updateData)
        .expect(200);

      expect(Service.update).toHaveBeenCalledWith({
        name: 'Maquiagem Completa Atualizada',
        price: 180.00,
        estimatedTime: 100,
        cost: 35.00
      }, { where: { id: '1' } });
      expect(response.body).toEqual(updatedService);
    });

    it('deve retornar erro 404 quando serviço não for encontrado', async () => {
      Service.update.mockResolvedValue([0]);

      const response = await request(app)
        .patch('/update/999')
        .send({ name: 'Teste' })
        .expect(404);

      expect(response.body).toEqual({
        error: 'Serviço não encontrado.'
      });
    });

    it('deve retornar erro 500 quando falhar ao atualizar serviço', async () => {
      Service.update.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .patch('/update/1')
        .send({ name: 'Teste' })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Erro ao atualizar serviço.'
      });
    });
  });

  describe('deleteService', () => {
    it('deve desativar serviço com sucesso', async () => {
      const mockService = {
        id: 1,
        name: 'Maquiagem Completa',
        update: jest.fn().mockResolvedValue()
      };

      Service.findByPk.mockResolvedValue(mockService);

      const response = await request(app)
        .delete('/delete/1')
        .expect(200);

      expect(Service.findByPk).toHaveBeenCalledWith('1');
      expect(mockService.update).toHaveBeenCalledWith({ isActive: false });
      expect(response.body).toEqual({
        message: 'Serviço desativado com sucesso.'
      });
    });

    it('deve retornar erro 404 quando serviço não for encontrado', async () => {
      Service.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .delete('/delete/999')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Serviço não encontrado.'
      });
    });

    it('deve retornar erro 500 quando falhar ao desativar serviço', async () => {
      Service.findByPk.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/delete/1')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Erro ao desativar serviço.'
      });
    });
  });

  describe('listActiveServices', () => {
    it('deve listar apenas serviços ativos', async () => {
      const mockServices = [
        { id: 1, name: 'Maquiagem Completa', isActive: true },
        { id: 2, name: 'Maquiagem Simples', isActive: true }
      ];

      Service.findAll.mockResolvedValue(mockServices);

      const response = await request(app)
        .get('/search/active')
        .expect(200);

      expect(Service.findAll).toHaveBeenCalledWith({
        where: { isActive: true },
        order: [['name', 'ASC']]
      });
      expect(response.body).toEqual(mockServices);
    });

    it('deve retornar erro 500 quando falhar ao listar serviços ativos', async () => {
      Service.findAll.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/search/active')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Erro ao listar serviços ativos.'
      });
    });
  });
});