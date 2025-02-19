import express from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User.js';

const loginController = express.Router();

// Login Controller
loginController.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check if password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    res.json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default loginController;