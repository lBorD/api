import Client from '../models/Client.js';
import { isValidPhoneNumber } from '../utils/phoneValidator.js';
import { Op } from 'sequelize';
import dayjs from 'dayjs';


class ClientController {
  static async registerClient(req, res) {
    try {
      const { name, lastName, phone, email, birthDate, address } = req.body;

      await Client.create({ name, lastName, phone, email, birthDate, address });
      return res.status(201).json({ success: true });

    } catch (error) {
      console.error("Erro ao registrar cliente:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao registrar cliente.",
        error: process.env.DEBUG === 'true' ? error.message : undefined
      });
    }
  }

  static async getClientById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({ error: "ID inválido. O ID deve ser um número positivo." });
      }

      const client = await Client.findByPk(id);
      if (!client) {
        return res.status(404).json({ error: `Não foi possível encontrar o cliente com o ID: ${id}` });
      }

      res.status(200).json(client);
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar cliente.",
        error: process.env.DEBUG === 'true' ? error.message : undefined
      });
    }
  }

  static async updateClient(req, res) {
    try {
      const { id } = req.params;

      const client = await Client.findByPk(id);
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado." });
      }

      const updates = {};
      const allowedFields = ['name', 'lastName', 'phone', 'email', 'birthDate', 'address'];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "Nenhum campo válido para atualizar." });
      }

      await client.update(updates);

      return res.status(200).json(client);

    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao atualizar cliente.",
        error: process.env.DEBUG === 'true' ? error.message : undefined
      });
    }
  }

  static async deleteClient(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({ error: "ID inválido. O ID deve ser um número positivo." });
      }

      const client = await Client.findByPk(id);
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado." });
      }

      await client.destroy();

      return res.status(200).json({ message: "Cliente excluído com sucesso." });

    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao eliminar cliente.",
        error: process.env.DEBUG === 'true' ? error.message : undefined
      });
    }
  }

  static async listClients(req, res) {
    try {
      let { page = 1, limit = 10, search } = req.query;

      if (isNaN(page) || page < 1) {
        return res.status(400).json({ error: "O parâmetro 'page' deve ser um número positivo." });
      }
      if (isNaN(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({ error: "O parâmetro 'limit' deve ser um número entre 1 e 100." });
      }

      page = Math.max(1, Number(page));
      limit = Math.min(Math.max(1, Number(limit)), 100);
      const offset = (page - 1) * limit;

      const where = search ? { name: { [Op.like]: `%${search}%` } } : {};

      const { count, rows: clients } = await Client.findAndCountAll({
        where,
        limit,
        offset,
        order: [['updatedAt', 'DESC']]
      });

      res.status(200).json({
        total: count,
        page,
        pages: Math.ceil(count / limit),
        clients
      });

    } catch (error) {
      console.error("Erro ao listar clientes:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao listar clientes.",
        error: process.env.DEBUG === 'true' ? error.message : undefined
      });
    }
  }

  static async listClientsSync(req, res) {
    try {
      const { lastSync } = req.query;
      const format = 'YYYY-MM-DD HH:mm:ss';

      if (lastSync && !dayjs(lastSync, format, true).isValid()) {
        return res.status(400).json({ error: `Formato inválido para lastSync. Use ${format}` });
      }

      const validatedLastSync = lastSync || '2000-01-01 00:00:00';

      const clients = await Client.findAll({
        where: { updatedAt: { [Op.gt]: validatedLastSync } },
        order: [['updatedAt', 'DESC']],
        limit: 1000,
      });

      res.status(200).json(clients);
    } catch (error) {
      console.error("Erro ao listar clientes:", {
        message: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: "Erro interno ao listar clientes." });
    }
  }


  static async listClientsByName(req, res) {
    try {
      const { name } = req.query;
      if (!name) {
        return res.status(400).json({ error: "Nome não fornecido." });
      }

      const clients = await Client.findAll({
        where: {
          name: { [Op.like]: `%${name}%` } // 🔹 Busca parcial
        }
      });

      if (clients.length === 0) {
        return res.status(404).json({ error: "Nenhum cliente encontrado com esse nome." });
      }

      res.status(200).json(clients);
    } catch (error) {
      console.error("Erro ao buscar clientes por nome:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar clientes por nome.",
        error: process.env.DEBUG === 'true' ? error.message : undefined
      });
    }
  }


  static async listClientsByLastName(req, res) {
    try {
      const { lastName } = req.query;
      if (!lastName) {
        return res.status(400).json({ error: "Sobrenome não fornecido." });
      }

      const clients = await Client.findAll({
        where: {
          lastName: { [Op.like]: `%${lastName}%` }
        }
      });

      if (clients.length === 0) {
        return res.status(404).json({ error: "Nenhum cliente encontrado com esse sobrenome." });
      }

      res.status(200).json(clients);
    } catch (error) {
      console.error("Erro ao buscar clientes por sobrenome:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar clientes por sobrenome.",
        error: process.env.DEBUG === 'true' ? error.message : undefined
      });
    }
  }

  static async listClientsByPhone(req, res) {
    try {
      const { phone } = req.query;

      if (!phone) {
        return res.status(400).json({ error: "Telefone não fornecido." });
      }

      const validNumber = isValidPhoneNumber(phone);
      if (!validNumber.isValid) {
        return res.status(400).json({ error: "Número de telefone inválido." });
      }

      const clients = await Client.findAll({ where: { phone: validNumber.formatted } });

      if (clients.length === 0) {
        return res.status(404).json({ message: "Nenhum cliente encontrado com o telefone fornecido." });
      }

      return res.status(200).json(clients);
    } catch (error) {
      console.error("Erro ao buscar clientes por telefone:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar clientes por telefone.",
        error: process.env.DEBUG === 'true' ? error.message : undefined
      });
    }
  }


}

export default ClientController;


