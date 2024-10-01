// models/user.js
const { DataTypes } = require('sequelize');
const { sequelizeMySQL } = require('../config/config'); // Adjust the path as necessary

const User = sequelizeMySQL.define('PolitiksApp_user_data_tb', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  profile_image: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  date_of_birth: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  gender: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE(6),
    allowNull: false,
    field: 'created_at', // maps to 'created_at' in the database
  },
  updated_at: {
    type: DataTypes.DATE(6),
    allowNull: false,
    field: 'updated_at', // maps to 'updated_at' in the database
  },
  user_role_id_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  login_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  user_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  request_as_leader: {
    type: DataTypes.TINYINT,
    allowNull: false,
  },
  verified: {
    type: DataTypes.TINYINT,
    allowNull: false,
  },
  otp: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  verification_status: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  active: {
    type: DataTypes.TINYINT,
    allowNull: false,
  },
  email_verified: {
    type: DataTypes.TINYINT,
    allowNull: false,
  },
  banner_image: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  party_id_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  register_complete: {
    type: DataTypes.TINYINT,
    allowNull: false,
  },
  is_private_account: {
    type: DataTypes.TINYINT,
    allowNull: false,
  },
  device_token: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  hide_party: {
    type: DataTypes.TINYINT,
    allowNull: false,
  },
  live_end_time: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  live_start_time: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  story_end_time: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  story_start_time: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  call_channel_name: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  call_token: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  voip_token: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'PolitiksApp_user_data_tb',
  timestamps: false, // Set to false if you are not using Sequelize's automatic timestamps
});

module.exports = User;
