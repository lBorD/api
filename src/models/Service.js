import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Service = sequelize.define("Service", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0.01
    }
  },
  estimatedTime: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: true,
      min: 1
    }
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00,
    validate: {
      isDecimal: true,
      min: 0
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

export default Service;