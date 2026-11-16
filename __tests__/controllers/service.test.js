import request from 'supertest';
import express from 'express';
import ServiceController from '../../src/controllers/service.js';
import Service from '../../src/models/Service.js';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 1 };
  next();
});

app.get('/search/by-id/:id', ServiceController.getServiceById);
app.patch('/update/:id', ServiceController.updateService);
app.delete('/delete/:id', ServiceController.deleteService);

describe('ServiceController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteService', () => {
    it('deve excluir de forma logica, sem apagar a linha', async () => {
      const service = { id: 1, update: jest.fn().mockResolvedValue(), destroy: jest.fn() };
      Service.findOne.mockResolvedValue(service);

      const response = await request(app)
        .delete('/delete/1')
        .expect(200);

      expect(Service.findOne).toHaveBeenCalledWith({ where: { id: '1', userId: 1, active: true } });
      expect(service.update).toHaveBeenCalledWith({ active: false });
      expect(service.destroy).not.toHaveBeenCalled();
      expect(response.body).toEqual({ success: true });
    });

    it('deve retornar 404 para servico ja excluido ou de outro usuario', async () => {
      Service.findOne.mockResolvedValue(null);

      await request(app)
        .delete('/delete/1')
        .expect(404);
    });

    it('deve retornar 400 para id invalido', async () => {
      await request(app)
        .delete('/delete/abc')
        .expect(400);

      expect(Service.findOne).not.toHaveBeenCalled();
    });

    it('deve retornar 500 quando a atualizacao falhar', async () => {
      const service = { id: 1, update: jest.fn().mockRejectedValue(new Error('db')) };
      Service.findOne.mockResolvedValue(service);
      jest.spyOn(console, 'error').mockImplementation(() => {});

      await request(app)
        .delete('/delete/1')
        .expect(500);
    });
  });

  it('nao deve abrir servico excluido por id', async () => {
    Service.findOne.mockResolvedValue(null);

    await request(app)
      .get('/search/by-id/1')
      .expect(404);

    expect(Service.findOne).toHaveBeenCalledWith({ where: { id: '1', userId: 1, active: true } });
  });

  it('nao deve editar servico excluido', async () => {
    Service.update.mockResolvedValue([0]);

    await request(app)
      .patch('/update/1')
      .send({ name: 'Lashes', price: 120, estimatedTime: 70, cost: 20 })
      .expect(404);

    expect(Service.update).toHaveBeenCalledWith(
      expect.any(Object),
      { where: { id: '1', userId: 1, active: true } },
    );
  });
});
