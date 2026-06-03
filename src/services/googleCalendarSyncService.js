import Appointment from '../models/Appointment.js';
import CalendarConnection from '../models/CalendarConnection.js';
import { decryptToken, encryptToken } from './googleTokenCrypto.js';
import { refreshAccessToken } from './googleOAuthService.js';
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
} from './googleCalendarService.js';

const GOOGLE_PROVIDER = 'google';
const ACCESS_TOKEN_REFRESH_WINDOW_MS = 60 * 1000;
const MAX_SYNC_ERROR_LENGTH = 1000;

const getModelValue = (item, key) => {
  if (!item) {
    return undefined;
  }

  if (typeof item.get === 'function') {
    return item.get(key);
  }

  return item[key];
};

export const findActiveGoogleConnection = (userId) => CalendarConnection.findOne({
  where: {
    userId,
    provider: GOOGLE_PROVIDER,
    enabled: true,
  },
});

export const getInitialGoogleSyncStatus = async (userId) => {
  const connection = await findActiveGoogleConnection(userId);
  return connection ? 'pending' : 'disabled';
};

const updateModel = async (model, values) => {
  if (model && typeof model.update === 'function') {
    return model.update(values);
  }

  return Appointment.update(values, { where: { id: getModelValue(model, 'id') } });
};

const updateConnectionSyncState = async (connection, values) => {
  if (!connection || typeof connection.update !== 'function') {
    return;
  }

  await connection.update(values);
};

const getValidAccessToken = async (connection) => {
  const expiresAt = getModelValue(connection, 'accessTokenExpiresAt');
  const accessTokenEncrypted = getModelValue(connection, 'accessTokenEncrypted');

  if (accessTokenEncrypted && expiresAt) {
    const expiryTime = new Date(expiresAt).getTime();

    if (Number.isFinite(expiryTime) && expiryTime - ACCESS_TOKEN_REFRESH_WINDOW_MS > Date.now()) {
      return decryptToken(accessTokenEncrypted);
    }
  }

  const refreshToken = decryptToken(getModelValue(connection, 'refreshTokenEncrypted'));
  if (!refreshToken) {
    throw new Error('Refresh token Google indisponivel.');
  }

  const refreshedTokens = await refreshAccessToken(refreshToken);
  const nextAccessToken = refreshedTokens.access_token;

  if (!nextAccessToken) {
    throw new Error('Google nao retornou access token atualizado.');
  }

  const expiresIn = Number(refreshedTokens.expires_in || 0);
  await updateConnectionSyncState(connection, {
    accessTokenEncrypted: encryptToken(nextAccessToken),
    accessTokenExpiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : null,
    scope: refreshedTokens.scope || getModelValue(connection, 'scope'),
  });

  return nextAccessToken;
};

const getAppointmentServices = (appointment) => {
  const services = Array.isArray(getModelValue(appointment, 'services'))
    ? [...getModelValue(appointment, 'services')]
    : [];

  if (services.length > 0) {
    return services.sort((a, b) => Number(getModelValue(a, 'sortOrder') || 0) - Number(getModelValue(b, 'sortOrder') || 0));
  }

  const service = getModelValue(appointment, 'service');
  if (service) {
    return [service];
  }

  return [];
};

const buildServiceName = (appointment) => {
  const serviceNames = getAppointmentServices(appointment)
    .map((service) => getModelValue(service, 'serviceName') || getModelValue(service, 'name'))
    .filter(Boolean);

  return serviceNames.join(' + ') || 'Servico';
};

const formatCurrency = (value = 0) => Number(value || 0).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const buildDescription = (appointment) => {
  const client = getModelValue(appointment, 'client');
  const lines = [
    'Agendamento criado pelo BeautyApp.',
    `Cliente: ${getModelValue(client, 'name') || 'Cliente'}`,
  ];
  const phone = getModelValue(client, 'phone');

  if (phone) {
    lines.push(`Telefone: ${phone}`);
  }

  lines.push(`Servicos: ${buildServiceName(appointment)}`);
  lines.push(`Valor: ${formatCurrency(getModelValue(appointment, 'price'))}`);
  lines.push(`Sinal: ${formatCurrency(getModelValue(appointment, 'depositAmount'))}`);

  const notes = getModelValue(appointment, 'notes');
  if (notes) {
    lines.push('');
    lines.push(`Observacoes: ${notes}`);
  }

  return lines.join('\n');
};

const buildGoogleEventPayload = (appointment) => {
  const client = getModelValue(appointment, 'client');
  const clientName = getModelValue(client, 'name') || 'Cliente';
  const serviceName = buildServiceName(appointment);

  return {
    summary: `${clientName} - ${serviceName}`,
    description: buildDescription(appointment),
    start: {
      dateTime: new Date(getModelValue(appointment, 'startAt')).toISOString(),
    },
    end: {
      dateTime: new Date(getModelValue(appointment, 'endAt')).toISOString(),
    },
    extendedProperties: {
      private: {
        beautyAppAppointmentId: String(getModelValue(appointment, 'id')),
      },
    },
  };
};

const getSyncErrorText = (error) => (
  (error?.message || 'Falha ao sincronizar com Google Calendar.').slice(0, MAX_SYNC_ERROR_LENGTH)
);

const markAppointmentSyncDisabled = async (appointment) => updateModel(appointment, {
  googleSyncStatus: 'disabled',
  syncError: null,
});

const markAppointmentSyncFailed = async ({ appointment, connection, error }) => {
  const syncError = getSyncErrorText(error);

  await Promise.all([
    updateModel(appointment, {
      googleSyncStatus: 'failed',
      syncError,
    }),
    updateConnectionSyncState(connection, {
      lastSyncAt: new Date(),
      lastSyncStatus: 'failed',
      lastSyncError: syncError,
    }),
  ]);
};

const markAppointmentSyncSuccess = async ({ appointment, connection, googleEventId = null }) => {
  const calendarId = getModelValue(connection, 'calendarId') || 'primary';
  const updateValues = {
    googleCalendarId: calendarId,
    googleSyncStatus: 'synced',
    lastSyncedAt: new Date(),
    syncError: null,
  };

  if (googleEventId) {
    updateValues.googleEventId = googleEventId;
  }

  await Promise.all([
    updateModel(appointment, updateValues),
    updateConnectionSyncState(connection, {
      lastSyncAt: new Date(),
      lastSyncStatus: 'synced',
      lastSyncError: null,
    }),
  ]);
};

export const syncAppointmentToGoogle = async ({ appointment, userId, action = 'upsert' }) => {
  const connection = await findActiveGoogleConnection(userId);

  if (!connection) {
    await markAppointmentSyncDisabled(appointment);
    return;
  }

  try {
    const accessToken = await getValidAccessToken(connection);
    const calendarId = getModelValue(connection, 'calendarId') || 'primary';
    const googleEventId = getModelValue(appointment, 'googleEventId');
    const shouldDelete = action === 'cancel' || getModelValue(appointment, 'status') === 'canceled';

    if (shouldDelete) {
      if (googleEventId) {
        await deleteGoogleCalendarEvent({ accessToken, calendarId, eventId: googleEventId });
      }

      await markAppointmentSyncSuccess({ appointment, connection });
      return;
    }

    const event = buildGoogleEventPayload(appointment);
    if (googleEventId) {
      await updateGoogleCalendarEvent({ accessToken, calendarId, eventId: googleEventId, event });
      await markAppointmentSyncSuccess({ appointment, connection, googleEventId });
      return;
    }

    const createdEvent = await createGoogleCalendarEvent({ accessToken, calendarId, event });
    await markAppointmentSyncSuccess({
      appointment,
      connection,
      googleEventId: createdEvent?.id || googleEventId,
    });
  } catch (error) {
    await markAppointmentSyncFailed({ appointment, connection, error });
  }
};

export const queueAppointmentGoogleSync = ({ appointment, userId, action = 'upsert' }) => {
  Promise.resolve()
    .then(() => syncAppointmentToGoogle({ appointment, userId, action }))
    .catch((error) => {
      console.error('Erro inesperado na fila Google Calendar:', error);
    });
};
