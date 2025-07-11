import request from 'supertest';
import express from 'express';
import ClientController from '../../src/controllers/client.js';
import Client from '../../src/models/Client.js';

// Mock do Op do Sequelize
const Op = {
  like: Symbol.for('like'),
  gt: Symbol.for('gt')
};

const app = express();
app.use(express.json());

// Rotas para teste
app.post('/register', ClientController.registerClient);
app.get('/search', ClientController.listClients);
app.get('/search/sync', ClientController.listClientsSync);
app.get('/search/by-name', ClientController.listClientsByName);
app.get('/search/by-lastname', ClientController.listClientsByLastName);
app.get('/search/by-phone', ClientController.listClientsByPhone);
app.get('/:id', ClientController.getClientById);
app.put('/:id', ClientController.updateClient);
app.delete('/:id', ClientController.deleteClient);

describe('ClientController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerClient', () => {
    it('deve registrar um cliente com sucesso', async () => {
      const clientData = {
        name: 'João',
        lastName: 'Silva',
        phone: '+5511999999999',
        email: 'joao@example.com',
        birthDate: '1990-01-01',
        address: 'Rua Teste, 123'
      };

      Client.create.mockResolvedValue({ id: 1, ...clientData });

      const response = await request(app)
        .post('/register')
        .send(clientData)
        .expect(201);

      expect(Client.create).toHaveBeenCalledWith(clientData);
      expect(response.body).toEqual({ success: true });
    });

    it('deve retornar erro 500 quando falhar ao registrar cliente', async () => {
      const clientData = {
        name: 'João',
        lastName: 'Silva',
        phone: '+5511999999999',
        email: 'joao@example.com',
        birthDate: '1990-01-01',
        address: 'Rua Teste, 123'
      };

      const error = new Error('Erro de banco de dados');
      Client.create.mockRejectedValue(error);

      const response = await request(app)
        .post('/register')
        .send(clientData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Erro ao registrar cliente.'
      });
    });
  });

  describe('getClientById', () => {
    it('deve retornar cliente por ID com sucesso', async () => {
      const mockClient = {
        id: 1,
        name: 'João',
        lastName: 'Silva',
        phone: '+5511999999999',
        email: 'joao@example.com',
        birthDate: '1990-01-01',
        address: 'Rua Teste, 123'
      };

      Client.findByPk.mockResolvedValue(mockClient);

      const response = await request(app)
        .get('/1')
        .expect(200);

      expect(Client.findByPk).toHaveBeenCalledWith('1');
      expect(response.body).toEqual(mockClient);
    });

    it('deve retornar erro 400 para ID inválido', async () => {
      const response = await request(app)
        .get('/invalid')
        .expect(400);

      expect(response.body).toEqual({
        error: 'ID inválido. O ID deve ser um número positivo.'
      });
    });

    it('deve retornar erro 404 quando cliente não for encontrado', async () => {
      Client.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .get('/999')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Não foi possível encontrar o cliente com o ID: 999'
      });
    });
  });

  describe('updateClient', () => {
    it('deve atualizar cliente com sucesso', async () => {
      const updateData = {
        name: 'João Atualizado',
        lastName: 'Silva',
        phone: '+5511999999999',
        email: 'joao@example.com',
        birthDate: '1990-01-01',
        address: 'Rua Nova, 456'
      };

      const updatedClient = {
        id: 1,
        ...updateData
      };

      Client.update.mockResolvedValue([1]);
      Client.findByPk.mockResolvedValue(updatedClient);

      const response = await request(app)
        .put('/1')
        .send(updateData)
        .expect(200);

      expect(Client.update).toHaveBeenCalledWith(updateData, { where: { id: '1' } });
      expect(Client.findByPk).toHaveBeenCalledWith('1');
      expect(response.body).toEqual(updatedClient);
    });

    it('deve retornar erro 404 quando cliente não for encontrado para atualização', async () => {
      const updateData = {
        name: 'João Atualizado',
        lastName: 'Silva',
        phone: '+5511999999999',
        email: 'joao@example.com',
        birthDate: '1990-01-01',
        address: 'Rua Nova, 456'
      };

      Client.update.mockResolvedValue([0]);

      const response = await request(app)
        .put('/999')
        .send(updateData)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Cliente não encontrado.'
      });
    });
  });

  describe('deleteClient', () => {
    it('deve deletar cliente com sucesso', async () => {
      const mockClient = {
        id: 1,
        name: 'João',
        destroy: jest.fn().mockResolvedValue()
      };

      Client.findByPk.mockResolvedValue(mockClient);

      const response = await request(app)
        .delete('/1')
        .expect(200);

      expect(Client.findByPk).toHaveBeenCalledWith('1');
      expect(mockClient.destroy).toHaveBeenCalled();
      expect(response.body).toEqual({
        message: 'Cliente excluído com sucesso.'
      });
    });

    it('deve retornar erro 400 para ID inválido', async () => {
      const response = await request(app)
        .delete('/invalid')
        .expect(400);

      expect(response.body).toEqual({
        error: 'ID inválido. O ID deve ser um número positivo.'
      });
    });

    it('deve retornar erro 404 quando cliente não for encontrado para exclusão', async () => {
      Client.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .delete('/999')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Cliente não encontrado.'
      });
    });
  });

  describe('listClients', () => {
    it('deve listar clientes com paginação', async () => {
      const mockClients = [
        { id: 1, name: 'João', lastName: 'Silva' },
        { id: 2, name: 'Maria', lastName: 'Santos' }
      ];

      Client.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockClients
      });

      const response = await request(app)
        .get('/search?page=1&limit=10')
        .expect(200);

      expect(Client.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        limit: 10,
        offset: 0,
        order: [['updatedAt', 'DESC']]
      });
      expect(response.body).toEqual({
        total: 2,
        page: 1,
        pages: 1,
        clients: mockClients
      });
    });

    it('deve listar clientes com busca por nome', async () => {
      const mockClients = [
        { id: 1, name: 'João', lastName: 'Silva' }
      ];

      Client.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: mockClients
      });

      const response = await request(app)
        .get('/search?search=João')
        .expect(200);

      expect(Client.findAndCountAll).toHaveBeenCalledWith({
        where: { name: { [Symbol.for('like')]: '%João%' } },
        limit: 10,
        offset: 0,
        order: [['updatedAt', 'DESC']]
      });
    });

    it('deve retornar erro 400 para parâmetros inválidos', async () => {
      const response = await request(app)
        .get('/search?page=invalid&limit=invalid')
        .expect(400);

      expect(response.body).toEqual({
        error: 'O parâmetro \'page\' deve ser um número positivo.'
      });
    });
  });

  describe('listClientsSync', () => {
    it('deve listar clientes sincronizados com sucesso', async () => {
      const mockClients = [
        { id: 1, name: 'João', updatedAt: '2024-01-01T00:00:00Z' }
      ];

      Client.findAll.mockResolvedValue(mockClients);

      const response = await request(app)
        .get('/search/sync?lastSync=2023-12-31 00:00:00')
        .expect(200);

      expect(Client.findAll).toHaveBeenCalledWith({
        where: { updatedAt: { [Symbol.for('gt')]: '2023-12-31 00:00:00' } },
        order: [['updatedAt', 'DESC']],
        limit: 1000
      });
      expect(response.body).toEqual(mockClients);
    });

    it('deve usar data padrão quando lastSync não for fornecido', async () => {
      const mockClients = [];

      Client.findAll.mockResolvedValue(mockClients);

      const response = await request(app)
        .get('/search/sync')
        .expect(200);

      expect(Client.findAll).toHaveBeenCalledWith({
        where: { updatedAt: { [Symbol.for('gt')]: '2000-01-01 00:00:00' } },
        order: [['updatedAt', 'DESC']],
        limit: 1000
      });
    });
  });

  describe('listClientsByName', () => {
    it('deve listar clientes por nome com sucesso', async () => {
      const mockClients = [
        { id: 1, name: 'João', lastName: 'Silva' }
      ];

      Client.findAll.mockResolvedValue(mockClients);

      const response = await request(app)
        .get('/search/by-name?name=João')
        .expect(200);

      expect(Client.findAll).toHaveBeenCalledWith({
        where: { name: { [Symbol.for('like')]: '%João%' } }
      });
      expect(response.body).toEqual(mockClients);
    });

    it('deve retornar erro 400 quando nome não for fornecido', async () => {
      const response = await request(app)
        .get('/search/by-name')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Nome não fornecido.'
      });
    });

    it('deve retornar erro 404 quando nenhum cliente for encontrado', async () => {
      Client.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/search/by-name?name=Inexistente')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Nenhum cliente encontrado com esse nome.'
      });
    });
  });

  describe('listClientsByLastName', () => {
    it('deve listar clientes por sobrenome com sucesso', async () => {
      const mockClients = [
        { id: 1, name: 'João', lastName: 'Silva' }
      ];

      Client.findAll.mockResolvedValue(mockClients);

      const response = await request(app)
        .get('/search/by-lastname?lastName=Silva')
        .expect(200);

      expect(Client.findAll).toHaveBeenCalledWith({
        where: { lastName: { [Symbol.for('like')]: '%Silva%' } }
      });
      expect(response.body).toEqual(mockClients);
    });

    it('deve retornar erro 400 quando sobrenome não for fornecido', async () => {
      const response = await request(app)
        .get('/search/by-lastname')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Sobrenome não fornecido.'
      });
    });
  });

  describe('listClientsByPhone', () => {
    it('deve listar clientes por telefone com sucesso', async () => {
      const mockClients = [
        { id: 1, name: 'João', phone: '+5511999999999' }
      ];

      Client.findAll.mockResolvedValue(mockClients);

      const response = await request(app)
        .get('/search/by-phone?phone=+5511999999999')
        .expect(200);

      expect(Client.findAll).toHaveBeenCalledWith({
        where: { phone: '+5511999999999' }
      });
      expect(response.body).toEqual(mockClients);
    });

    it('deve retornar erro 400 quando telefone não for fornecido', async () => {
      const response = await request(app)
        .get('/search/by-phone')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Telefone não fornecido.'
      });
    });
  });
}); 