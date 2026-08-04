import Client from '../models/Client.js';
import {
  loadClientHistory,
  loadClientProfile,
} from '../services/clientProfileService.js';
import { decodeHistoryCursor } from '../utils/clientHistoryCursor.js';

const INVALID_ID_MESSAGE = 'ID inválido. O ID deve ser um número inteiro positivo.';
const INVALID_LIMIT_MESSAGE = "O parâmetro 'limit' deve ser um número inteiro entre 1 e 20.";

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

const serializeClient = (client) => {
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
    photoUrl: null,
  };
};

const findOwnedClient = ({ id, userId }) => Client.findOne({ where: { id, userId } });

class ClientProfileController {
  static async getProfile(req, res) {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: INVALID_ID_MESSAGE });
    }

    try {
      const client = await findOwnedClient({ id, userId: req.user.id });
      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }

      const profile = await loadClientProfile({ userId: req.user.id, clientId: id });
      return res.status(200).json({ client: serializeClient(client), ...profile });
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
        return res.status(404).json({ error: 'Cliente não encontrado.' });
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
}

export default ClientProfileController;
