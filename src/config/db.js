import dotenv from 'dotenv';
dotenv.config();

import { Sequelize } from 'sequelize';

const isProduction = process.env.NODE_ENV === 'production';

const options = {
  host: process.env.DB_HOST,
  dialect: process.env.DB_DIALECT || 'postgres',
};

if (isProduction) {
  options.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  };
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  options
);

export default sequelize;