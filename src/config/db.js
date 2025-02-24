import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('beautyapp', 'root', '123', {
  host: 'localhost',
  dialect: 'mysql',
});

export default sequelize;