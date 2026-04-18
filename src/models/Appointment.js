import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  serviceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  startAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  depositAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'scheduled',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  source: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'app',
  },
  googleEventId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  googleSyncStatus: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending',
  },
  lastSyncedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  syncError: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'appointments',
  timestamps: true,
});

export default Appointment;

