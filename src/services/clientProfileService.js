import { Op } from 'sequelize';
import Appointment from '../models/Appointment.js';
import AppointmentService from '../models/AppointmentService.js';
import {
  decodeHistoryCursor,
  encodeHistoryCursor,
} from '../utils/clientHistoryCursor.js';

const appointmentAttributes = ['id', 'clientId', 'startAt', 'endAt', 'status', 'notes'];
const appointmentServiceAttributes = ['appointmentId', 'serviceId', 'serviceName', 'sortOrder'];

const visibleAppointmentsWhere = ({ userId, clientId }) => ({
  userId,
  clientId,
  archivedAt: null,
  status: { [Op.ne]: 'canceled' },
});

const toIsoString = (value) => new Date(value).toISOString();

const serializeAppointments = async (appointments) => {
  if (appointments.length === 0) {
    return [];
  }

  const ids = appointments.map(({ id }) => id);
  const snapshots = await AppointmentService.findAll({
    attributes: appointmentServiceAttributes,
    where: { appointmentId: { [Op.in]: ids } },
    order: [['appointmentId', 'ASC'], ['sortOrder', 'ASC'], ['id', 'ASC']],
  });
  const servicesByAppointmentId = new Map();

  for (const snapshot of snapshots) {
    const appointmentId = Number(snapshot.appointmentId);
    const services = servicesByAppointmentId.get(appointmentId) || [];

    services.push({
      sortOrder: Number(snapshot.sortOrder || 0),
      id: Number(snapshot.id || 0),
      serviceId: Number(snapshot.serviceId),
      name: snapshot.serviceName || null,
    });
    servicesByAppointmentId.set(appointmentId, services);
  }

  return appointments.map((appointment) => {
    const services = (servicesByAppointmentId.get(Number(appointment.id)) || [])
      .sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)
      .map(({ serviceId, name }) => ({ serviceId, name }));

    return {
      id: appointment.id,
      clientId: appointment.clientId,
      startAt: toIsoString(appointment.startAt),
      endAt: toIsoString(appointment.endAt),
      status: appointment.status,
      notes: appointment.notes,
      serviceIds: services.map(({ serviceId }) => serviceId),
      services,
      serviceName: services.map(({ name }) => name).filter(Boolean).join(' + '),
    };
  });
};

const loadUpcomingAppointments = async ({ userId, clientId, now }) => Appointment.findAll({
  attributes: appointmentAttributes,
  where: {
    ...visibleAppointmentsWhere({ userId, clientId }),
    startAt: { [Op.gte]: now },
  },
  limit: 4,
  order: [['startAt', 'ASC'], ['id', 'ASC']],
});

const loadHistoryRows = async ({ userId, clientId, cursor, limit, now }) => {
  const decodedCursor = decodeHistoryCursor(cursor);
  const where = {
    ...visibleAppointmentsWhere({ userId, clientId }),
    startAt: { [Op.lt]: now },
  };

  if (decodedCursor) {
    where[Op.or] = [
      { startAt: { [Op.lt]: decodedCursor.startAt } },
      {
        startAt: { [Op.eq]: decodedCursor.startAt },
        id: { [Op.lt]: decodedCursor.id },
      },
    ];
  }

  return Appointment.findAll({
    attributes: appointmentAttributes,
    where,
    limit: limit + 1,
    order: [['startAt', 'DESC'], ['id', 'DESC']],
  });
};

export const loadClientHistory = async ({ userId, clientId, cursor = null, limit = 10, now = new Date() }) => {
  const pageSize = Number.isInteger(limit) && limit > 0 ? limit : 10;
  const rows = await loadHistoryRows({ userId, clientId, cursor, limit: pageSize, now });
  const hasNextPage = rows.length > pageSize;
  const visibleRows = rows.slice(0, pageSize);

  return {
    appointments: await serializeAppointments(visibleRows),
    nextCursor: hasNextPage
      ? encodeHistoryCursor({
        startAt: visibleRows.at(-1).startAt,
        id: visibleRows.at(-1).id,
      })
      : null,
  };
};

export const loadClientProfile = async ({ userId, clientId, now = new Date() }) => {
  const [upcomingRows, historyRows] = await Promise.all([
    loadUpcomingAppointments({ userId, clientId, now }),
    loadHistoryRows({ userId, clientId, cursor: null, limit: 4, now }),
  ]);
  const hasNextPage = historyRows.length > 4;
  const visibleHistoryRows = historyRows.slice(0, 4);
  const serialized = await serializeAppointments([...upcomingRows, ...visibleHistoryRows]);

  return {
    upcomingAppointments: serialized.slice(0, upcomingRows.length),
    history: {
      appointments: serialized.slice(upcomingRows.length),
      nextCursor: hasNextPage
        ? encodeHistoryCursor({
          startAt: visibleHistoryRows.at(-1).startAt,
          id: visibleHistoryRows.at(-1).id,
        })
        : null,
    },
  };
};
