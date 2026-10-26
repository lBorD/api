import request from 'supertest';
import express from 'express';
import AppointmentController from '../../src/controllers/appointment.js';
import Appointment from '../../src/models/Appointment.js';
import AppointmentService from '../../src/models/AppointmentService.js';
import CalendarConnection from '../../src/models/CalendarConnection.js';
import Client from '../../src/models/Client.js';
import Service from '../../src/models/Service.js';
import { encryptToken } from '../../src/services/googleTokenCrypto.js';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 1 };
  next();
});

app.get('/appointments', AppointmentController.listAppointments);
app.post('/appointments', AppointmentController.createAppointment);
app.patch('/appointments/:id', AppointmentController.updateAppointment);
app.patch('/appointments/:id/status', AppointmentController.updateAppointmentStatus);
app.patch('/appointments/:id/archive', AppointmentController.archiveAppointment);

const service = {
  id: 2,
  name: 'Maquiagem',
  price: 200,
  estimatedTime: 60,
};

const buildLoadedAppointment = (depositAmount, googleSyncStatus = 'disabled') => ({
  id: 10,
  startAt: new Date('2026-06-01T14:00:00.000Z'),
  endAt: new Date('2026-06-01T15:00:00.000Z'),
  clientId: 1,
  serviceId: service.id,
  price: service.price,
  depositAmount,
  status: 'scheduled',
  archivedAt: null,
  notes: '',
  googleSyncStatus,
  googleEventId: null,
  googleCalendarId: null,
  lastSyncedAt: null,
  syncError: null,
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

// O agendamento guardado com o preco da epoca, que e o que a edicao deve preservar.
const snapshotOfService = {
  serviceId: service.id,
  serviceName: service.name,
  price: 200,
  estimatedTime: 60,
  sortOrder: 0,
};

// O mesmo servico depois do reajuste anual.
const readjustedService = { ...service, price: 260, estimatedTime: 90 };

// O mesmo dublê de model pode atender Service e AppointmentService, entao o
// findAll tem de ser discriminado pela forma da query, nao pelo model: so a
// busca de snapshot filtra por appointmentId.
const configureFindAllMocks = ({ snapshotRows, catalogServices }) => {
  const findAll = (options = {}) => (
    options.where?.appointmentId !== undefined
      ? Promise.resolve(snapshotRows)
      : Promise.resolve(catalogServices)
  );

  Service.findAll.mockImplementation(findAll);
  AppointmentService.findAll.mockImplementation(findAll);
};

const configureUpdateMocks = ({ snapshotRows, catalogServices }) => {
  const loadedAppointment = buildLoadedAppointment(0);
  const appointment = {
    ...loadedAppointment,
    update: jest.fn().mockResolvedValue({}),
  };

  Client.findOne.mockResolvedValue({ id: 1, userId: 1 });
  Appointment.findOne.mockImplementation((options = {}) => {
    if (options.include) {
      return Promise.resolve(loadedAppointment);
    }

    if (options.where?.startAt && options.where?.endAt) {
      return Promise.resolve(null);
    }

    return Promise.resolve(appointment);
  });
  AppointmentService.destroy.mockResolvedValue(1);
  configureFindAllMocks({ snapshotRows, catalogServices });

  return appointment;
};

describe('AppointmentController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureFindAllMocks({ snapshotRows: [], catalogServices: [service] });
    AppointmentService.bulkCreate.mockImplementation(() => Promise.resolve([]));
    CalendarConnection.findOne.mockResolvedValue(null);
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'google-client-id';
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = '12345678901234567890123456789012';
    global.fetch = jest.fn();
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

  it('bloqueia conflito de horario sem confirmacao explicita', async () => {
    Client.findOne.mockResolvedValue({ id: 1, userId: 1 });
    Appointment.findOne.mockResolvedValue({ id: 99, userId: 1 });

    await request(app)
      .post('/appointments')
      .send({
        clientId: 1,
        serviceIds: [service.id],
        startAt: '2026-06-01T14:00:00.000Z',
      })
      .expect(409);

    expect(Appointment.create).not.toHaveBeenCalled();
  });

  it('permite criar agendamento em conflito quando confirmado', async () => {
    const loadedAppointment = buildLoadedAppointment(0);
    Client.findOne.mockResolvedValue({ id: 1, userId: 1 });
    Appointment.findOne.mockImplementation((options = {}) => (
      Promise.resolve(options.include ? loadedAppointment : { id: 99, userId: 1 })
    ));
    Appointment.create.mockResolvedValue({ id: 10 });

    await request(app)
      .post('/appointments')
      .send({
        clientId: 1,
        serviceIds: [service.id],
        startAt: '2026-06-01T14:00:00.000Z',
        depositAmount: 0,
        allowConflict: true,
      })
      .expect(201);

    expect(Appointment.create).toHaveBeenCalled();
  });

  it('bloqueia conflito ao editar sem confirmacao explicita', async () => {
    const appointment = {
      ...buildLoadedAppointment(0),
      update: jest.fn(),
    };
    Client.findOne.mockResolvedValue({ id: 1, userId: 1 });
    Appointment.findOne.mockImplementation((options = {}) => {
      if (options.where?.startAt && options.where?.endAt) {
        return Promise.resolve({ id: 99, userId: 1 });
      }

      return Promise.resolve(appointment);
    });

    await request(app)
      .patch('/appointments/10')
      .send({
        clientId: 1,
        serviceIds: [service.id],
        startAt: '2026-06-01T14:30:00.000Z',
      })
      .expect(409);

    expect(appointment.update).not.toHaveBeenCalled();
  });

  it('permite editar agendamento em conflito quando confirmado', async () => {
    const loadedAppointment = buildLoadedAppointment(0);
    const appointment = {
      ...loadedAppointment,
      update: jest.fn().mockResolvedValue({}),
    };
    Client.findOne.mockResolvedValue({ id: 1, userId: 1 });
    Appointment.findOne.mockImplementation((options = {}) => {
      if (options.include) {
        return Promise.resolve(loadedAppointment);
      }

      if (options.where?.startAt && options.where?.endAt) {
        return Promise.resolve({ id: 99, userId: 1 });
      }

      return Promise.resolve(appointment);
    });
    AppointmentService.destroy.mockResolvedValue(1);

    await request(app)
      .patch('/appointments/10')
      .send({
        clientId: 1,
        serviceIds: [service.id],
        startAt: '2026-06-01T14:30:00.000Z',
        allowConflict: true,
      })
      .expect(200);

    expect(appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        startAt: new Date('2026-06-01T14:30:00.000Z'),
      }),
      expect.any(Object),
    );
  });

  it('preserva preco e duracao congelados ao editar agendamento depois do reajuste', async () => {
    const appointment = configureUpdateMocks({
      snapshotRows: [snapshotOfService],
      catalogServices: [readjustedService],
    });

    await request(app)
      .patch('/appointments/10')
      .send({
        clientId: 1,
        serviceIds: [service.id],
        startAt: '2026-11-03T14:00:00.000Z',
      })
      .expect(200);

    expect(appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 200,
        endAt: new Date('2026-11-03T15:00:00.000Z'),
      }),
      expect.any(Object),
    );
    expect(AppointmentService.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ price: 200, estimatedTime: 60 })],
      expect.any(Object),
    );
    // O catalogo nao chega a ser consultado: o snapshot cobre todos os ids
    // enviados. Como o dublê e compartilhado entre os models, a checagem olha a
    // forma da query - so a busca de catalogo filtra por id.
    const catalogQueries = Service.findAll.mock.calls
      .filter(([options = {}]) => options.where?.id !== undefined);
    expect(catalogQueries).toHaveLength(0);
  });

  it('adota preco e duracao de hoje quando a usuaria pede o reajuste', async () => {
    const appointment = configureUpdateMocks({
      snapshotRows: [snapshotOfService],
      catalogServices: [readjustedService],
    });

    await request(app)
      .patch('/appointments/10')
      .send({
        clientId: 1,
        serviceIds: [service.id],
        startAt: '2026-11-03T14:00:00.000Z',
        refreshPrices: true,
      })
      .expect(200);

    expect(appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 260,
        endAt: new Date('2026-11-03T15:30:00.000Z'),
      }),
      expect.any(Object),
    );
    expect(AppointmentService.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ price: 260, estimatedTime: 90 })],
      expect.any(Object),
    );
  });

  it('cai no snapshot quando o servico do agendamento saiu do catalogo', async () => {
    const appointment = configureUpdateMocks({
      snapshotRows: [snapshotOfService],
      catalogServices: [],
    });

    await request(app)
      .patch('/appointments/10')
      .send({
        clientId: 1,
        serviceIds: [service.id],
        startAt: '2026-11-03T14:00:00.000Z',
        refreshPrices: true,
      })
      .expect(200);

    expect(appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ price: 200 }),
      expect.any(Object),
    );
  });

  it('recusa servico novo que nao esta ativo no catalogo', async () => {
    const appointment = configureUpdateMocks({
      snapshotRows: [snapshotOfService],
      catalogServices: [],
    });

    await request(app)
      .patch('/appointments/10')
      .send({
        clientId: 1,
        serviceIds: [service.id, 99],
        startAt: '2026-11-03T14:00:00.000Z',
      })
      .expect(404);

    expect(appointment.update).not.toHaveBeenCalled();
  });

  it('mantem criacao local quando Google Calendar falha depois do salvamento', async () => {
    const connection = {
      userId: 1,
      provider: 'google',
      enabled: true,
      calendarId: 'primary',
      accessTokenEncrypted: encryptToken('access-token'),
      refreshTokenEncrypted: encryptToken('refresh-token'),
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
      update: jest.fn().mockResolvedValue({}),
    };
    CalendarConnection.findOne.mockResolvedValue(connection);
    configureFindOneMocks(buildLoadedAppointment(60, 'pending'));
    Appointment.create.mockResolvedValue({ id: 10 });
    global.fetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ error: { message: 'Google indisponivel' } }),
    });

    const response = await request(app)
      .post('/appointments')
      .send({
        clientId: 1,
        serviceIds: [service.id],
        startAt: '2026-06-01T14:00:00.000Z',
      })
      .expect(201);

    expect(response.body.googleSyncStatus).toBe('pending');

    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(Appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        googleSyncStatus: 'failed',
        syncError: expect.any(String),
      }),
      expect.objectContaining({ where: { id: 10 } }),
    );
  });

  it('oculta agendamentos arquivados das listagens normais', async () => {
    Appointment.findAll.mockResolvedValue([]);

    await request(app)
      .get('/appointments?from=2026-06-01T00:00:00.000Z&to=2026-06-02T00:00:00.000Z')
      .expect(200);

    expect(Appointment.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: 1,
        archivedAt: null,
      }),
    }));
  });

  it('permite consulta autorizada com arquivados para historico', async () => {
    Appointment.findAll.mockResolvedValue([]);

    await request(app)
      .get('/appointments?from=2026-06-01T00:00:00.000Z&to=2026-06-02T00:00:00.000Z&includeArchived=true')
      .expect(200);

    const [{ where }] = Appointment.findAll.mock.calls.at(-1);
    expect(where).toEqual(expect.objectContaining({ userId: 1 }));
    expect(where).not.toHaveProperty('archivedAt');
  });

  it('arquiva somente atendimento cancelado sem disparar sincronizacao Google', async () => {
    const canceledAppointment = {
      ...buildLoadedAppointment(0),
      status: 'canceled',
      archivedAt: null,
    };
    canceledAppointment.update = jest.fn(async (values) => Object.assign(canceledAppointment, values));
    Appointment.findOne.mockResolvedValue(canceledAppointment);

    const response = await request(app)
      .patch('/appointments/10/archive')
      .expect(200);

    expect(canceledAppointment.update).toHaveBeenCalledWith({ archivedAt: expect.any(Date) });
    expect(response.body).toEqual(expect.objectContaining({
      id: 10,
      status: 'canceled',
      archivedAt: expect.any(String),
    }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejeita arquivamento de atendimento que nao esta cancelado', async () => {
    const scheduledAppointment = {
      ...buildLoadedAppointment(0),
      update: jest.fn(),
    };
    Appointment.findOne.mockResolvedValue(scheduledAppointment);

    await request(app)
      .patch('/appointments/10/archive')
      .expect(409);

    expect(scheduledAppointment.update).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
