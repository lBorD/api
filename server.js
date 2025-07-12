import 'dotenv/config';
import express from 'express';
import sequelize from './src/config/db.js';
import { authRoutes, clientRoutes, userRoutes } from './src/routes/index.js';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

// Middleware para log de requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

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

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro capturado pelo middleware global:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });
  
  res.status(500).json({ 
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  console.log(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Rota não encontrada' });
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});