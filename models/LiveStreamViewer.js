const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/config');

const LiveStreamViewer = sequelizePostgres.define('LiveStreamViewer', {
   id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  liveStreamId: {
    type: DataTypes.STRING,  // Corresponds to VARCHAR(255)
    allowNull: false,
    field: 'live_stream_id',  // Maps to the column in the database
  },
  userId: {
    type: DataTypes.STRING,  // Corresponds to VARCHAR(255)
    allowNull: false,
    field: 'user_id',  // Maps to the column in the database
  },
  liveViewUserId: {
    type: DataTypes.STRING,  // Corresponds to VARCHAR(255)
    allowNull: false,
    field: 'live_view_user_id',  // Maps to the column in the database
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,  // Default CURRENT_TIMESTAMP
    field: 'created_at',  // Maps to the column in the database
  }
}, {
  tableName: 'live_stream_viewers',  // Table name in the database
  timestamps: false,  // Disable automatic timestamp fields (createdAt/updatedAt)
});

module.exports = LiveStreamViewer;
