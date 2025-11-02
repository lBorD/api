import User from '../models/User.js';

class UserController {
  static async registerUser(req, res) {
    const { username, email, password } = req.body;
    
    try {
      const user = await User.create({ username, email, password });
      return res.status(201).json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      return res.status(500).json({
        success: false,
        message: "Erro ao registrar usuário.",
        error: process.env.DEBUG === 'true' ? error.message : undefined
      });
    }
  }
};

export default UserController;