import Client from '../models/Client.js';
import { Op } from 'sequelize';

export const existingClient = async (email, excludeId = null, userId = null) => {
  const normalizedEmail = typeof email === 'string' ? email.trim() : email;

  if (!normalizedEmail) {
    return false;
  }

  const where = { email: normalizedEmail };

  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  if (userId) {
    where.userId = userId;
  }

  const query = { where };
  return (await Client.findOne(query)) !== null;
};

export default existingClient;

