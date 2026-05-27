import request from 'supertest';
import express from 'express';
import AppointmentController from '../../src/controllers/appointment.js';
import Appointment from '../../src/models/Appointment.js';
import AppointmentService from '../../src/models/AppointmentService.js';
import Client from '../../src/models/Client.js';
import Service from '../../src/models/Service.js';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 1 };
  next();
});

app.post('/appointments', AppointmentController.createAppointment);

const service = {
  id: 2,
  name: 'Maquiagem',
  price: 200,
  estimatedTime: 60,
};

const buildLoadedAppointment = (depositAmount) => ({
  id: 10,
  startAt: new Date('2026-06-01T14:00:00.000Z'),
  endAt: new Date('2026-06-01T15:00:00.000Z'),
  clientId: 1,
  serviceId: service.id,
  price: service.price,
  depositAmount,
  status: 'scheduled',
  notes: '',
  googleSyncStatus: 'pending',
  client: { id: 1, name: 'Ana', lastName: 'Silva' },
  services: [{
    id: 1,
    serviceId: service.id,
    serviceName: service.name,
    price: service.price,
    estimatedTime: service.estimatedTime,
    sortOrder: 0,
  }],
});

const configureFindOneMocks = (loadedAppointment) => {
  // The Sequelize test double can return the same model object for all models.
  if (Client.findOne === Appointment.findOne) {
    Appointment.findOne.mockImplementation((options = {}) => {
      if (options.include) {
        return Promise.resolve(loadedAppointment);
      }

      if (options.where?.startAt && options.where?.endAt) {
        return Promise.resolve(null);
      }

      return Promise.resolve({ id: 1, userId: 1 });
    });
    return;
  }

  Client.findOne.mockImplementation(() => Promise.resolve({ id: 1, userId: 1 }));
  Appointment.findOne.mockImplementation((options = {}) => {
    if (options.include) {
      return Promise.resolve(loadedAppointment);
    }

    return Promise.resolve(null);
  });
};

describe('AppointmentController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Service.findAll.mockImplementation(() => Promise.resolve([service]));
    AppointmentService.bulkCreate.mockImplementation(() => Promise.resolve([]));
  });

  it('usa 30% do valor total como sinal padrão ao criar agendamento', async () => {
    configureFindOneMocks(buildLoadedAppointment(60));
    Appointment.create.mockResolvedValue({ id: 10 });

    const response = await request(app)
      .post('/appointments')
      .send({
        clientId: 1,
        serviceIds: [service.id],
        startAt: '2026-06-01T14:00:00.000Z',
      })
      .expect(201);

    expect(Appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 200,
        depositAmount: 60,
      }),
      expect.any(Object),
    );
    expect(response.body.depositAmount).toBe(60);
  });

  it('respeita sinal informado explicitamente ao criar agendamento', async () => {
    configureFindOneMocks(buildLoadedAppointment(0));
    Appointment.create.mockResolvedValue({ id: 10 });

    const response = await request(app)
      .post('/appointments')
      .send({
        clientId: 1,
        serviceIds: [service.id],
        startAt: '2026-06-01T14:00:00.000Z',
        depositAmount: 0,
      })
      .expect(201);

    expect(Appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 200,
        depositAmount: 0,
      }),
      expect.any(Object),
    );
    expect(response.body.depositAmount).toBe(0);
  });
});
