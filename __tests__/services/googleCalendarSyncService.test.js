import Appointment from '../../src/models/Appointment.js';
import CalendarConnection from '../../src/models/CalendarConnection.js';
import { encryptToken } from '../../src/services/googleTokenCrypto.js';
import { syncAppointmentToGoogle } from '../../src/services/googleCalendarSyncService.js';

const assignableModel = (values) => ({
  ...values,
  update: jest.fn(async function update(nextValues) {
    Object.assign(this, nextValues);
    return this;
  }),
});

const buildAppointment = (overrides = {}) => assignableModel({
  id: 10,
  userId: 1,
  startAt: new Date('2026-06-01T14:00:00.000Z'),
  endAt: new Date('2026-06-01T15:00:00.000Z'),
  price: 200,
  depositAmount: 60,
  status: 'scheduled',
  notes: 'Atendimento',
  client: { name: 'Ana', phone: '+5511999999999' },
  services: [{
    serviceId: 2,
    serviceName: 'Maquiagem',
    price: 200,
    estimatedTime: 60,
    sortOrder: 0,
  }],
  ...overrides,
});

describe('googleCalendarSyncService', () => {
  beforeEach(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'google-client-id';
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = '12345678901234567890123456789012';
    global.fetch = jest.fn();
  });

  it('renova access token expirado e cria evento no Google Calendar', async () => {
    const connection = assignableModel({
      userId: 1,
      provider: 'google',
      enabled: true,
      calendarId: 'primary',
      accessTokenEncrypted: encryptToken('expired-access-token'),
      refreshTokenEncrypted: encryptToken('refresh-token'),
      accessTokenExpiresAt: new Date(Date.now() - 1000),
    });
    const appointment = buildAppointment();

    CalendarConnection.findOne.mockResolvedValue(connection);
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'fresh-access-token',
          expires_in: 3600,
          scope: 'https://www.googleapis.com/auth/calendar.events',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 'google-event-1' }),
      });

    await syncAppointmentToGoogle({ appointment, userId: 1, action: 'upsert' });

    expect(global.fetch).toHaveBeenLastCalledWith(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-access-token',
        }),
      }),
    );
    expect(appointment.update).toHaveBeenCalledWith(expect.objectContaining({
      googleCalendarId: 'primary',
      googleEventId: 'google-event-1',
      googleSyncStatus: 'synced',
      syncError: null,
    }));
  });

  it('marca falha quando o Google Calendar rejeita a sincronizacao', async () => {
    const connection = assignableModel({
      userId: 1,
      provider: 'google',
      enabled: true,
      calendarId: 'primary',
      accessTokenEncrypted: encryptToken('access-token'),
      refreshTokenEncrypted: encryptToken('refresh-token'),
      accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    });
    const appointment = buildAppointment();

    CalendarConnection.findOne.mockResolvedValue(connection);
    global.fetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ error: { message: 'Quota exceeded' } }),
    });

    await syncAppointmentToGoogle({ appointment, userId: 1, action: 'upsert' });

    expect(appointment.update).toHaveBeenCalledWith(expect.objectContaining({
      googleSyncStatus: 'failed',
      syncError: 'Quota exceeded',
    }));
    expect(connection.update).toHaveBeenCalledWith(expect.objectContaining({
      lastSyncStatus: 'failed',
      lastSyncError: 'Quota exceeded',
    }));
  });

  it('marca disabled quando nao ha conexao ativa', async () => {
    const appointment = buildAppointment();
    CalendarConnection.findOne.mockResolvedValue(null);

    await syncAppointmentToGoogle({ appointment, userId: 1, action: 'upsert' });

    expect(appointment.update).toHaveBeenCalledWith(expect.objectContaining({
      googleSyncStatus: 'disabled',
      syncError: null,
    }));
    expect(Appointment.update).not.toHaveBeenCalled();
  });
});
