const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  role: { type: DataTypes.ENUM('user', 'expert', 'admin'), defaultValue: 'user' },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  avatar: { type: DataTypes.STRING },
  xp: { type: DataTypes.INTEGER, defaultValue: 0 },
  level: { type: DataTypes.INTEGER, defaultValue: 1 },
  balance: { type: DataTypes.FLOAT, defaultValue: 0.0 },
  bio: { type: DataTypes.TEXT },
  expert_sphere: { type: DataTypes.STRING },
  expert_rating: { type: DataTypes.FLOAT, defaultValue: 0.0 },
  verified: { type: DataTypes.BOOLEAN, defaultValue: false },
});

module.exports = User;
