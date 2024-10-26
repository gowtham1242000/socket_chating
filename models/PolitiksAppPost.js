// models/PolitiksAppPost.js
const { DataTypes } = require('sequelize');
const { sequelizeMySQL } = require('../config/config'); // Adjust the path as necessary

const PolitiksAppPost = sequelizeMySQL.define('PolitiksApp_post_data_tb', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING(100), // varchar(100)
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT, // longtext
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE(6), // datetime(6)
    allowNull: false,
    field: 'created_at', // maps to created_at column in MySQL
  },
  updatedAt: {
    type: DataTypes.DATE(6), // datetime(6)
    allowNull: false,
    field: 'updated_at', // maps to updated_at column in MySQL
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'user_id_id', // maps to user_id_id column in MySQL
    references: {
      model: 'PolitiksApp_user_data_tb', // Assuming you have a User model
      key: 'id',
    },
  },
  location: {
    type: DataTypes.TEXT, // longtext
    allowNull: true,
  },
  postType: {
    type: DataTypes.STRING(100), // varchar(100)
    allowNull: true,
    field: 'post_type', // maps to post_type column in MySQL
  },
  isRepost: {
    type: DataTypes.BOOLEAN, // tinyint(1)
    allowNull: false,
    field: 'is_repost', // maps to is_repost column in MySQL
  },
  postId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'post_id_id', // maps to post_id_id column in MySQL
  },
  entryType: {
    type: DataTypes.STRING(100), // varchar(100)
    allowNull: true,
    field: 'entry_type', // maps to entry_type column in MySQL
  },
  campaignEndDate: {
    type: DataTypes.STRING(100), // varchar(100)
    allowNull: true,
    field: 'campaign_end_date', // maps to campaign_end_date column in MySQL
  },
  campaignGoal: {
    type: DataTypes.TEXT, // longtext
    allowNull: true,
    field: 'campaign_goal', // maps to campaign_goal column in MySQL
  },
  campaignStartDate: {
    type: DataTypes.STRING(100), // varchar(100)
    allowNull: true,
    field: 'campaign_start_date', // maps to campaign_start_date column in MySQL
  },
  campaignCategoryId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'campaign_category_id_id', // maps to campaign_category_id_id column in MySQL
  },
  minimumFund: {
    type: DataTypes.TEXT, // longtext
    allowNull: true,
    field: 'minimum_fund', // maps to minimum_fund column in MySQL
  },
  channelId: {
    type: DataTypes.TEXT, // longtext
    allowNull: true,
    field: 'channel_id', // maps to channel_id column in MySQL
  },
  isReplyPost: {
    type: DataTypes.BOOLEAN, // tinyint(1)
    allowNull: false,
    field: 'is_reply_post', // maps to is_reply_post column in MySQL
  },
  token: {
    type: DataTypes.TEXT, // longtext
    allowNull: true,
  },
  liveEndTime: {
    type: DataTypes.STRING(100), // varchar(100)
    allowNull: true,
    field: 'live_end_time', // maps to live_end_time column in MySQL
  },
  status: {
    type: DataTypes.STRING(100), // varchar(100)
    allowNull: true,
  },
  liveStartTime: {
    type: DataTypes.STRING(100), // varchar(100)
    allowNull: true,
    field: 'live_start_time', // maps to live_start_time column in MySQL
  },
  storyEndTime: {
    type: DataTypes.STRING(100), // varchar(100)
    allowNull: true,
    field: 'story_end_time', // maps to story_end_time column in MySQL
  },
  storyStartTime: {
    type: DataTypes.STRING(100), // varchar(100)
    allowNull: true,
    field: 'story_start_time', // maps to story_start_time column in MySQL
  },
  active: {
    type: DataTypes.BOOLEAN, // tinyint(1)
    allowNull: false,
  },
}, {
  tableName: 'PolitiksApp_post_data_tb', // Specify the actual table name in the database
  timestamps: true, // Automatically handle createdAt and updatedAt
  underscored: true, // Automatically convert camelCase fields to snake_case
});

// Export the model
module.exports = PolitiksAppPost;
