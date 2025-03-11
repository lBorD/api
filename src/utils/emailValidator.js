import Client from '../models/Client.js';

export const existingClient = async (email) => {
  return await Client.findOne({ where: { email } }) !== null;
};

export default existingClient;
