import express from 'express';
import sequelize from './src/config/db.js';
import { authRoutes, clientRoutes } from './src/routes/index.js';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

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
app.use('/auth', authRoutes);
app.use('/clients', clientRoutes);

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});