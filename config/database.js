require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || {
  dialect: 'sqlite',
  storage: './aktiv.sqlite',
  logging: false
}, {
  logging: false
});

module.exports = sequelize;
