const { DataTypes } = require('sequelize');
const {sequelizePostgres} = require('../config/config');

const ChatMessage = sequelizePostgres.define('ChatMessage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  from_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  to_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'chat_messages',
  timestamps: false
});

module.exports = ChatMessage;
