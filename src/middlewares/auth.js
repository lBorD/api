import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isStaff, normalizeTokenUser } from '../utils/account.js';

// Funcionaria desativada perde o acesso na hora, sem esperar o token expirar.
// So o token de funcionaria consulta o banco; o da dona segue sem custo extra.
const isActiveStaff = async (tokenUser) => {
  const staff = await User.findOne({
    where: {
      id: tokenUser.actorId,
      accountOwnerId: tokenUser.id,
      active: true,
    },
  });

  return Boolean(staff);
};

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido, faça login novamente.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido ou expirado, faça login novamente.' });
    }

    const user = normalizeTokenUser(payload);

    if (isStaff(user)) {
      try {
        if (!(await isActiveStaff(user))) {
          return res.status(403).json({ message: 'Token inválido ou expirado, faça login novamente.' });
        }
      } catch (error) {
        console.error('Erro ao validar acesso da funcionária:', error);
        return res.status(500).json({ message: 'Erro ao validar acesso.' });
      }
    }

    req.user = user;
    return next();
  });
};

export const requireOwner = (req, res, next) => {
  if (isStaff(req.user)) {
    return res.status(403).json({ message: 'Somente a responsável pela conta pode fazer isso.' });
  }

  return next();
};
