import { Op } from 'sequelize';
import Service from '../models/Service.js';

class ServiceController {
  static async registerService(req, res) {
    try {
      const { name, price, estimatedTime, cost = 0 } = req.body;

      await Service.create({
        name: String(name).trim(),
        price,
        estimatedTime,
        cost,
      });

      return res.status(201).json({ success: true });
    } catch (error) {
      console.error("Erro ao registrar serviço:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao registrar serviço.",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  static async listServices(req, res) {
    try {
      let { page = 1, limit = 10, active = true, search = '' } = req.query;

      if (Number.isNaN(Number(page)) || Number(page) < 1) {
        return res.status(400).json({ error: "O parâmetro 'page' deve ser um número positivo." });
      }

      if (Number.isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100) {
        return res.status(400).json({ error: "O parâmetro 'limit' deve ser um número entre 1 e 100." });
      }

      const normalizedActive = String(active).toLowerCase();
      if (!['true', 'false'].includes(normalizedActive)) {
        return res.status(400).json({ error: "O parâmetro 'active' deve ser true ou false." });
      }

      page = Math.max(1, Number(page));
      limit = Math.min(Math.max(1, Number(limit)), 100);
      const offset = (page - 1) * limit;

      const where = {
        active: normalizedActive === 'true',
      };

      if (search?.trim()) {
        where.name = { [Op.like]: `%${search}%` };
      }

      const { count, rows: services } = await Service.findAndCountAll({
        where,
        limit,
        offset,
        order: [['updatedAt', 'DESC']],
      });

      return res.status(200).json({
        total: count,
        page,
        pages: Math.ceil(count / limit),
        services,
      });
    } catch (error) {
      console.error("Erro ao listar serviços:", error);
      return res.status(500).json({ error: "Erro ao listar serviços." });
    }
  }

  static async listActiveServices(req, res) {
    try {
      const services = await Service.findAll({
        where: { active: true },
        order: [['updatedAt', 'DESC']],
      });

      return res.status(200).json(services);
    } catch (error) {
      console.error("Erro ao listar serviços ativos:", error);
      return res.status(500).json({ error: "Erro ao listar serviços ativos." });
    }
  }
}

export default ServiceController;
