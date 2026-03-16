require('dotenv').config();
const { Sequelize } = require('sequelize');

const dbUrl = 'postgres://postgres:postgres@127.0.0.1:5432/aktiv_db';

console.log('Подключаемся напрямую к:', dbUrl.replace(':postgres@', ':****@'));

const sequelize = new Sequelize(dbUrl, {
  logging: false,
  dialect: 'postgres',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

module.exports = sequelize;
