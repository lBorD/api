import Service from '../models/Service.js';
import { Op } from 'sequelize';

class ServiceController {
  static async createService(req, res) {
    try {
      const { name, price, estimatedTime, cost } = req.body;

      if (!name || !price || !estimatedTime) {
        return res.status(400).json({
          error: "Campos obrigatórios: nome, preço e tempo estimado."
        });
      }

      const service = await Service.create({
        name,
        price: parseFloat(price),
        estimatedTime: parseInt(estimatedTime),
        cost: cost ? parseFloat(cost) : 0
      });

      return res.status(201).json({
        success: true,
        service
      });

    } catch (error) {
      console.error("Erro ao criar serviço:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao criar serviço.",
        error: process.env.DEBUG === 'true' ? error.message : undefined
      });
    }
  }

  static async listServices(req, res) {
    try {
      let { page, limit, search, active = true } = req.query;

      if (isNaN(page) || page < 1) {
        return res.status(400).json({ error: "O parâmetro 'page' deve ser um número positivo." });
      }
      if (isNaN(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({ error: "O parâmetro 'limit' deve ser um número entre 1 e 100." });
      }

      page = Math.max(1, Number(page));
      limit = Math.min(Math.max(1, Number(limit)), 100);
      const offset = (page - 1) * limit;

      const where = { isActive: active === 'true' };
      if (search) {
        where.name = { [Op.like]: `%${search}%` };
      }

      const { count, rows: services } = await Service.findAndCountAll({
        where,
        limit,
        offset,
        order: [['updatedAt', 'DESC']]
      });

      res.status(200).json({
        total: count,
        page,
        pages: Math.ceil(count / limit),
        services
      });

    } catch (error) {
      console.error("Erro ao listar serviços:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao listar serviços.",
        error: process.env.DEBUG === 'true' ? error.message : undefined
      });
    }
  }

  static async getServiceById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({ error: "ID inválido. O ID deve ser um número positivo." });
      }

      const service = await Service.findByPk(id);
      if (!service) {
        return res.status(404).json({ error: `Serviço não encontrado com o ID: ${id}` });
      }

      res.status(200).json(service);
    } catch (error) {
      console.error("Erro ao buscar serviço:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao buscar serviço.",
        error: process.env.DEBUG === 'true' ? error.message : undefined
      });
    }
  }

  static async updateService(req, res) {
    try {
      const { id } = req.params;
      const { name, price, estimatedTime, cost, isActive } = req.body;

      if (!id || isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({ error: "ID inválido." });
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (price !== undefined) updateData.price = parseFloat(price);
      if (estimatedTime !== undefined) updateData.estimatedTime = parseInt(estimatedTime);
      if (cost !== undefined) updateData.cost = parseFloat(cost);
      if (isActive !== undefined) updateData.isActive = isActive;

      const [updated] = await Service.update(updateData, { where: { id } });

      if (!updated) {
        return res.status(404).json({ error: "Serviço não encontrado." });
      }

      const updatedService = await Service.findByPk(id);
      return res.status(200).json(updatedService);

    } catch (error) {
      console.error("Erro ao atualizar serviço:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao atualizar serviço.",
        error: process.env.DEBUG === 'true' ? error.message : undefined
      });
    }
  }

  static async deleteService(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({ error: "ID inválido. O ID deve ser um número positivo." });
      }

      const service = await Service.findByPk(id);
      if (!service) {
        return res.status(404).json({ error: "Serviço não encontrado." });
      }

      await service.update({ isActive: false });

      return res.status(200).json({ message: "Serviço desativado com sucesso." });

    } catch (error) {
      console.error("Erro ao desativar serviço:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao desativar serviço.",
        error: process.env.DEBUG === 'true' ? error.message : undefined
      });
    }
  }

  static async listActiveServices(req, res) {
    try {
      const services = await Service.findAll({
        where: { isActive: true },
        order: [['name', 'ASC']]
      });

      res.status(200).json(services);
    } catch (error) {
      console.error("Erro ao listar serviços ativos:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao listar serviços ativos.",
        error: process.env.DEBUG === 'true' ? error.message : undefined
      });
    }
  }
}

export default ServiceController;