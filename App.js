const express = require('express');
const app = express();
const server = require('http').createServer(app); // Create HTTP server using Express app
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const { Op } = require('sequelize');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const socketIo = require('socket.io');
const { sequelizePostgres, sequelizeMySQL } = require('./config/config');
const ChatMessage = require('./models/chatMessage');
const UserStatus  = require('./models/UserStatus')
const user =require('./models/Users');
const PolitiksAppPost = require('./models/PolitiksAppPost');
const LiveStreamViewer = require('./models/LiveStreamViewer');
const fs = require('fs');
const path = require('path');
const debounce = require('lodash/debounce');

const LiveStreamEvents = require('./liveStreamEvents');
const LiveStreamUser = require('./models/LiveStreamUser');

//const io = socketIo(server);
const liveStreamUsers = new Map();

const io = require('socket.io')(server, {
  cors: {
    origin: "*", // Adjust this to your frontend URL to allow specific origins
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});




const liveStreamEventsInstance = new LiveStreamEvents(io);

app.use((req, res, next) => {
  req.io = io; // Attach io instance to req
  next();
});

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

require('dotenv').config();

// Authenticate PostgreSQL
sequelizePostgres.authenticate()
  .then(() => console.log('PostgreSQL Database connected'))
  .catch(err => console.error('PostgreSQL Database connection error:', err));

// Authenticate MySQL
sequelizeMySQL.authenticate()
  .then(() => console.log('MySQL Database connected'))
  .catch(err => console.error('MySQL Database connection error:', err));


// Middleware
app.use(express.json());
app.use(session({
    secret: '9e880f4a-7dc5-11ec-b9b5-0200cd936042',
    resave: false,
    saveUninitialized: true
}));
app.use(bodyParser.json());
app.use(fileUpload());

// CORS configuration
const corsOptions = {
  origin: ['http://192.168.29.164:5173/', 'http://127.0.0.1:5174'], // Allow these local origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

//handleing command datas

const jsonDir = '/etc/ec/data/liveCommand';
if (!fs.existsSync(jsonDir)) {
  fs.mkdirSync(jsonDir, { recursive: true });
}

/*function getFilePath(liveStreamId) {
    return path.join(jsonDir, `${liveStreamId}.json`);
}*/
const getFilePath = (liveStreamId) => path.join(jsonDir, `${liveStreamId}.json`);

function readCommandsFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return null; // or return a default value
    }

    const fileData = fs.readFileSync(filePath, 'utf8');
    
    if (fileData.trim() === '') {
        console.error(`File is empty: ${filePath}`);
        return { commandList: [], liveJoinedList: [] }; // Return default structure for empty file
    }

    try {
        return JSON.parse(fileData);
    } catch (parseErr) {
        console.error(`Error parsing JSON from file: ${filePath}`, parseErr);
        return { commandList: [], liveJoinedList: [] }; // Return default structure on parsing error
    }
}

// This function emits the latest commands and joined list to connected clients
const emitLiveStreamData = (io, liveStreamId, commands) => {
  io.to(`liveStream_${liveStreamId}`).emit('joinLive_Stream', {
    liveJoinedList: commands.liveJoinedList,
    commandList: commands.commandList,
  });
};
//data for handleing command

async function getUserDetails(userId) {
    try {
        // Fetch user details from the database using Sequelize
        const User = await user.findOne({
            where: { id: userId }, // Assuming 'id' is the primary key in the User table
            attributes: ['id', 'user_name', 'profile_image'], // Select only needed fields
        });

        if (!User) {
            console.error(`User not found for ID: ${userId}`);
            return null; // User not found
        }

        return {
            userId: User.id, // Include the user ID in the response
            user_name: User.user_name,
            profile_image: User.profile_image,
        };
    } catch (error) {
        console.error(`Error fetching user details for ID: ${userId}`, error);
        return null; // Return null in case of error
    }
}




io.on('connection', (socket) => {
  console.log('New client connected', socket.id);


socket.on('connect', () => {
    const userId = getUserIdFromSocket(socket); // Replace with your method to get userId
    this.userSockets[userId] = socket; // Store the socket instance in userSockets
});

socket.on('getViewAndCommandList', (data) => {
        const { streamId, userId } = data;

        // Start emitting the stream.json data for the specified streamId
        emitStreamData(socket, streamId, userId);
    });

socket.on('joinStream', ({ liveStreamId, userId, ownLive }) => {
        liveStreamEventsInstance.emit('joinStream', { liveStreamId, userId, ownLive, socket });
    });

    socket.on('leaveStream', ({ liveStreamId, userId }) => {
       liveStreamEventsInstance.emit('leaveStream', { liveStreamId, userId, socket });
    });

 socket.on('liveStreamCommand', ({ liveStreamId, userId, command }) => {
       liveStreamEventsInstance.emit('liveStreamCommand', { liveStreamId, userId, command, socket });
    });
 
socket.on('newCommentNotification', (notification) => {
    console.log('Received new comment notification:', notification);
    io.emit('newCommentNotification', notification);
  });


socket.on('userStatus', (data) => {
    const { userId, status } = data;

    // Check if userId is present and status is either 'online' or 'offline'
    if (userId && (status === true || status === false)) {
        // Emit the user status (online/offline) to all connected clients
        io.emit('userStatus', { userId, status });

        // Update the user status in the database
//        updateUserStatusInDB(userId, status);
    } else {
        console.error('Invalid userStatus data:', data);
    }
});

socket.on('joinLiveStream', async ({ liveStreamId, userId, status, ownLive }) => {
    console.log('Live Stream ID:', liveStreamId);
    console.log('User ID:', userId);
    console.log('Status:', status);
    console.log('Own Live:', ownLive); // Log the ownLive status

    // Get the file path for the given live stream
    const filePath = getFilePath(liveStreamId);

    // Read existing commands or initialize new structure
    let commands = readCommandsFromFile(filePath) || {
        liveJoinedList: [],
        commandList: [],
    };

    // Get user details
    const userDetails = await getUserDetails(userId);

    // Check if the user exists
    if (!userDetails) {
        return socket.emit('error', { message: 'User not found' });
    }

    // If the status is true (user is joining), update the liveJoinedList
    if (status) {
        const existingUserIndex = commands.liveJoinedList.findIndex(user => user.userId === userId);

        if (existingUserIndex === -1) {
            // Add the user to the liveJoinedList
            commands.liveJoinedList.push({
                userId,
                userName: userDetails.user_name,
                profileImage: userDetails.profile_image,
                timestamp: new Date().toISOString(),
                status,
                ownLive // Store the ownLive value
            });
        } else {
            // Update the user's details in the list
            commands.liveJoinedList[existingUserIndex].timestamp = new Date().toISOString();
            commands.liveJoinedList[existingUserIndex].status = status;
            commands.liveJoinedList[existingUserIndex].ownLive = ownLive;
        }

        // Join the live stream room
        socket.join(`liveStream_${liveStreamId}`);

        // Write updated commands to JSON file
        try {
            fs.writeFileSync(filePath, JSON.stringify(commands, null, 2));
        } catch (writeErr) {
            console.error('Error writing to file:', writeErr);
            return socket.emit('error', { message: 'Error updating live stream data' });
        }

        // Start emitting stream data to the user
        emitStreamData(io, liveStreamId, userId);
    } else {
        // If the status is false (user is leaving), remove them from the liveJoinedList
        const existingUserIndex = commands.liveJoinedList.findIndex(user => user.userId === userId);

        if (existingUserIndex !== -1) {
            // Remove the user from the list
            commands.liveJoinedList.splice(existingUserIndex, 1);

            // Leave the live stream room
            socket.leave(`liveStream_${liveStreamId}`);

            // Update the commands after removing the user
            try {
                fs.writeFileSync(filePath, JSON.stringify(commands, null, 2));
            } catch (writeErr) {
                console.error('Error writing to file after user removal:', writeErr);
                return socket.emit('error', { message: 'Error updating live stream data' });
            }

            // Handle user disconnection without disconnecting immediately
            handleUserDisconnection(socket, liveStreamId, userId, commands);
        }
    }

    // Emit the updated list and command data to all clients in the room
    emitLiveStreamData(io, liveStreamId, commands);

    // Clear the interval and stop emitting data when the socket disconnects
    socket.on('disconnect', () => {
        // Handle any additional cleanup here if necessary
    });

    // Optional: Watch for changes in the JSON file and emit the updated data
    fs.watch(filePath, (eventType) => {
        if (eventType === 'change') {
            const updatedCommands = readCommandsFromFile(filePath);
            if (updatedCommands) {
                emitLiveStreamData(io, liveStreamId, updatedCommands);
            }
        }
    });
});



    socket.on('sendCommand', async ({ liveStreamId, userId, command }) => {

      try {
        const userDetails = await getUserDetails(userId);
        if (!userDetails) {
          return socket.emit('error', { message: 'User not found' });
        }

        const newCommand = {
          userId,
          command,
          user_name: userDetails.user_name,
          profile_image: userDetails.profile_image,
          timestamp: new Date().toISOString(),
        };

        const filePath = getFilePath(liveStreamId);

        // Check if the file exists
        if (fs.existsSync(filePath)) {
          fs.readFile(filePath, 'utf8', (err, fileData) => {
            if (err) {
              console.error('Error reading file:', err);
              return socket.emit('error', { message: 'Error reading live stream data' });
            }

            let commands;
            try {
              commands = JSON.parse(fileData);
            } catch (parseErr) {
              console.error('Error parsing file:', parseErr);
              return socket.emit('error', { message: 'Error parsing live stream data' });
            }

            // Update the command list with the new command
            commands.commandList = commands.commandList || [];
            commands.commandList.push(newCommand);

            // Update the JSON file with the new command, preserving liveJoinedList
            fs.writeFile(filePath, JSON.stringify(commands, null, 2), (writeErr) => {
              if (writeErr) {
                console.error('Error writing file:', writeErr);
                return socket.emit('error', { message: 'Error updating live stream data' });
              }

              // No need to emit again here, as continuous emissions are already handled
            });
          });
        } else {
          // If no file exists, emit an error
          socket.emit('error', { message: 'Live stream data not found' });
        }
      } catch (error) {
        console.error('Error sending command:', error);
        socket.emit('error', { message: 'Internal server error' });
      }
    });
  


  socket.on('register', (userId) => {
    socket.join(`user_${userId}`);
  });


socket.on('chat message', async ({ from_user_id, to_user_id, message }) => {
    const from = from_user_id;
    const to = to_user_id;
try{    
        // Fetch user details from the User table for both sender and recipient
        const [senderDetails, recipientDetails] = await Promise.all([
            user.findOne({ where: { id: from }, attributes: ['name', 'profile_image'] }),
            user.findOne({ where: { id: to }, attributes: ['name', 'profile_image'] })
        ]);
	const senderName = senderDetails?.name || 'Unknown Sender';
        const senderProfileImage = "/media/"+senderDetails?.profile_image || 'default_sender_image_url.jpg'; // Replace with your default image URL
        const recipientName = recipientDetails?.name || 'Unknown Recipient';
        const recipientProfileImage ="/media/"+ recipientDetails?.profile_image || 'default_recipient_image_url.jpg'; // Replace with your default image URL
        // Emit to the recipient's room
        io.to(`user_${to}`).emit('chat message', {
            from_user_id: from,
            to_user_id: to,
            message: message,
            sender_name: senderName,
            sender_profile_image:senderProfileImage,
            recipient_name: recipientName,
            recipient_profile_image: recipientProfileImage,
            timestamp: new Date().toISOString(),
        });
        // Emit to the sender's room (optional)
        io.to(`user_${from}`).emit('chat message', {
            from_user_id: from,
            to_user_id: to,
            message: message,
            sender_name: senderName,
            sender_profile_image: senderProfileImage,
            recipient_name: recipientName,
            recipient_profile_image: recipientProfileImage,
            timestamp: new Date().toISOString(),
        });
        // Save the message to the database
        const chatMessage = await ChatMessage.create({
            from_user_id: from,
            to_user_id: to,
            message: message
        });
    } catch (error) {
        console.error('Error saving message to database:', error);
    }
});

socket.on('clearMessageCount', async ({ from_user_id, to_user_id, clearCount }) => {
    const from = from_user_id;
    const to = to_user_id;
    try {
	 const recipientMessages = await ChatMessage.findAll({
            where: { from_user_id: to, to_user_id: from, read: false }
        });


        // If there are unread messages, update their read status
        if (recipientMessages && recipientMessages.length > 0) {
            // Extract all message IDs
            const messageIds = recipientMessages.map(message => message.id);

            // Update the read status for all fetched messages
            await ChatMessage.update(
                { read: true }, // Update field
                { where: { id: messageIds } } // Where clause for updating multiple IDs
            );


        }

    } catch (error) {
        console.error('Error sending onScreen message:', error);
    }
});




socket.on('getChatList', async ({ userId }) => {
  try {
    // Fetch all messages where the user is either the sender or the receiver
    const chatMessages = await ChatMessage.findAll({
      where: {
        [Op.or]: [
          { from_user_id: userId },  // Messages sent by this user
          { to_user_id: userId }     // Messages sent to this user
        ]
      },
      order: [['timestamp', 'DESC']],
      attributes: ['id', 'from_user_id', 'to_user_id', 'message', 'timestamp', 'read']
    });

    // Create a map to store conversations with the last message, unread count, etc.
    const conversationMap = new Map();

    chatMessages.forEach(chat => {
      const otherUserId = parseInt(chat.from_user_id) === parseInt(userId)
        ? chat.to_user_id
        : chat.from_user_id;

      // Initialize conversation entry for the other user if not present
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          userId: otherUserId,
          last_message: chat.message,
          timestamp: chat.timestamp,
          isSelf: parseInt(chat.from_user_id) === parseInt(userId),
          unreadCount: 0  // Start with unread count 0
        });
      }

      // Update the last message and timestamp for each conversation
      const conversation = conversationMap.get(otherUserId);
      if (new Date(chat.timestamp) > new Date(conversation.timestamp)) {
        conversation.last_message = chat.message;
        conversation.timestamp = chat.timestamp;
        conversation.isSelf = parseInt(chat.from_user_id) === parseInt(userId);
      }

      // Increment unread count for messages sent to this user (userId)
      if (!chat.read && parseInt(chat.to_user_id) === parseInt(userId)) {
        conversation.unreadCount += 1;
      }
    });

    // Fetch user details for each conversation
    const chatList = await Promise.all(
      Array.from(conversationMap.entries()).map(async ([otherUserId, chatData]) => {
        const userDetail = await user.findOne({
          where: { id: otherUserId },
          attributes: ['name', 'profile_image']
        });
        const userStatus = await UserStatus.findOne({
          where: { userId: otherUserId },
          attributes: ['status']  // Assuming the 'status' field exists
        });

        return {
          userId: parseInt(otherUserId),
          name: userDetail?.name || 'Unknown User',
          profile_image: userDetail?.profile_image
            ? "/media/" + userDetail.profile_image
            : 'default_profile_image.jpg',
          last_message: chatData.last_message,
          timestamp: chatData.timestamp,
          isSelf: chatData.isSelf,
          unreadCount: chatData.unreadCount,  // Proper unread count now
          status: userStatus?.status
        };
      })
    );

    // Sort chat list by timestamp
    const sortedChatList = chatList.sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Emit the sorted chat list back to the client
    socket.emit('chatList', sortedChatList);
  } catch (error) {
    console.error('Error fetching chat list:', error);
    socket.emit('error', { error: 'Failed to fetch chat list' });
  }
});


})

app.get('/stop-socket', (req, res) => {
  io.close(() => {
    console.log('Socket server stopped');
  });
  res.send('Socket server is stopped');
});

function handleUserDisconnection(socket, liveStreamId, userId, commands) {
    // Log the disconnection or clean up resources

    // Disconnect the user socket
    socket.disconnect(); // This will be handled here instead of directly in the joinLiveStream event
}


function emitStreamData(io, streamId, userId) {
    const filePath = path.join(jsonDir, `${streamId}.json`); // Use jsonDir for the file path

    // Continuously emit data from the file
    const interval = setInterval(() => {
     fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                return;
            }

            try {
                const jsonData = JSON.parse(data);

                // Filter the liveJoinedList to exclude users with ownLive: true for all users
                jsonData.liveJoinedList = jsonData.liveJoinedList.filter(user => !user.ownLive);

                // Emit the data to the specific userId
                io.emit(`streamData-${userId}`, jsonData);
            } catch (parseError) {
                console.error('Error parsing JSON:', parseError);
            }
        });
    }, 5000);

}
/*
function emitStreamData(socket, streamId, userId) {
console.log("streamId---------",streamId,userId)
    const filePath = path.join(jsonDir, `${streamId}.json`); // Use jsonDir for the file path
console.log("filePath---------------------",filePath)
    // Debounce file reads to prevent frequent unnecessary reads
    const readAndEmitData = debounce(() => {
        fs.readFile(filePath, 'utf8', (err, data) => {
console.log("data-----------",data)
            if (err) {
                console.error('Error reading file:', err);
                return;
            }

            try {
                const jsonData = JSON.parse(data);
console.log("jsonData-------------------",jsonData);
return
                // Check if liveJoinedList or commandList are not empty
                if ((jsonData.liveJoinedList && jsonData.liveJoinedList.length > 0) ||
                    (jsonData.commandList && jsonData.commandList.length > 0)) {
console.log("entering the condition------------");
console.log("jsonData-------------",jsonData)
                    // Emit the data to the specific userId
                    socket.emit(`streamData-${userId}`, jsonData);
                } else {
                    // Log to check if it's trying to emit empty data
                    console.log('Empty data, not emitting:', jsonData);
                }
            } catch (parseError) {
                console.error('Error parsing JSON:', parseError);
            }
        });
    }, 500); //  // Add a 500ms debounce to prevent frequent reads
}*/

app.get('/getUserList', async (req,res)=>{
try{
const User= await user.findAll();
res.status(200).json(User);
}catch(error){
res.status(500).json(error);
}
})


app.get('/chatHistory/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Log values for debugging

    // Fetch chat history with pagination
    const chatHistory = await ChatMessage.findAll({
      where: {
        [Op.or]: [
          { from_user_id: user1, to_user_id: user2 },
          { from_user_id: user2, to_user_id: user1 }
        ]
      },
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Debugging the chat history length

    // Attempt to mark messages from user2 (who sent the message) to user1 (receiver) as read
    const [updatedRows] = await ChatMessage.update(
      { read: true }, // Mark as read
      {
        where: {
          from_user_id: user2,  // Messages sent by user2
          to_user_id: user1,    // Messages sent to user1
          read: false           // Only unread messages
        }
      }
    );

    // Log the number of rows updated for debugging

    // Check if no rows were updated
    if (updatedRows === 0) {
      console.warn("No messages were updated. Check if the conditions are correct.");
    }

    // Count total messages between user1 and user2
    const totalMessages = await ChatMessage.count({
      where: {
        [Op.or]: [
          { from_user_id: user1, to_user_id: user2 },
          { from_user_id: user2, to_user_id: user1 }
        ]
      }
    });

    const totalPages = Math.ceil(totalMessages / limit);

    // Respond with chat history and pagination information
    res.json({
      currentPage: parseInt(page),
      totalPages,
      totalMessages,
      chatHistory
    });
  } catch (error) {
    console.error('Error updating messages:', error);
    res.status(500).json({ error: error.message });
  }
});



app.get('/chatList/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    // Fetch all messages where the user is either the sender or the receiver
    const chatMessages = await ChatMessage.findAll({
      where: {
        [Op.or]: [
          { from_user_id: userId },  // Messages sent by this user
          { to_user_id: userId }     // Messages sent to this user
        ]
      },
      order: [['timestamp', 'DESC']],
      attributes: ['id', 'from_user_id', 'to_user_id', 'message', 'timestamp', 'read']
    });

    // Create a map to store conversations with the last message, unread count, etc.
    const conversationMap = new Map();

    chatMessages.forEach(chat => {
      const otherUserId = parseInt(chat.from_user_id) === parseInt(userId)
        ? chat.to_user_id
        : chat.from_user_id;

      // Initialize conversation entry for the other user if not present
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          userId: otherUserId,
          last_message: chat.message,
          timestamp: chat.timestamp,
          isSelf: parseInt(chat.from_user_id) === parseInt(userId),
          unreadCount: 0  // Start with unread count 0
        });
      }

      // Update the last message and timestamp for each conversation
      const conversation = conversationMap.get(otherUserId);
      if (new Date(chat.timestamp) > new Date(conversation.timestamp)) {
        conversation.last_message = chat.message;
        conversation.timestamp = chat.timestamp;
        conversation.isSelf = parseInt(chat.from_user_id) === parseInt(userId);
      }

      // Increment unread count for messages sent to this user (userId)
      if (!chat.read && parseInt(chat.to_user_id) === parseInt(userId)) {
        conversation.unreadCount += 1;
      }
    });

    // Fetch user details for each conversation
    const chatList = await Promise.all(
      Array.from(conversationMap.entries()).map(async ([otherUserId, chatData]) => {
        const userDetail = await user.findOne({
          where: { id: otherUserId },
          attributes: ['name', 'profile_image']
        });
   const userStatus = await UserStatus.findOne({
          where: { userId: otherUserId },
          attributes: ['status']  // Assuming the 'status' field exists
        });

        return {
          userId: parseInt(otherUserId),
          name: userDetail?.name || 'Unknown User',
          profile_image: userDetail?.profile_image
            ? "/media/" + userDetail.profile_image
            : 'default_profile_image.jpg',
          last_message: chatData.last_message,
          timestamp: chatData.timestamp,
          isSelf: chatData.isSelf,
          unreadCount: chatData.unreadCount,  // Proper unread count now
          status: userStatus?.status
        };
      })
    );

    // Sort the chat list by the latest message timestamp
    const sortedChatList = chatList.sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Return the sorted chat list
    res.json(sortedChatList);
  } catch (error) {
    console.error('Error fetching chat list:', error);
    res.status(500).json({ error: 'Failed to fetch chat list' });
  }
});


app.get('/searchUser', async (req, res) => {
  const { query, userId } = req.query; // Get the search query and userId from query parameters

  try {
    // Search in the User table (assuming you have a User model)
    const users = await user.findAll({
      where: {
        [Op.and]: [
          { id: { [Op.ne]: userId } }, // Exclude the user with the given userId
          { user_name: { [Op.like]: `%${query}%` } }, // Search by username (case-insensitive for MySQL)
        ],
      },
      attributes: ['id', 'user_name', 'profile_image'], // Select relevant fields
    });

    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    res.json(users); // Return the matching users
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

app.post('/createComment' ,async (req, res) => {
//return
  const { userId, postId, content } = req.body;
  console.log("----------testing-------------", req.body);
try {
    // Create the new comment
    const newComment = await Comment.create({ userId, postId, content });
    console.log("New comment created:", newComment);

    // Retrieve the post details to get the userId of the post owner
    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Retrieve the user details to get the userName and userProfile
    const user = await UserDetails.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Assign a dummy image URL if userProfile is null
    const userProfile = user.userProfile || 'https://i.postimg.cc/nc820Kz7/anandupic.png';

    // Format the notification content
    const formattedContent = `${user.userName} commented on your flare: ${content}. Thanks for the support`;

    // Determine the post image URL to use in the notification
    let postUrl = null; // Initialize postUrl
    if (Array.isArray(post.image) && post.image.length > 0) {
      postUrl = post.images[0]; // Use the first image URL from the array
    } else if (typeof post.image === 'string' && post.image !== '') {
      try {
        const parsedImages = JSON.parse(post.image);
        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
          postUrl = parsedImages[0]; // Use the first image URL from the parsed array
        } else if (typeof parsedImages === 'string' && parsedImages !== '') {
          postUrl = parsedImages; // Use the parsed string as the URL
        }
      } catch (error) {
        console.error('Error parsing post images:', error);
        return res.status(500).json({ message: 'Error parsing post images' });
      }
    }
console.log("postUrl----------",postUrl);
    // Create a notification for the post owner
    const notification = await Notification.create({
      userId: post.userId,  // Notify the owner of the post
      postId,
      type: 'comment',
      content: formattedContent,
      userProfile: userProfile,
      post: postUrl,  // Use the determined post URL, can be null if not found
    });

    // Emit events to notify clients via Socket.io
    console.log('Emitting newNotification to user:', post.userId, notification);
    req.io.to(`user_${post.userId}`).emit('newCommentNotification', notification); // Emit to specific user

    res.status(201).json({ message: 'Comment created successfully', comment: newComment, notification });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }

};


// Start the server
const PORT = process.env.PORT || 2000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
