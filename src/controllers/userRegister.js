//Não foi testado, mas pode funcionar..

const { User } = require('../models');

const userRegister = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    router.get('/users', async (req, res) => {
      try {
        const users = await User.findAll();
        res.json(users);
      } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send(`Error fetching users: ${err.message}`);
      }
    });

    router.post('/users', async (req, res) => {
      try {
        const user = await User.create({ username, email, password });
        res.json(user);
      } catch (err) {
        console.error('Error adding user:', err);
        res.status(500).send(`Error adding user: ${err.message}`);
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register user' });
  }
};

module.exports = { userRegister };