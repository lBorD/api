import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import bcrypt from 'bcrypt';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  timestamps: true,
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const rounds = parseInt(process.env.SALT_ROUNDS, 10);
        const hash = await bcrypt.hash(user.password, rounds);
        user.password = hash;
      }
    },
    beforeUpdate: async (user) => {
      if (user.password && user.changed('password')) {
        const hash = await bcrypt.hash(user.password, process.env.SALT_ROUNDS);
        user.password = hash;
      }
    }
  }
});
export default User;