import express from 'express';
import db from './db.js';

const app = express();
app.use(express.json());

app.get('/users', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM users');
    res.json(results);
  } catch (err) {
    res.status(500).send('Error fetching users');
  }
});

app.post('/users', async (req, res) => {
  const { name, email, is_active } = req.body;
  try {
    const [result] = await db.query('INSERT INTO users (name, email, senha,  ativo) VALUES (?, ?, ?, ?)', [name, email, senha, ativo]);
    res.json({ id: result.insertId, name, email, ativo });
  } catch (err) {
    res.status(500).send('Error adding user');
  }
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});