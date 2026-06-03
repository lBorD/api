import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

const parseEncryptionKey = () => {
  const configuredKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim();

  if (!configuredKey) {
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY nao configurada.');
  }

  if (/^[a-f0-9]{64}$/i.test(configuredKey)) {
    return Buffer.from(configuredKey, 'hex');
  }

  const base64Key = Buffer.from(configuredKey, 'base64');
  if (base64Key.length === KEY_LENGTH) {
    return base64Key;
  }

  const rawKey = Buffer.from(configuredKey, 'utf8');
  if (rawKey.length === KEY_LENGTH) {
    return rawKey;
  }

  throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY deve ter 32 bytes em texto, base64 ou 64 caracteres hex.');
};

export const encryptToken = (token) => {
  if (!token) {
    return null;
  }

  const key = parseEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
};

export const decryptToken = (encryptedToken) => {
  if (!encryptedToken) {
    return null;
  }

  const [version, iv, authTag, encrypted] = encryptedToken.split(':');
  if (version !== 'v1' || !iv || !authTag || !encrypted) {
    throw new Error('Token criptografado invalido.');
  }

  const key = parseEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]).toString('utf8');
};
