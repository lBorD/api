import Client from '../models/Client.js';
import {
  loadClientHistory,
  loadClientProfile,
} from '../services/clientProfileService.js';
import { processClientPhoto } from '../services/clientPhotoProcessor.js';
import {
  readClientPhoto,
  removeClientPhoto,
  replaceClientPhoto,
} from '../services/clientPhotoStorage.js';
import { decodeHistoryCursor } from '../utils/clientHistoryCursor.js';

const INVALID_ID_MESSAGE = 'ID inválido. O ID deve ser um número inteiro positivo.';
const INVALID_LIMIT_MESSAGE = "O parâmetro 'limit' deve ser um número inteiro entre 1 e 20.";
const NOT_FOUND_MESSAGE = 'Cliente não encontrado.';

const parsePositiveId = (value) => {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
};

const parseHistoryLimit = (value) => {
  if (value === undefined) {
    return 10;
  }

  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const limit = Number(value);
  return Number.isSafeInteger(limit) && limit <= 20 ? limit : null;
};

const serializePhotoMetadata = (clientId, photo) => {
  if (!photo?.updatedAt) {
    return { photoUrl: null, photoUpdatedAt: null };
  }

  const photoUpdatedAt = new Date(photo.updatedAt).toISOString();
  return {
    photoUrl: `/clients/${clientId}/photo?v=${encodeURIComponent(photoUpdatedAt)}`,
    photoUpdatedAt,
  };
};

const serializeClient = (client, photo = null, clientId = null) => {
  const source = typeof client.get === 'function' ? client.get({ plain: true }) : client;

  return {
    id: source.id,
    name: source.name,
    lastName: source.lastName,
    phone: source.phone,
    email: source.email,
    birthDate: source.birthDate ? new Date(source.birthDate).toISOString() : null,
    address: source.address,
    preferencesNotes: source.preferencesNotes,
    ...serializePhotoMetadata(clientId || source.id, photo),
  };
};

const findOwnedClient = ({ id, userId }) => Client.findOne({ where: { id, userId } });
const clientNotFound = (res) => res.status(404).json({ error: NOT_FOUND_MESSAGE });
const invalidPhoto = (res) => res.status(415).json({ error: 'Foto inválida.' });
const photoHeaders = (photo) => ({
  'Content-Type': 'image/webp',
  'Content-Length': String(photo.data.length),
  ETag: `"${photo.checksum}"`,
  'Cache-Control': 'private, max-age=86400, must-revalidate',
  'X-Content-Type-Options': 'nosniff',
});
const etagMatches = (header, etag) => typeof header === 'string'
  && header.split(',').map((value) => value.trim()).some((value) => (
    value === '*'
    || value === etag
    || (value.startsWith('W/') && value.slice(2).trim() === etag)
  ));

class ClientProfileController {
  static async getProfile(req, res) {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: INVALID_ID_MESSAGE });
    }

    try {
      const client = await findOwnedClient({ id, userId: req.user.id });
      if (!client) {
        return clientNotFound(res);
      }

      const { photo, ...profile } = await loadClientProfile({ userId: req.user.id, clientId: id });
      return res.status(200).json({ client: serializeClient(client, photo, id), ...profile });
    } catch (error) {
      console.error('Erro ao buscar perfil da cliente:', error);
      return res.status(500).json({ error: 'Erro ao buscar perfil da cliente.' });
    }
  }

  static async getHistory(req, res) {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: INVALID_ID_MESSAGE });
    }

    const limit = parseHistoryLimit(req.query.limit);
    if (!limit) {
      return res.status(400).json({ error: INVALID_LIMIT_MESSAGE });
    }

    const { cursor } = req.query;
    if (cursor !== undefined && !decodeHistoryCursor(cursor)) {
      return res.status(400).json({ error: 'Cursor inválido.' });
    }

    try {
      const client = await findOwnedClient({ id, userId: req.user.id });
      if (!client) {
        return clientNotFound(res);
      }

      const history = await loadClientHistory({
        userId: req.user.id,
        clientId: id,
        cursor: cursor || null,
        limit,
      });
      return res.status(200).json(history);
    } catch (error) {
      console.error('Erro ao buscar histórico da cliente:', error);
      return res.status(500).json({ error: 'Erro ao buscar histórico da cliente.' });
    }
  }

  static async putPhoto(req, res) {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: INVALID_ID_MESSAGE });
    }

    try {
      const client = await findOwnedClient({ id, userId: req.user.id });
      if (!client) {
        return clientNotFound(res);
      }

      if (!req.file?.buffer) {
        return res.status(400).json({ error: 'Envie uma única foto no campo photo.' });
      }

      let photo;
      try {
        photo = await processClientPhoto(req.file.buffer);
      } catch (error) {
        if (error?.code === 'INVALID_CLIENT_PHOTO') {
          return invalidPhoto(res);
        }
        throw error;
      }

      const metadata = await replaceClientPhoto({ userId: req.user.id, clientId: id, photo });
      return res.status(200).json(serializePhotoMetadata(id, metadata));
    } catch (error) {
      if (error?.code === 'CLIENT_PHOTO_NOT_FOUND') {
        return clientNotFound(res);
      }
      console.error('Erro ao atualizar foto da cliente:', error);
      return res.status(500).json({ error: 'Erro ao atualizar foto da cliente.' });
    }
  }

  static async validatePhotoOwnership(req, res, next) {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: INVALID_ID_MESSAGE });
    }

    try {
      const client = await findOwnedClient({ id, userId: req.user.id });
      if (!client) {
        return clientNotFound(res);
      }

      req.ownedClient = client;
      return next();
    } catch (error) {
      console.error('Erro ao validar cliente para foto:', error);
      return res.status(500).json({ error: 'Erro ao validar cliente para foto.' });
    }
  }

  static async getPhoto(req, res) {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: INVALID_ID_MESSAGE });
    }

    try {
      const client = await findOwnedClient({ id, userId: req.user.id });
      if (!client) {
        return clientNotFound(res);
      }

      const photo = await readClientPhoto({ userId: req.user.id, clientId: id });
      if (!photo) {
        return clientNotFound(res);
      }

      const headers = photoHeaders(photo);
      res.set(headers);
      if (etagMatches(req.get('If-None-Match'), headers.ETag)) {
        return res.status(304).end();
      }

      return res.status(200).send(photo.data);
    } catch (error) {
      console.error('Erro ao buscar foto da cliente:', error);
      return res.status(500).json({ error: 'Erro ao buscar foto da cliente.' });
    }
  }

  static async deletePhoto(req, res) {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: INVALID_ID_MESSAGE });
    }

    try {
      const client = await findOwnedClient({ id, userId: req.user.id });
      if (!client) {
        return clientNotFound(res);
      }

      await removeClientPhoto({ userId: req.user.id, clientId: id });
      return res.status(204).end();
    } catch (error) {
      if (error?.code === 'CLIENT_PHOTO_NOT_FOUND') {
        return clientNotFound(res);
      }
      console.error('Erro ao remover foto da cliente:', error);
      return res.status(500).json({ error: 'Erro ao remover foto da cliente.' });
    }
  }
}

export default ClientProfileController;
