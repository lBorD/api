import 'dotenv/config';
import express from 'express';
import sequelize from './src/config/db.js';
import { authRoutes, clientRoutes, userRoutes } from './src/routes/index.js';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

sequelize.authenticate()
  .then(() => {
    console.log('==== Conectado com o banco de dados!  ==== ');
  })
  .catch(err => {
    console.error('==== Não foi possível conectar com o banco de dados!  ==== ', err);
  });

sequelize.sync()
  .then(() => {
    console.log('==== Banco de dados sincronizado com sucesso! ==== ');
  })
  .catch(err => {
    console.error('==== Não foi possível sincronizar com o banco de dados!', err);
  });

app.use('/auth', authRoutes);
app.use('/clients', clientRoutes);
app.use('/users', userRoutes);

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});