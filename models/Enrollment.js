const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Enrollment = sequelize.define('Enrollment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  questId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'failed'),
    defaultValue: 'active',
  },
  progress_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  last_checkin: {
    type: DataTypes.DATE,
  },
  is_paid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = Enrollment;
