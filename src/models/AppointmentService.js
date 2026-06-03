import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const AppointmentService = sequelize.define('AppointmentService', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  appointmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  serviceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  serviceName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  estimatedTime: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'appointment_services',
  timestamps: true,
});

export default AppointmentService;
