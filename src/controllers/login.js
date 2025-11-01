import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '12h' });
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

    const token = generateToken(user.id);

    res.json({
      token,
      success: true,
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({
      success: false,
      message: "Erro no servidor.",
      error: process.env.DEBUG === 'true' ? error.message : undefined
    });
  }
};

export default login;
