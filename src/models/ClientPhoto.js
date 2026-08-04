import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ClientPhoto = sequelize.define('ClientPhoto', {
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
    unique: true,
  },
  data: {
    type: DataTypes.BLOB,
    allowNull: false,
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  byteSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  checksum: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  width: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'client_photos',
  timestamps: true,
});

export default ClientPhoto;
