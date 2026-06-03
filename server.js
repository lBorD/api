import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sequelize from './src/config/db.js';
import {
  authRoutes,
  clientRoutes,
  serviceRoutes,
  appointmentRoutes,
  googleCalendarIntegrationRoutes,
  userRoutes,
} from './src/routes/index.js';

const app = express();
app.use(express.json());
app.use(cors());

sequelize.authenticate()
  .then(() => {
    console.log('==== Conectado com o banco de dados!  ==== ');
  })
  .catch((err) => {
    console.error('==== Não foi possível conectar com o banco de dados!  ==== ', err);
  });

sequelize.sync()
  .then(() => {
    console.log('==== Banco de dados sincronizado com sucesso! ==== ');
  })
  .catch((err) => {
    console.error('==== Não foi possível sincronizar com o banco de dados!', err);
  });

app.use('/auth', authRoutes);
app.use('/clients', clientRoutes);
app.use('/services', serviceRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/integrations/google-calendar', googleCalendarIntegrationRoutes);
app.use('/users', userRoutes);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
