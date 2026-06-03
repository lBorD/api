import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const CalendarConnection = sequelize.define('CalendarConnection', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  calendarId: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'primary',
  },
  accessTokenEncrypted: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  refreshTokenEncrypted: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  accessTokenExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  scope: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastSyncStatus: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastSyncError: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'calendar_connections',
  timestamps: true,
});

export default CalendarConnection;
