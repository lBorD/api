import User from '../models/User.js';
import { ROLE_STAFF, getDisplayName } from '../utils/account.js';

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sem baixar a caixa: o login compara o e-mail exatamente como foi gravado.
const normalizeEmail = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeName = (value) => (typeof value === 'string' ? value.trim() : '');

const isValidPassword = (value) => typeof value === 'string' && value.length >= MIN_PASSWORD_LENGTH;

const toMemberPayload = (member) => ({
  id: member.id,
  name: getDisplayName(member),
  email: member.email,
  active: Boolean(member.active),
  createdAt: member.createdAt ? new Date(member.createdAt).toISOString() : null,
});

const findMember = (ownerId, id) => User.findOne({
  where: { id, accountOwnerId: ownerId, role: ROLE_STAFF },
});

class TeamController {
  static async listMembers(req, res) {
    try {
      const members = await User.findAll({
        where: { accountOwnerId: req.user.id, role: ROLE_STAFF },
        order: [['createdAt', 'ASC']],
      });

      return res.status(200).json(members.map(toMemberPayload));
    } catch (error) {
      console.error('Erro ao listar equipe:', error);
      return res.status(500).json({ error: 'Erro ao listar a equipe.' });
    }
  }

  static async createMember(req, res) {
    try {
      const name = normalizeName(req.body.name);
      const email = normalizeEmail(req.body.email);
      const { password } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Informe o nome.' });
      }

      if (!EMAIL_PATTERN.test(email)) {
        return res.status(400).json({ error: 'E-mail inválido.' });
      }

      if (!isValidPassword(password)) {
        return res.status(400).json({ error: `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.` });
      }

      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'Este e-mail já está em uso.' });
      }

      // `username` e unico e obrigatorio no model; o e-mail ja garante as duas coisas.
      const member = await User.create({
        username: email,
        email,
        password,
        name,
        role: ROLE_STAFF,
        accountOwnerId: req.user.id,
        active: true,
      });

      return res.status(201).json(toMemberPayload(member));
    } catch (error) {
      console.error('Erro ao cadastrar membro da equipe:', error);
      return res.status(500).json({ error: 'Erro ao cadastrar a funcionária.' });
    }
  }

  static async updateMember(req, res) {
    try {
      const member = await findMember(req.user.id, req.params.id);
      if (!member) {
        return res.status(404).json({ error: 'Funcionária não encontrada.' });
      }

      const changes = {};

      if (req.body.name !== undefined) {
        const name = normalizeName(req.body.name);
        if (!name) {
          return res.status(400).json({ error: 'Informe o nome.' });
        }
        changes.name = name;
      }

      if (req.body.active !== undefined) {
        if (typeof req.body.active !== 'boolean') {
          return res.status(400).json({ error: 'active deve ser verdadeiro ou falso.' });
        }
        changes.active = req.body.active;
      }

      if (req.body.password !== undefined) {
        if (!isValidPassword(req.body.password)) {
          return res.status(400).json({ error: `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.` });
        }
        changes.password = req.body.password;
      }

      // Update pela instancia para o hook `beforeUpdate` gerar o hash da senha nova.
      await member.update(changes);

      return res.status(200).json(toMemberPayload(member));
    } catch (error) {
      console.error('Erro ao atualizar membro da equipe:', error);
      return res.status(500).json({ error: 'Erro ao atualizar a funcionária.' });
    }
  }
}

export default TeamController;
