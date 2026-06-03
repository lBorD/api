import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import Appointment from '../models/Appointment.js';
import AppointmentService from '../models/AppointmentService.js';
import Client from '../models/Client.js';
import Service from '../models/Service.js';
import {
  getInitialGoogleSyncStatus,
  queueAppointmentGoogleSync,
} from '../services/googleCalendarSyncService.js';

const ALLOWED_STATUS = ['scheduled', 'canceled', 'completed'];
const DEFAULT_DEPOSIT_RATE = 0.3;

if (typeof Appointment?.belongsTo === 'function') {
  if (!Appointment.associations || !Appointment.associations.client) {
    Appointment.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
  }

  if (!Appointment.associations || !Appointment.associations.service) {
    Appointment.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });
  }
}

if (typeof Appointment?.hasMany === 'function') {
  if (!Appointment.associations || !Appointment.associations.services) {
    Appointment.hasMany(AppointmentService, { foreignKey: 'appointmentId', as: 'services' });
  }
}

if (typeof AppointmentService?.belongsTo === 'function') {
  if (!AppointmentService.associations || !AppointmentService.associations.appointment) {
    AppointmentService.belongsTo(Appointment, { foreignKey: 'appointmentId', as: 'appointment' });
  }

  if (!AppointmentService.associations || !AppointmentService.associations.service) {
    AppointmentService.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });
  }
}

const parseUtcDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseCurrency = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const normalizedValue = typeof value === 'string' ? value.replace(',', '.') : value;
  const parsed = Number(normalizedValue);
  return Number.isNaN(parsed) ? null : parsed;
};

const roundCurrency = (value = 0) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const calculateDefaultDepositAmount = (price = 0) => roundCurrency(Number(price || 0) * DEFAULT_DEPOSIT_RATE);

const getModelValue = (item, key) => {
  if (!item) {
    return undefined;
  }

  if (typeof item.get === 'function') {
    return item.get(key);
  }

  return item[key];
};

const getServiceSource = (data = {}) => (
  data.serviceIds
  ?? data['serviceIds[]']
  ?? data.services
  ?? data.serviceId
);

const hasServiceSelection = (data = {}) => getServiceSource(data) !== undefined;

const flattenServiceIds = (value) => {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(flattenServiceIds);
  }

  if (typeof value === 'string' && value.includes(',')) {
    return value.split(',').flatMap(flattenServiceIds);
  }

  if (typeof value === 'object') {
    return flattenServiceIds(value.serviceId ?? value.id);
  }

  return [value];
};

const normalizeServiceIds = (data = {}, fallbackServiceId = null) => {
  const source = getServiceSource(data) ?? fallbackServiceId;
  const rawIds = flattenServiceIds(source);
  const serviceIds = [];
  const seen = new Set();

  for (const rawId of rawIds) {
    const serviceId = Number(rawId);

    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return null;
    }

    if (!seen.has(serviceId)) {
      seen.add(serviceId);
      serviceIds.push(serviceId);
    }
  }

  return serviceIds;
};

const loadServicesByIds = async (userId, serviceIds) => {
  const services = await Service.findAll({
    where: {
      id: { [Op.in]: serviceIds },
      userId,
      active: true,
    },
  });

  const servicesById = new Map(services.map((service) => [Number(service.id), service]));
  const orderedServices = serviceIds.map((serviceId) => servicesById.get(Number(serviceId)));

  return orderedServices.every(Boolean) ? orderedServices : null;
};

const calculateServicesTotals = (services) => services.reduce((totals, service) => ({
  price: totals.price + Number(service.price || 0),
  estimatedTime: totals.estimatedTime + Number(service.estimatedTime || 0),
}), { price: 0, estimatedTime: 0 });

const buildAppointmentServiceRows = (appointmentId, services) => services.map((service, index) => ({
  appointmentId,
  serviceId: service.id,
  serviceName: service.name,
  price: service.price,
  estimatedTime: service.estimatedTime,
  sortOrder: index,
}));

const loadCurrentServiceIds = async (appointment) => {
  const appointmentServices = await AppointmentService.findAll({
    where: { appointmentId: appointment.id },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
  });

  if (appointmentServices.length > 0) {
    return appointmentServices.map((item) => Number(item.serviceId));
  }

  return normalizeServiceIds({}, appointment.serviceId);
};

const normalizeAppointmentServicesForPayload = (appointment) => {
  const appointmentServices = Array.isArray(appointment.services)
    ? [...appointment.services].sort((a, b) => Number(getModelValue(a, 'sortOrder') || 0) - Number(getModelValue(b, 'sortOrder') || 0))
    : [];
  const services = appointmentServices
    .map((item) => {
      const serviceId = Number(getModelValue(item, 'serviceId'));

      if (!serviceId) {
        return null;
      }

      const name = getModelValue(item, 'serviceName') || getModelValue(item, 'name') || null;

      return {
        id: serviceId,
        serviceId,
        name,
        serviceName: name,
        price: Number(getModelValue(item, 'price') || 0),
        estimatedTime: Number(getModelValue(item, 'estimatedTime') || 0),
      };
    })
    .filter(Boolean);

  if (services.length > 0) {
    return services;
  }

  if (!appointment.serviceId) {
    return [];
  }

  const legacyName = appointment.service?.name || null;

  return [{
    id: Number(appointment.serviceId),
    serviceId: Number(appointment.serviceId),
    name: legacyName,
    serviceName: legacyName,
    price: Number(appointment.price || 0),
    estimatedTime: Number(appointment.service?.estimatedTime || 0),
  }];
};

const toPayload = (appointment) => {
  const services = normalizeAppointmentServicesForPayload(appointment);
  const serviceIds = services.map((service) => service.serviceId);
  const serviceName = services
    .map((service) => service.name)
    .filter(Boolean)
    .join(' + ');

  return {
    id: appointment.id,
    startAt: new Date(appointment.startAt).toISOString(),
    endAt: new Date(appointment.endAt).toISOString(),
    clientId: appointment.clientId,
    serviceId: serviceIds[0] || appointment.serviceId,
    serviceIds,
    services,
    clientName: appointment.client?.name || null,
    serviceName: serviceName || appointment.service?.name || null,
    price: Number(appointment.price),
    depositAmount: appointment.depositAmount !== null && appointment.depositAmount !== undefined
      ? Number(appointment.depositAmount)
      : 0,
    status: appointment.status,
    notes: appointment.notes || '',
    googleEventId: appointment.googleEventId || null,
    googleCalendarId: appointment.googleCalendarId || null,
    googleSyncStatus: appointment.googleSyncStatus,
    lastSyncedAt: appointment.lastSyncedAt ? new Date(appointment.lastSyncedAt).toISOString() : null,
    syncError: appointment.syncError || null,
  };
};

const findConflict = async ({ userId, startAt, endAt, excludeId = null }) => {
  const where = {
    userId,
    status: { [Op.ne]: 'canceled' },
    startAt: { [Op.lt]: endAt },
    endAt: { [Op.gt]: startAt },
  };

  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  return Appointment.findOne({ where });
};

const appointmentIncludes = [
  { model: Client, as: 'client', attributes: ['id', 'name', 'lastName', 'phone'] },
  { model: Service, as: 'service', attributes: ['id', 'name', 'estimatedTime'] },
  {
    model: AppointmentService,
    as: 'services',
    attributes: ['id', 'serviceId', 'serviceName', 'price', 'estimatedTime', 'sortOrder'],
  },
];

const loadAppointmentWithRelations = async (id, userId) => Appointment.findOne({
  where: { id, userId },
  include: appointmentIncludes,
});

class AppointmentController {
  static getUserId(req) {
    return req.user?.id;
  }

  static async listAppointments(req, res) {
    try {
      const userId = AppointmentController.getUserId(req);
      const { from, to } = req.query;

      const fromDate = parseUtcDate(from);
      const toDate = parseUtcDate(to);

      if (!fromDate || !toDate || fromDate >= toDate) {
        return res.status(400).json({ error: 'Parametros from/to invalidos. Use ISO-8601 UTC.' });
      }

      const appointments = await Appointment.findAll({
        where: {
          userId,
          startAt: { [Op.lt]: toDate },
          endAt: { [Op.gt]: fromDate },
        },
        include: appointmentIncludes,
        order: [['startAt', 'ASC']],
      });

      return res.status(200).json(appointments.map(toPayload));
    } catch (error) {
      console.error('Erro ao listar agendamentos:', error);
      return res.status(500).json({ error: 'Erro ao listar agendamentos.' });
    }
  }

  static async createAppointment(req, res) {
    try {
      const userId = AppointmentController.getUserId(req);
      const {
        clientId,
        startAt,
        notes = '',
      } = req.body;
      const { depositAmount } = req.body;

      const serviceIds = normalizeServiceIds(req.body);

      if (!clientId || !startAt || !serviceIds || serviceIds.length === 0) {
        return res.status(400).json({ error: 'Campos obrigatorios: clientId, serviceIds, startAt.' });
      }

      const parsedStartAt = parseUtcDate(startAt);
      if (!parsedStartAt) {
        return res.status(400).json({ error: 'startAt invalido. Use ISO-8601 UTC.' });
      }

      const hasDepositAmount = depositAmount !== undefined && depositAmount !== null && depositAmount !== '';
      const parsedDepositAmount = hasDepositAmount ? parseCurrency(depositAmount, 0) : null;

      if (hasDepositAmount && (parsedDepositAmount === null || parsedDepositAmount < 0)) {
        return res.status(400).json({ error: 'depositAmount invalido.' });
      }

      const [client, services] = await Promise.all([
        Client.findOne({ where: { id: clientId, userId } }),
        loadServicesByIds(userId, serviceIds),
      ]);

      if (!client) {
        return res.status(404).json({ error: 'Cliente nao encontrado para este usuario.' });
      }

      if (!services) {
        return res.status(404).json({ error: 'Um ou mais servicos nao foram encontrados/ativos para este usuario.' });
      }

      const totals = calculateServicesTotals(services);
      if (totals.estimatedTime <= 0) {
        return res.status(400).json({ error: 'A duracao total dos servicos deve ser maior que zero.' });
      }

      const parsedEndAt = new Date(parsedStartAt.getTime() + totals.estimatedTime * 60 * 1000);
      const appointmentDepositAmount = parsedDepositAmount ?? calculateDefaultDepositAmount(totals.price);

      const conflict = await findConflict({
        userId,
        startAt: parsedStartAt,
        endAt: parsedEndAt,
      });

      if (conflict) {
        return res.status(409).json({ error: 'Conflito de horario com outro agendamento.' });
      }

      const googleSyncStatus = await getInitialGoogleSyncStatus(userId);

      const appointment = await sequelize.transaction(async (transaction) => {
        const createdAppointment = await Appointment.create({
          userId,
          clientId,
          serviceId: services[0].id,
          startAt: parsedStartAt,
          endAt: parsedEndAt,
          price: totals.price,
          depositAmount: appointmentDepositAmount,
          status: 'scheduled',
          notes,
          source: 'app',
          googleSyncStatus,
          syncError: null,
        }, { transaction });

        await AppointmentService.bulkCreate(
          buildAppointmentServiceRows(createdAppointment.id, services),
          { transaction },
        );

        return createdAppointment;
      });

      const created = await loadAppointmentWithRelations(appointment.id, userId);
      if (created.googleSyncStatus === 'pending') {
        queueAppointmentGoogleSync({ appointment: created, userId, action: 'upsert' });
      }

      return res.status(201).json(toPayload(created));
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      return res.status(500).json({ error: 'Erro ao criar agendamento.' });
    }
  }

  static async updateAppointment(req, res) {
    try {
      const userId = AppointmentController.getUserId(req);
      const { id } = req.params;

      const appointment = await Appointment.findOne({ where: { id, userId } });
      if (!appointment) {
        return res.status(404).json({ error: 'Agendamento nao encontrado.' });
      }

      const nextClientId = req.body.clientId ?? appointment.clientId;
      const nextStartAt = req.body.startAt ? parseUtcDate(req.body.startAt) : new Date(appointment.startAt);

      if (!nextStartAt) {
        return res.status(400).json({ error: 'startAt invalido. Use ISO-8601 UTC.' });
      }

      const parsedDepositAmount = req.body.depositAmount !== undefined
        ? parseCurrency(req.body.depositAmount, Number(appointment.depositAmount || 0))
        : Number(appointment.depositAmount || 0);

      if (parsedDepositAmount === null || parsedDepositAmount < 0) {
        return res.status(400).json({ error: 'depositAmount invalido.' });
      }

      const serviceIds = hasServiceSelection(req.body)
        ? normalizeServiceIds(req.body)
        : await loadCurrentServiceIds(appointment);

      if (!serviceIds || serviceIds.length === 0) {
        return res.status(400).json({ error: 'Informe ao menos um servico.' });
      }

      const [client, services] = await Promise.all([
        Client.findOne({ where: { id: nextClientId, userId } }),
        loadServicesByIds(userId, serviceIds),
      ]);

      if (!client) {
        return res.status(404).json({ error: 'Cliente nao encontrado para este usuario.' });
      }

      if (!services) {
        return res.status(404).json({ error: 'Um ou mais servicos nao foram encontrados/ativos para este usuario.' });
      }

      const totals = calculateServicesTotals(services);
      if (totals.estimatedTime <= 0) {
        return res.status(400).json({ error: 'A duracao total dos servicos deve ser maior que zero.' });
      }

      const nextEndAt = new Date(nextStartAt.getTime() + totals.estimatedTime * 60 * 1000);

      const conflict = await findConflict({
        userId,
        startAt: nextStartAt,
        endAt: nextEndAt,
        excludeId: appointment.id,
      });

      if (conflict) {
        return res.status(409).json({ error: 'Conflito de horario com outro agendamento.' });
      }

      const googleSyncStatus = await getInitialGoogleSyncStatus(userId);

      await sequelize.transaction(async (transaction) => {
        await appointment.update({
          clientId: nextClientId,
          serviceId: services[0].id,
          startAt: nextStartAt,
          endAt: nextEndAt,
          price: totals.price,
          depositAmount: parsedDepositAmount,
          notes: req.body.notes !== undefined ? req.body.notes : appointment.notes,
          googleSyncStatus,
          syncError: null,
        }, { transaction });

        await AppointmentService.destroy({
          where: { appointmentId: appointment.id },
          transaction,
        });

        await AppointmentService.bulkCreate(
          buildAppointmentServiceRows(appointment.id, services),
          { transaction },
        );
      });

      const updated = await loadAppointmentWithRelations(appointment.id, userId);
      if (updated.googleSyncStatus === 'pending') {
        queueAppointmentGoogleSync({ appointment: updated, userId, action: 'upsert' });
      }

      return res.status(200).json(toPayload(updated));
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      return res.status(500).json({ error: 'Erro ao atualizar agendamento.' });
    }
  }

  static async updateAppointmentStatus(req, res) {
    try {
      const userId = AppointmentController.getUserId(req);
      const { id } = req.params;
      const { status } = req.body;

      if (!ALLOWED_STATUS.includes(status)) {
        return res.status(400).json({ error: `Status invalido. Use: ${ALLOWED_STATUS.join(', ')}` });
      }

      const appointment = await Appointment.findOne({ where: { id, userId } });
      if (!appointment) {
        return res.status(404).json({ error: 'Agendamento nao encontrado.' });
      }

      const shouldSyncStatus = status === 'canceled' || status === 'scheduled';
      const googleSyncStatus = shouldSyncStatus
        ? await getInitialGoogleSyncStatus(userId)
        : appointment.googleSyncStatus;
      const updateValues = { status };

      if (shouldSyncStatus) {
        updateValues.googleSyncStatus = googleSyncStatus;
        updateValues.syncError = null;
      }

      await appointment.update(updateValues);

      const updated = await loadAppointmentWithRelations(appointment.id, userId);
      if (shouldSyncStatus && updated.googleSyncStatus === 'pending') {
        queueAppointmentGoogleSync({
          appointment: updated,
          userId,
          action: status === 'canceled' ? 'cancel' : 'upsert',
        });
      }

      return res.status(200).json(toPayload(updated));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      return res.status(500).json({ error: 'Erro ao atualizar status do agendamento.' });
    }
  }

}

export default AppointmentController;
