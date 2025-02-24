import express from 'express';
import sequelize from './src/config/db.js';
import loginController from './src/controllers/login.js';
import User from './src/models/User.js';

const app = express();
app.use(express.json());

// Testar a conexão com o banco de dados
sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

// Sincronizar os modelos com o banco de dados
sequelize.sync()
  .then(() => {
    console.log('Database synchronized');
  })
  .catch(err => {
    console.error('Error synchronizing the database:', err);
  });

// Rotas
app.get('/users', async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).send(`Error fetching users: ${err.message}`);
  }
});

app.post('/users', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const user = await User.create({ username, email, password });
    res.json(user);
  } catch (err) {
    console.error('Error adding user:', err);
    res.status(500).send(`Error adding user: ${err.message}`);
  }
});

// Usar o roteador de login
app.use('/api', loginController);

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});