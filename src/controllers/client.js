import { Op } from 'sequelize';
import dayjs from 'dayjs';
import Client from '../models/Client.js';
import { isValidPhoneNumber } from '../utils/phoneValidator.js';

class ClientController {
  static getUserId(req) {
    return req.user?.id;
  }

  static async registerClient(req, res) {
    try {
      const userId = ClientController.getUserId(req);
      const { name, lastName, phone, email, birthDate, address } = req.body;

      await Client.create({ userId, name, lastName, phone, email, birthDate, address });
      return res.status(201).json({ success: true });
    } catch (error) {
      console.error('Erro ao registrar cliente:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao registrar cliente.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  static async getClientById(req, res) {
    try {
      const userId = ClientController.getUserId(req);
      const { id } = req.params;

      if (!id || Number.isNaN(Number(id)) || parseInt(id, 10) <= 0) {
        return res.status(400).json({ error: 'ID inválido. O ID deve ser um número positivo.' });
      }

      const client = await Client.findOne({ where: { id, userId } });
      if (!client) {
        return res.status(404).json({ error: `Não foi possível encontrar o cliente com o ID: ${id}` });
      }

      return res.status(200).json(client);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar cliente.' });
    }
  }

  static async updateClient(req, res) {
    try {
      const userId = ClientController.getUserId(req);
      const { id } = req.params;
      const { name, lastName, phone, email, birthDate, address } = req.body;

      const [updated] = await Client.update(
        { name, lastName, phone, email, birthDate, address },
        { where: { id, userId } },
      );

      if (!updated) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }

      const updatedClient = await Client.findOne({ where: { id, userId } });
      return res.status(200).json(updatedClient);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao atualizar cliente.' });
    }
  }

  static async deleteClient(req, res) {
    try {
      const userId = ClientController.getUserId(req);
      const { id } = req.params;

      if (!id || Number.isNaN(Number(id)) || parseInt(id, 10) <= 0) {
        return res.status(400).json({ error: 'ID inválido. O ID deve ser um número positivo.' });
      }

      const client = await Client.findOne({ where: { id, userId } });
      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }

      await client.destroy();
      return res.status(200).json({ message: 'Cliente excluído com sucesso.' });
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      return res.status(500).json({ error: 'Erro ao eliminar cliente.' });
    }
  }

  static async listClients(req, res) {
    try {
      const userId = ClientController.getUserId(req);
      let { page = 1, limit = 10, search } = req.query;

      if (Number.isNaN(Number(page)) || Number(page) < 1) {
        return res.status(400).json({ error: "O parâmetro 'page' deve ser um número positivo." });
      }

      if (Number.isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100) {
        return res.status(400).json({ error: "O parâmetro 'limit' deve ser um número entre 1 e 100." });
      }

      page = Math.max(1, Number(page));
      limit = Math.min(Math.max(1, Number(limit)), 100);
      const offset = (page - 1) * limit;

      const where = { userId };
      if (search?.trim()) {
        const term = `%${String(search).trim()}%`;
        where[Op.or] = [
          { name: { [Op.iLike]: term } },
          { lastName: { [Op.iLike]: term } },
          { email: { [Op.iLike]: term } },
          { phone: { [Op.like]: term } },
        ];
      }

      const { count, rows: clients } = await Client.findAndCountAll({
        where,
        limit,
        offset,
        order: [['updatedAt', 'DESC']],
      });

      return res.status(200).json({
        total: count,
        page,
        pages: Math.ceil(count / limit),
        clients,
      });
    } catch (error) {
      console.error('Erro ao listar clientes:', error);
      return res.status(500).json({ error: 'Erro ao listar clientes.' });
    }
  }

  static async listClientsSync(req, res) {
    try {
      const userId = ClientController.getUserId(req);
      const { lastSync } = req.query;

      if (lastSync && !dayjs(lastSync).isValid()) {
        return res.status(400).json({ error: 'Formato inválido para lastSync. Use data ISO-8601.' });
      }

      const validatedLastSync = lastSync ? dayjs(lastSync).toDate() : dayjs('2000-01-01T00:00:00.000Z').toDate();

      const clients = await Client.findAll({
        where: {
          userId,
          updatedAt: { [Op.gt]: validatedLastSync },
        },
        order: [['updatedAt', 'DESC']],
        limit: 1000,
      });

      return res.status(200).json(clients);
    } catch (error) {
      console.error('Erro ao listar clientes:', {
        message: error.message,
        stack: error.stack,
      });
      return res.status(500).json({ error: 'Erro interno ao listar clientes.' });
    }
  }

  static async listClientsByName(req, res) {
    try {
      const userId = ClientController.getUserId(req);
      const { name } = req.query;
      if (!name) {
        return res.status(400).json({ error: 'Nome não fornecido.' });
      }

      const clients = await Client.findAll({
        where: {
          userId,
          name: { [Op.like]: `%${name}%` },
        },
      });

      if (clients.length === 0) {
        return res.status(404).json({ error: 'Nenhum cliente encontrado com esse nome.' });
      }

      return res.status(200).json(clients);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar clientes por nome.' });
    }
  }

  static async listClientsByLastName(req, res) {
    try {
      const userId = ClientController.getUserId(req);
      const { lastName } = req.query;
      if (!lastName) {
        return res.status(400).json({ error: 'Sobrenome não fornecido.' });
      }

      const clients = await Client.findAll({
        where: {
          userId,
          lastName: { [Op.like]: `%${lastName}%` },
        },
      });

      if (clients.length === 0) {
        return res.status(404).json({ error: 'Nenhum cliente encontrado com esse sobrenome.' });
      }

      return res.status(200).json(clients);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar clientes por sobrenome.' });
    }
  }

  static async listClientsByPhone(req, res) {
    try {
      const userId = ClientController.getUserId(req);
      const { phone } = req.query;

      if (!phone) {
        return res.status(400).json({ error: 'Telefone não fornecido.' });
      }

      const validNumber = isValidPhoneNumber(phone);
      if (!validNumber.isValid) {
        return res.status(400).json({ error: 'Número de telefone inválido.' });
      }

      const clients = await Client.findAll({ where: { userId, phone: validNumber.formatted } });

      if (clients.length === 0) {
        return res.status(404).json({ message: 'Nenhum cliente encontrado com o telefone fornecido.' });
      }

      return res.status(200).json(clients);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar clientes por telefone.' });
    }
  }
}

export default ClientController;
