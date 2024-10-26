// models/LiveStreamUser.js

const { DataTypes } = require('sequelize');
const {sequelizePostgres} = require('../config/config');


//const ChatMessage = sequelizePostgres.define('ChatMessage', {



const LiveStreamUser = sequelizePostgres.define('LiveStreamUser', {
    live_stream_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
/*        references: {
            model: 'LiveStreams', // Assumes a 'LiveStreams' table exists for the stream details
            key: 'id',
        },*/
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
 /*       references: {
            model: 'Users', // Assumes a 'Users' table exists for user details
            key: 'id',
        },*/
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    user_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    profile_image: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true, // true when user joins, false when user leaves
    },
    own_live: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'live_stream_users',
    timestamps: false, // Disable automatic timestamp fields (createdAt, updatedAt)
});

module.exports = LiveStreamUser;
