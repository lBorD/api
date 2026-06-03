import Client from '../models/Client.js';
import { Op } from 'sequelize';

export const existingClient = async (email, excludeId = null, userId = null) => {
  const where = { email };

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

