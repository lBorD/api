import request from 'supertest';
import express from 'express';
import ClientController from '../../src/controllers/client.js';
import Client from '../../src/models/Client.js';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 1 };
  next();
});

app.post('/register', ClientController.registerClient);
app.get('/search', ClientController.listClients);
app.get('/search/sync', ClientController.listClientsSync);
app.get('/search/by-name', ClientController.listClientsByName);
app.get('/search/by-lastname', ClientController.listClientsByLastName);
app.get('/search/by-phone', ClientController.listClientsByPhone);
app.get('/:id', ClientController.getClientById);
app.patch('/:id', ClientController.updateClient);
app.delete('/:id', ClientController.deleteClient);

describe('ClientController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve registrar cliente com userId', async () => {
    const clientData = {
      name: 'João',
      lastName: 'Silva',
      phone: '+5511999999999',
      email: 'joao@example.com',
      birthDate: '1990-01-01',
      address: 'Rua Teste',
    };

    Client.create.mockResolvedValue({ id: 1, ...clientData, userId: 1 });

    const response = await request(app)
      .post('/register')
      .send(clientData)
      .expect(201);

    expect(Client.create).toHaveBeenCalledWith({ ...clientData, userId: 1 });
    expect(response.body).toEqual({ success: true });
  });

  it('deve buscar cliente por id com filtro de usuário', async () => {
    Client.findOne.mockResolvedValue({ id: 1, name: 'João' });

    const response = await request(app)
      .get('/1')
      .expect(200);

    expect(Client.findOne).toHaveBeenCalledWith({ where: { id: '1', userId: 1 } });
    expect(response.body).toHaveProperty('id', 1);
  });

  it('deve atualizar cliente do usuário', async () => {
    Client.update.mockResolvedValue([1]);
    Client.findOne.mockResolvedValue({ id: 1, name: 'Atualizado' });

    const response = await request(app)
      .patch('/1')
      .send({
        name: 'Atualizado',
        lastName: 'Silva',
        phone: '+5511999999999',
        email: 'joao@example.com',
        birthDate: '1990-01-01',
        address: 'Rua 2',
      })
      .expect(200);

    expect(response.body).toHaveProperty('id', 1);
    expect(Client.update).toHaveBeenCalled();
  });

  it('deve deletar cliente do usuário', async () => {
    const mockClient = { id: 1, destroy: jest.fn().mockResolvedValue() };
    Client.findOne.mockResolvedValue(mockClient);

    const response = await request(app)
      .delete('/1')
      .expect(200);

    expect(mockClient.destroy).toHaveBeenCalled();
    expect(response.body).toHaveProperty('message');
  });

  it('deve listar clientes com paginação', async () => {
    Client.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const response = await request(app)
      .get('/search?page=1&limit=10')
      .expect(200);

    expect(response.body).toEqual({
      total: 0,
      page: 1,
      pages: 0,
      clients: [],
    });

    expect(Client.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 1 },
    }));
  });

  it('deve rejeitar lastSync inválido', async () => {
    const response = await request(app)
      .get('/search/sync?lastSync=not-a-date')
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

