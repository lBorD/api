import User from '../models/User.js';

class UserController {
  static async registerUser(req, res) {
    const { username, email, password } = req.body;
    try {
      const user = await User.create({ username, email, password });
      res.json(user);
    } catch (err) {
      console.error('Não foi possível adicionar o usuário: ', err);
      res.status(500).send(`Não foi possível adicionar o usuário:  ${err.message}`);
    }
  }
};

export default UserController;