import request from 'supertest';
import express from 'express';
import GoogleCalendarIntegrationController from '../../src/controllers/googleCalendarIntegration.js';
import CalendarConnection from '../../src/models/CalendarConnection.js';
import { encryptToken } from '../../src/services/googleTokenCrypto.js';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 1 };
  next();
});

app.get('/integrations/google-calendar/status', GoogleCalendarIntegrationController.status);
app.post('/integrations/google-calendar/connect', GoogleCalendarIntegrationController.connect);
app.delete('/integrations/google-calendar/disconnect', GoogleCalendarIntegrationController.disconnect);

const assignableModel = (values) => ({
  ...values,
  update: jest.fn(async function update(nextValues) {
    Object.assign(this, nextValues);
    return this;
  }),
});

describe('GoogleCalendarIntegrationController', () => {
  beforeEach(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'google-client-id';
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = '12345678901234567890123456789012';
    global.fetch = jest.fn();
  });

  it('retorna status desconectado sem expor tokens', async () => {
    CalendarConnection.findOne.mockResolvedValue(null);

    const response = await request(app)
      .get('/integrations/google-calendar/status')
      .expect(200);

    expect(response.body).toEqual({
      connected: false,
      enabled: false,
      calendarId: null,
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
    });
  });

  it('troca codigo OAuth e salva tokens criptografados', async () => {
    CalendarConnection.findOne.mockResolvedValue(null);
    CalendarConnection.create.mockImplementation((values) => Promise.resolve(assignableModel(values)));
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/calendar.events',
      }),
    });

    const response = await request(app)
      .post('/integrations/google-calendar/connect')
      .send({
        code: 'oauth-code',
        codeVerifier: 'code-verifier',
        redirectUri: 'com.bordd.beautyapp://oauth/google',
      })
      .expect(200);

    const savedConnection = CalendarConnection.create.mock.calls[0][0];
    expect(savedConnection.accessTokenEncrypted).not.toContain('access-token');
    expect(savedConnection.refreshTokenEncrypted).not.toContain('refresh-token');
    expect(response.body).toMatchObject({
      connected: true,
      enabled: true,
      calendarId: 'primary',
      lastSyncStatus: 'connected',
    });
    expect(response.body).not.toHaveProperty('accessTokenEncrypted');
    expect(response.body).not.toHaveProperty('refreshTokenEncrypted');
  });

  it('desativa conexao e revoga token em best effort', async () => {
    const connection = assignableModel({
      userId: 1,
      provider: 'google',
      enabled: true,
      calendarId: 'primary',
      refreshTokenEncrypted: encryptToken('refresh-token'),
    });
    CalendarConnection.findOne.mockResolvedValue(connection);
    global.fetch.mockResolvedValueOnce({ ok: true });

    const response = await request(app)
      .delete('/integrations/google-calendar/disconnect')
      .expect(200);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/revoke',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('refresh-token'),
      }),
    );
    expect(connection.update).toHaveBeenCalledWith(expect.objectContaining({
      enabled: false,
      accessTokenEncrypted: null,
      refreshTokenEncrypted: null,
      lastSyncStatus: 'disabled',
    }));
    expect(response.body.connected).toBe(false);
  });
});
