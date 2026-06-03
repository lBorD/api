const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

const getGoogleClientId = () => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();

  if (!clientId) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID nao configurado.');
  }

  return clientId;
};

const appendOptionalClientSecret = (params) => {
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();

  if (clientSecret) {
    params.set('client_secret', clientSecret);
  }
};

const requestToken = async (params) => {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error_description || data.error || 'Falha ao comunicar com OAuth Google.';
    throw new Error(message);
  }

  return data;
};

export const exchangeAuthorizationCode = async ({ code, codeVerifier, redirectUri }) => {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  appendOptionalClientSecret(params);

  return requestToken(params);
};

export const refreshAccessToken = async (refreshToken) => {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  appendOptionalClientSecret(params);

  return requestToken(params);
};

export const revokeGoogleToken = async (token) => {
  if (!token) {
    return false;
  }

  const response = await fetch(REVOKE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }).toString(),
  });

  return response.ok;
};
