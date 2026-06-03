import CalendarConnection from '../models/CalendarConnection.js';
import { decryptToken, encryptToken } from '../services/googleTokenCrypto.js';
import { exchangeAuthorizationCode, revokeGoogleToken } from '../services/googleOAuthService.js';

const GOOGLE_PROVIDER = 'google';
const DEFAULT_CALENDAR_ID = 'primary';

const toStatusPayload = (connection) => {
  if (!connection || !connection.enabled) {
    return {
      connected: false,
      enabled: false,
      calendarId: null,
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
    };
  }

  return {
    connected: true,
    enabled: Boolean(connection.enabled),
    calendarId: connection.calendarId || DEFAULT_CALENDAR_ID,
    lastSyncAt: connection.lastSyncAt ? new Date(connection.lastSyncAt).toISOString() : null,
    lastSyncStatus: connection.lastSyncStatus || null,
    lastSyncError: connection.lastSyncError || null,
  };
};

class GoogleCalendarIntegrationController {
  static getUserId(req) {
    return req.user?.id;
  }

  static async status(req, res) {
    try {
      const userId = GoogleCalendarIntegrationController.getUserId(req);
      const connection = await CalendarConnection.findOne({
        where: { userId, provider: GOOGLE_PROVIDER },
      });

      return res.status(200).json(toStatusPayload(connection));
    } catch (error) {
      console.error('Erro ao buscar status Google Calendar:', error);
      return res.status(500).json({ error: 'Erro ao buscar status do Google Calendar.' });
    }
  }

  static async connect(req, res) {
    try {
      const userId = GoogleCalendarIntegrationController.getUserId(req);
      const { code, codeVerifier, redirectUri } = req.body;

      if (!code || !codeVerifier || !redirectUri) {
        return res.status(400).json({ error: 'Campos obrigatorios: code, codeVerifier, redirectUri.' });
      }

      const tokens = await exchangeAuthorizationCode({ code, codeVerifier, redirectUri });
      if (!tokens.access_token) {
        throw new Error('Google nao retornou access token.');
      }

      const existingConnection = await CalendarConnection.findOne({
        where: { userId, provider: GOOGLE_PROVIDER },
      });
      const refreshTokenEncrypted = tokens.refresh_token
        ? encryptToken(tokens.refresh_token)
        : existingConnection?.refreshTokenEncrypted;

      if (!refreshTokenEncrypted) {
        return res.status(400).json({ error: 'Google nao retornou refresh token. Tente conectar novamente.' });
      }

      const expiresIn = Number(tokens.expires_in || 0);
      const values = {
        userId,
        provider: GOOGLE_PROVIDER,
        calendarId: existingConnection?.calendarId || DEFAULT_CALENDAR_ID,
        accessTokenEncrypted: encryptToken(tokens.access_token),
        refreshTokenEncrypted,
        accessTokenExpiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : null,
        scope: tokens.scope || null,
        enabled: true,
        lastSyncAt: new Date(),
        lastSyncStatus: 'connected',
        lastSyncError: null,
      };

      const connection = existingConnection
        ? await existingConnection.update(values)
        : await CalendarConnection.create(values);

      return res.status(200).json(toStatusPayload(connection));
    } catch (error) {
      console.error('Erro ao conectar Google Calendar:', error);
      return res.status(500).json({ error: 'Erro ao conectar Google Calendar.' });
    }
  }

  static async disconnect(req, res) {
    try {
      const userId = GoogleCalendarIntegrationController.getUserId(req);
      const connection = await CalendarConnection.findOne({
        where: { userId, provider: GOOGLE_PROVIDER },
      });

      if (!connection) {
        return res.status(200).json(toStatusPayload(null));
      }

      try {
        const refreshToken = decryptToken(connection.refreshTokenEncrypted);
        await revokeGoogleToken(refreshToken);
      } catch (revokeError) {
        console.error('Erro ao revogar token Google Calendar:', revokeError);
      }

      await connection.update({
        enabled: false,
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        accessTokenExpiresAt: null,
        lastSyncAt: new Date(),
        lastSyncStatus: 'disabled',
        lastSyncError: null,
      });

      return res.status(200).json(toStatusPayload(connection));
    } catch (error) {
      console.error('Erro ao desconectar Google Calendar:', error);
      return res.status(500).json({ error: 'Erro ao desconectar Google Calendar.' });
    }
  }
}

export default GoogleCalendarIntegrationController;
