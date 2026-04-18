import { Op } from 'sequelize';
import Appointment from '../models/Appointment.js';
import Client from '../models/Client.js';
import Service from '../models/Service.js';

const ALLOWED_STATUS = ['scheduled', 'canceled', 'completed'];
const SLOT_STEP_MINUTES = 30;

if (typeof Appointment?.belongsTo === 'function') {
  if (!Appointment.associations || !Appointment.associations.client) {
    Appointment.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
  }

  if (!Appointment.associations || !Appointment.associations.service) {
    Appointment.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });
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

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const isOverlapping = (startA, endA, startB, endB) => startA < endB && endA > startB;

const toPayload = (appointment) => ({
  id: appointment.id,
  startAt: new Date(appointment.startAt).toISOString(),
  endAt: new Date(appointment.endAt).toISOString(),
  clientId: appointment.clientId,
  serviceId: appointment.serviceId,
  clientName: appointment.client?.name || null,
  serviceName: appointment.service?.name || null,
  price: Number(appointment.price),
  depositAmount: appointment.depositAmount !== null && appointment.depositAmount !== undefined
    ? Number(appointment.depositAmount)
    : 0,
  status: appointment.status,
  notes: appointment.notes || '',
  googleSyncStatus: appointment.googleSyncStatus,
});

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

const loadAppointmentWithRelations = async (id, userId) => Appointment.findOne({
  where: { id, userId },
  include: [
    { model: Client, as: 'client', attributes: ['id', 'name', 'lastName'] },
    { model: Service, as: 'service', attributes: ['id', 'name', 'estimatedTime'] },
  ],
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
        include: [
          { model: Client, as: 'client', attributes: ['id', 'name', 'lastName'] },
          { model: Service, as: 'service', attributes: ['id', 'name', 'estimatedTime'] },
        ],
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
        serviceId,
        startAt,
        depositAmount = 0,
        notes = '',
      } = req.body;

      if (!clientId || !serviceId || !startAt) {
        return res.status(400).json({ error: 'Campos obrigatorios: clientId, serviceId, startAt.' });
      }

      const parsedStartAt = parseUtcDate(startAt);
      if (!parsedStartAt) {
        return res.status(400).json({ error: 'startAt invalido. Use ISO-8601 UTC.' });
      }

      const parsedDepositAmount = parseCurrency(depositAmount, 0);
      if (parsedDepositAmount === null || parsedDepositAmount < 0) {
        return res.status(400).json({ error: 'depositAmount invalido.' });
      }

      const [client, service] = await Promise.all([
        Client.findOne({ where: { id: clientId, userId } }),
        Service.findOne({ where: { id: serviceId, userId, active: true } }),
      ]);

      if (!client) {
        return res.status(404).json({ error: 'Cliente nao encontrado para este usuario.' });
      }

      if (!service) {
        return res.status(404).json({ error: 'Servico nao encontrado/ativo para este usuario.' });
      }

      const parsedEndAt = new Date(parsedStartAt.getTime() + Number(service.estimatedTime) * 60 * 1000);

      const conflict = await findConflict({
        userId,
        startAt: parsedStartAt,
        endAt: parsedEndAt,
      });

      if (conflict) {
        return res.status(409).json({ error: 'Conflito de horario com outro agendamento.' });
      }

      const appointment = await Appointment.create({
        userId,
        clientId,
        serviceId,
        startAt: parsedStartAt,
        endAt: parsedEndAt,
        price: service.price,
        depositAmount: parsedDepositAmount,
        status: 'scheduled',
        notes,
        source: 'app',
        googleSyncStatus: 'pending',
      });

      const created = await loadAppointmentWithRelations(appointment.id, userId);
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
      const nextServiceId = req.body.serviceId ?? appointment.serviceId;
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

      const [client, service] = await Promise.all([
        Client.findOne({ where: { id: nextClientId, userId } }),
        Service.findOne({ where: { id: nextServiceId, userId, active: true } }),
      ]);

      if (!client) {
        return res.status(404).json({ error: 'Cliente nao encontrado para este usuario.' });
      }

      if (!service) {
        return res.status(404).json({ error: 'Servico nao encontrado/ativo para este usuario.' });
      }

      const nextEndAt = new Date(nextStartAt.getTime() + Number(service.estimatedTime) * 60 * 1000);

      const conflict = await findConflict({
        userId,
        startAt: nextStartAt,
        endAt: nextEndAt,
        excludeId: appointment.id,
      });

      if (conflict) {
        return res.status(409).json({ error: 'Conflito de horario com outro agendamento.' });
      }

      await appointment.update({
        clientId: nextClientId,
        serviceId: nextServiceId,
        startAt: nextStartAt,
        endAt: nextEndAt,
        price: service.price,
        depositAmount: parsedDepositAmount,
        notes: req.body.notes !== undefined ? req.body.notes : appointment.notes,
      });

      const updated = await loadAppointmentWithRelations(appointment.id, userId);
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

      await appointment.update({ status });

      const updated = await loadAppointmentWithRelations(appointment.id, userId);
      return res.status(200).json(toPayload(updated));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      return res.status(500).json({ error: 'Erro ao atualizar status do agendamento.' });
    }
  }

  static async suggestSlots(req, res) {
    try {
      const userId = AppointmentController.getUserId(req);
      const { from, to, serviceId, excludeAppointmentId } = req.query;

      if (!from || !to || !serviceId) {
        return res.status(400).json({ error: 'Campos obrigatorios: from, to, serviceId.' });
      }

      const fromDate = parseUtcDate(from);
      const toDate = parseUtcDate(to);

      if (!fromDate || !toDate || fromDate >= toDate) {
        return res.status(400).json({ error: 'Parametros from/to invalidos. Use ISO-8601 UTC.' });
      }

      const service = await Service.findOne({ where: { id: serviceId, userId, active: true } });
      if (!service) {
        return res.status(404).json({ error: 'Servico nao encontrado/ativo para este usuario.' });
      }

      const busyWhere = {
        userId,
        status: { [Op.ne]: 'canceled' },
        startAt: { [Op.lt]: toDate },
        endAt: { [Op.gt]: fromDate },
      };

      if (excludeAppointmentId) {
        busyWhere.id = { [Op.ne]: Number(excludeAppointmentId) };
      }

      const busyAppointments = await Appointment.findAll({
        where: busyWhere,
        attributes: ['startAt', 'endAt'],
        order: [['startAt', 'ASC']],
      });

      const suggestions = [];
      const slotDurationMs = Number(service.estimatedTime) * 60 * 1000;
      const stepMs = SLOT_STEP_MINUTES * 60 * 1000;

      for (let cursor = fromDate.getTime(); cursor + slotDurationMs <= toDate.getTime(); cursor += stepMs) {
        const candidateStart = new Date(cursor);
        const candidateEnd = new Date(cursor + slotDurationMs);

        const hasConflict = busyAppointments.some((item) => {
          const busyStart = new Date(item.startAt);
          const busyEnd = new Date(item.endAt);
          return isOverlapping(candidateStart, candidateEnd, busyStart, busyEnd);
        });

        if (!hasConflict) {
          suggestions.push({ startAt: candidateStart.toISOString() });
        }
      }

      return res.status(200).json(suggestions);
    } catch (error) {
      console.error('Erro ao sugerir horarios:', error);
      return res.status(500).json({ error: 'Erro ao sugerir horarios.' });
    }
  }
}

export default AppointmentController;

