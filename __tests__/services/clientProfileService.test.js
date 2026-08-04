import { Op } from 'sequelize';
import Appointment from '../../src/models/Appointment.js';
import AppointmentService from '../../src/models/AppointmentService.js';
import { encodeHistoryCursor } from '../../src/utils/clientHistoryCursor.js';
import {
  loadClientHistory,
  loadClientProfile,
} from '../../src/services/clientProfileService.js';

const now = new Date('2026-08-03T12:00:00.000Z');

const upcomingAppointment = {
  id: 31,
  userId: 7,
  clientId: 12,
  startAt: new Date('2026-08-04T09:00:00.000Z'),
  endAt: new Date('2026-08-04T10:00:00.000Z'),
  status: 'scheduled',
  notes: 'Confirmar na véspera',
  price: 120,
  depositAmount: 30,
  googleSyncStatus: 'synced',
};

const historyAppointment = {
  id: 30,
  userId: 7,
  clientId: 12,
  startAt: new Date('2026-08-02T09:00:00.000Z'),
  endAt: new Date('2026-08-02T10:00:00.000Z'),
  status: 'completed',
  notes: null,
  price: 90,
  depositAmount: 20,
  googleEventId: 'google-event',
};

describe('clientProfileService', () => {
  beforeEach(() => {
    Appointment.findAll.mockReset();
    AppointmentService.findAll.mockReset();
  });

  it('filtra próximos e histórico por tenant, cliente e visibilidade', async () => {
    const snapshots = [
      { appointmentId: 31, serviceId: 5, serviceName: 'Extensão', sortOrder: 1 },
      { appointmentId: 31, serviceId: 2, serviceName: 'Hidratação', sortOrder: 0 },
      { appointmentId: 30, serviceId: 4, serviceName: 'Manutenção', sortOrder: 0 },
    ];
    Appointment.findAll.mockImplementation(({ where }) => {
      if (where.appointmentId) {
        return Promise.resolve(snapshots);
      }

      return Promise.resolve(where.startAt[Op.gte] ? [upcomingAppointment] : [historyAppointment]);
    });

    const profile = await loadClientProfile({ userId: 7, clientId: 12, now });

    expect(Appointment.findAll).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({
        userId: 7,
        clientId: 12,
        archivedAt: null,
        status: { [Op.ne]: 'canceled' },
        startAt: { [Op.gte]: now },
      }),
      limit: 4,
      order: [['startAt', 'ASC'], ['id', 'ASC']],
    }));
    expect(Appointment.findAll).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({
        userId: 7,
        clientId: 12,
        archivedAt: null,
        status: { [Op.ne]: 'canceled' },
        startAt: { [Op.lt]: now },
      }),
      limit: 5,
      order: [['startAt', 'DESC'], ['id', 'DESC']],
    }));
    const snapshotQueries = AppointmentService.findAll.mock.calls.filter(([{ where }]) => where.appointmentId);
    expect(snapshotQueries).toHaveLength(1);
    expect(snapshotQueries[0][0]).toEqual(expect.objectContaining({
      where: { appointmentId: { [Op.in]: [31, 30] } },
    }));
    expect(profile).toEqual({
      upcomingAppointments: [{
        id: 31,
        clientId: 12,
        startAt: '2026-08-04T09:00:00.000Z',
        endAt: '2026-08-04T10:00:00.000Z',
        status: 'scheduled',
        notes: 'Confirmar na véspera',
        serviceIds: [2, 5],
        services: [
          { serviceId: 2, name: 'Hidratação' },
          { serviceId: 5, name: 'Extensão' },
        ],
        serviceName: 'Hidratação + Extensão',
      }],
      history: {
        appointments: [{
          id: 30,
          clientId: 12,
          startAt: '2026-08-02T09:00:00.000Z',
          endAt: '2026-08-02T10:00:00.000Z',
          status: 'completed',
          notes: null,
          serviceIds: [4],
          services: [{ serviceId: 4, name: 'Manutenção' }],
          serviceName: 'Manutenção',
        }],
        nextCursor: null,
      },
    });
    expect(JSON.stringify(profile)).not.toMatch(/price|depositAmount|google/i);
  });

  it('pagina empate de horário usando id como desempate', async () => {
    Appointment.findAll.mockResolvedValue([]);

    await loadClientHistory({
      userId: 7,
      clientId: 12,
      limit: 10,
      cursor: encodeHistoryCursor({ startAt: '2026-08-01T10:00:00.000Z', id: 9 }),
      now,
    });

    expect(Appointment.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: 7,
        clientId: 12,
        archivedAt: null,
        status: { [Op.ne]: 'canceled' },
        startAt: { [Op.lt]: now },
        [Op.or]: [
          { startAt: { [Op.lt]: new Date('2026-08-01T10:00:00.000Z') } },
          {
            startAt: { [Op.eq]: new Date('2026-08-01T10:00:00.000Z') },
            id: { [Op.lt]: 9 },
          },
        ],
      }),
      limit: 11,
      order: [['startAt', 'DESC'], ['id', 'DESC']],
    }));
  });

  it('remove o excedente e devolve cursor do último item visível', async () => {
    const appointments = [
      { ...historyAppointment, id: 30, startAt: new Date('2026-08-02T09:00:00.000Z') },
      { ...historyAppointment, id: 29, startAt: new Date('2026-08-01T09:00:00.000Z') },
      { ...historyAppointment, id: 28, startAt: new Date('2026-07-31T09:00:00.000Z') },
    ];
    Appointment.findAll.mockImplementation(({ where }) => (
      Promise.resolve(where.appointmentId ? [] : appointments)
    ));

    const history = await loadClientHistory({ userId: 7, clientId: 12, limit: 2, now });

    expect(history.appointments.map(({ id }) => id)).toEqual([30, 29]);
    expect(history.nextCursor).toBe(encodeHistoryCursor({
      startAt: '2026-08-01T09:00:00.000Z',
      id: 29,
    }));
  });
});
