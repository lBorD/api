import express from 'express';
import User from '../models/User.js';
import loginController from '../controllers/login.js';

const router = express.Router();

router.use(express.json());
router.post('/login', loginController);

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
  const { username, email, password } = req.body;
  try {
    const user = await User.create({ username, email, password });
    res.json(user);
  } catch (err) {
    console.error('Error adding user:', err);
    res.status(500).send(`Error adding user: ${err.message}`);
  }
});

export default router;