import Client from '../models/Client.js';
import { Op } from 'sequelize';

export const existingClient = async (email, excludeId = null) => {
  const query = { where: { email } };

  if (excludeId) {
    query.where.id = { [Op.ne]: excludeId };
  }

  return await Client.findOne(query) !== null;
};

export default existingClient;
