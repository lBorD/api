import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { buildTokenPayload, getDisplayName, isStaff } from '../utils/account.js';

const generateToken = (user) => {
  return jwt.sign(buildTokenPayload(user), process.env.JWT_SECRET, { expiresIn: '12h' });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Email não encontrado em nossa base de dados.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Senha incorreta.' });
    }

    if (isStaff(user) && !user.active) {
      return res.status(403).json({ message: 'Acesso desativado. Fale com a responsável pela conta.' });
    }

    const token = generateToken(user);
    const { role } = buildTokenPayload(user);

    res.json({
      token,
      success: true,
      user: {
        id: user.id,
        name: getDisplayName(user),
        email: user.email,
        role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor', error });
  }
};

export default login;
