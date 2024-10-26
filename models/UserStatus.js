const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/config');

const UserStatus = sequelizePostgres.define('UserStatus', {
  userId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  status: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: 'false',  // Default status
  },
}, {
  tableName: 'user_statuses',
  timestamps: false,
});

module.exports = UserStatus;
