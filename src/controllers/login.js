import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '12h' });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  
  console.log('=== LOGIN ATTEMPT ===');
  console.log('Email recebido:', email);
  console.log('Password recebido:', password ? '[HIDDEN]' : 'undefined');

  try {
    // Validação básica
    if (!email || !password) {
      console.log('Erro: Email ou senha não fornecidos');
      return res.status(400).json({ 
        message: 'Email e senha são obrigatórios.' 
      });
    }

    console.log('Buscando usuário no banco...');
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log('Usuário não encontrado para o email:', email);
      return res.status(400).json({ 
        message: 'Email não encontrado em nossa base de dados.' 
      });
    }

    console.log('Usuário encontrado, verificando senha...');
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log('Senha incorreta para o usuário:', email);
      return res.status(400).json({ 
        message: 'Senha incorreta.' 
      });
    }

    console.log('Senha correta, gerando token...');
    const token = generateToken(user.id);

    console.log('Login bem-sucedido para:', email);
    res.json({
      token,
      success: true,
    });
  } catch (error) {
    console.error('Erro no login:', {
      message: error.message,
      stack: error.stack,
      email: email
    });
    
    res.status(500).json({ 
      message: 'Erro no servidor durante o login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
    });
  }
};

export default login;
