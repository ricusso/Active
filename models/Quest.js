const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Quest = sequelize.define('Quest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  difficulty: {
    type: DataTypes.ENUM('easy', 'mid', 'hard'),
    defaultValue: 'mid',
  },
  reward_xp: {
    type: DataTypes.INTEGER,
    defaultValue: 450,
  },
  duration_days: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
  },
  price: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  creator_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  creator_type: {
    type: DataTypes.ENUM('expert', 'user'),
    defaultValue: 'user',
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'Спорт',
  },
});

module.exports = Quest;
