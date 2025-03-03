import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Client = sequelize.define("Client", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

export default Client;