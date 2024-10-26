const EventEmitter = require('events');
const LiveStreamUser = require('./models/LiveStreamUser');
const user = require('./models/Users');
const fs = require('fs');
const path = require('path');

async function getUserDetails(userId) {
    try {
        // Fetch user details from the database using Sequelize
        const User = await user.findOne({
            where: { id: userId },
            attributes: ['id', 'user_name', 'profile_image'],
        });

        if (!User) {
            console.error(`User not found for ID: ${userId}`);
            return null;
        }

        return {
            userId: User.id,
            user_name: User.user_name,
            profile_image: User.profile_image,
        };
    } catch (error) {
        console.error(`Error fetching user details for ID: ${userId}`, error);
        return null;
    }
}

class LiveStreamEvents extends EventEmitter {
    constructor(io) {
        super();
        this.io = io;

        // Listen to events
        this.on('joinStream', this.handleJoinLiveStream.bind(this));
        this.on('leaveStream', this.handleLeaveLiveStream.bind(this));
        this.on('liveStreamCommand', this.handleLiveStreamCommand.bind(this));

        // Store socket-user mapping for each stream
        this.streamUsers = {}; // { liveStreamId: { userId: socketId } }
        this.userSockets = {}; // { userId: socketInstance }
    }

    async handleJoinLiveStream({ liveStreamId, userId, ownLive, socket }) {
        console.log("handleJoinLiveStream--------", liveStreamId, userId, ownLive, socket);
        try {
            const userDetails = await getUserDetails(userId);
            if (!userDetails) {
                return socket.emit('error', { message: 'User not found' });
            }

            // Track user in the stream room and store their socket instance
            if (!this.streamUsers[liveStreamId]) {
                this.streamUsers[liveStreamId] = {};
            }
            this.streamUsers[liveStreamId][userId] = socket.id;
            this.userSockets[userId] = socket;

            // Check if the user already exists in the live_stream_users table for this stream
            const existingUser = await LiveStreamUser.findOne({
                where: { live_stream_id: liveStreamId, user_id: userId }
            });

            if (!existingUser) {
                // Add new entry for user joining the stream
                await LiveStreamUser.create({
                    live_stream_id: liveStreamId,
                    user_id: userId,
                    user_name: userDetails.user_name,
                    profile_image: userDetails.profile_image,
                    status: true,
                    own_live: ownLive,
                    timestamp: new Date()
                });
            } else {
                // Update existing user's status to true
                await LiveStreamUser.update(
                    { status: true, own_live: ownLive, timestamp: new Date() },
                    { where: { live_stream_id: liveStreamId, user_id: userId } }
                );
            }

            // Join the live stream room
            socket.join(`liveStream_${liveStreamId}`);
            this.emitStreamData(liveStreamId, userId, socket);
            this.broadcastUpdate(liveStreamId);

        } catch (error) {
            console.error('Error handling live stream join:', error);
            socket.emit('error', { message: 'Error updating live stream data' });
        }
    }


async handleLeaveLiveStream({ liveStreamId, userId, socket, ownLive }) {
console.log("------------------entering the user leve channel--------------")
    try {
        // Update the leaving user's status to false in the live_stream_users table
        await LiveStreamUser.update(
            { status: false, timestamp: new Date() },
            { where: { live_stream_id: liveStreamId, user_id: userId } }
        );

        // Leave the live stream room
        socket.leave(`liveStream_${liveStreamId}`);

        // Check if the leaving user is the owner
        if (ownLive) {
            // Disconnect all users associated with this liveStreamId
            for (const [currentUserId, socketId] of Object.entries(this.streamUsers[liveStreamId] || {})) {
                const userSocket = this.userSockets[currentUserId];
                if (userSocket) {
                    userSocket.emit('userDisconnected', { message: 'The stream has ended.' });
                    userSocket.disconnect();
                }
            }

            // Clean up our tracking objects
            delete this.streamUsers[liveStreamId];

            // Remove all entries with this liveStreamId from the database
            await LiveStreamUser.destroy({
                where: { live_stream_id: liveStreamId }
            });
        } else {
            // For non-owners, just remove the user from the streamUsers tracking
            if (this.streamUsers[liveStreamId]) {
                delete this.streamUsers[liveStreamId][userId];
                if (Object.keys(this.streamUsers[liveStreamId]).length === 0) {
                    delete this.streamUsers[liveStreamId];
                }
            }
        }

        // Notify remaining users in the stream room that a user has left
        const userDetails = await getUserDetails(userId);
        this.io.to(`liveStream_${liveStreamId}`).emit('userLeft', {
            userId,
            userName: userDetails.user_name,
            profileImage: userDetails.profile_image
        });

        // Broadcast update of active users to the remaining users
        this.broadcastUpdate(liveStreamId);

    } catch (error) {
        console.error('Error handling live stream leave:', error);
        socket.emit('error', { message: 'Error updating live stream data' });
    }
}

async handleLiveStreamCommand({ liveStreamId, userId, command }) {
    const commandFilePath = path.join('/etc/ec/data/liveCommand', `${liveStreamId}.json`);

    try {
        let commandsList = [];
        if (fs.existsSync(commandFilePath)) {
            const fileContent = fs.readFileSync(commandFilePath, 'utf8');
            try {
                commandsList = JSON.parse(fileContent);
            } catch (parseError) {
                console.error('Error parsing JSON:', parseError);
                return;
            }
        }

        const userDetails = await getUserDetails(userId);
        if (!userDetails) {
            console.error('User not found for userId:', userId);
            return;
        }

        const commandObject = {
            userId: userDetails.userId,
            userName: userDetails.user_name,
            profileImage: userDetails.profile_image,
            command,
            timestamp: new Date().toISOString(),
        };

        commandsList.push(commandObject);
        fs.writeFileSync(commandFilePath, JSON.stringify(commandsList, null, 2));

        const activeUsers = await LiveStreamUser.findAll({
            where: { live_stream_id: liveStreamId, status: true },
            attributes: ['user_id'],
        });

        const userDetailsPromises = activeUsers.map(async (user) => {
            const userDetails = await getUserDetails(user.user_id);
            return userDetails ? {
                userId: userDetails.userId,
                userName: userDetails.user_name,
                profileImage: userDetails.profile_image,
            } : null;
        });

        const userDetailsList = await Promise.all(userDetailsPromises);
        console.log("Commands List:", commandsList);

        // Emit all commands to active users
        userDetailsList.forEach((userDetails) => {
            if (userDetails) {
                this.io.to(this.userSockets[userDetails.userId]?.id).emit('newCommand', {
                    liveStreamId,
                    commands: commandsList, // Emit the entire list of commands
                });
            }
        });
    } catch (error) {
        console.error('Error handling live stream command:', error);
    }
}
    async broadcastUpdate(liveStreamId) {
        const liveJoinedList = await LiveStreamUser.findAll({
            where: { live_stream_id: liveStreamId, status: true }
        });
        this.io.to(`liveStream_${liveStreamId}`).emit('liveStreamUpdate', { liveJoinedList });
    }

    emitStreamData(liveStreamId, userId, socket) {
        // Placeholder function to emit streaming data if needed
        socket.emit('streamData', { liveStreamId, userId, data: 'Streaming data...' });
    }
}

module.exports = LiveStreamEvents;
