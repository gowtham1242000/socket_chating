const express = require('express');
const app = express();
const server = require('http').createServer(app); // Create HTTP server using Express app
//const io = require('socket.io')(server); // Include socket.io
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const session = require('express-session');
//const db = require('./config/config');
//const adminRoutes = require('./routes/adminRoutes');
//const userRoutes = require('./routes/userRoutes');
const { Op } = require('sequelize');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const socketIo = require('socket.io');
//const sequelize = require('./config/config');
const { sequelizePostgres, sequelizeMySQL } = require('./config/config');
const ChatMessage = require('./models/chatMessage');
const io = socketIo(server);
const user =require('./models/Users');
console.log("user-------",user);
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

io.on('connection', (socket) => {
  console.log('New client connected', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });

  socket.on('register', (userId) => {
    console.log(`User ${userId} registered with socket ID ${socket.id}`);
    socket.join(`user_${userId}`);
  });

/*
socket.once('chat message', async ({ from_user_id, to_user_id, message }) => {
//        console.log("Received chat message from:", from, "to:", to, "message:", message);
const from =from_user_id;
const to =to_user_id;
        try {
            const userDetailsFetch =
            // Emit to the recipient's room
            io.to(`user_${to}`).emit('chat message', { from_user_id: from, to_user_id: to, message: message });

            // Emit to the sender's room (optional)
            io.to(`user_${from}`).emit('chat message', { from_user_id: from, to_user_id: to, message: message });

            // Save the message to the database
            const chatMessage = await ChatMessage.create({
                from_user_id: from,
                to_user_id: to,
                message: message
            });

            console.log("Message saved to DB:", chatMessage);

        } catch (error) {
            console.error('Error saving message to database:', error);
        }
    });
*/
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
        const senderProfileImage = senderDetails?.profile_image || 'default_sender_image_url.jpg'; // Replace with your default image URL
        const recipientName = recipientDetails?.name || 'Unknown Recipient';
        const recipientProfileImage = recipientDetails?.profile_image || 'default_recipient_image_url.jpg'; // Replace with your default image URL
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
        console.log("Message saved to DB:", chatMessage);
    } catch (error) {
        console.error('Error saving message to database:', error);
    }
});

/*
socket.once('fluter chat message', async ({ from_user_id, to_user_id, message }) => {
    const from = from_user_id;
    const to = to_user_id;
try{
        // Fetch user details from the User table for both sender and recipient
        const [senderDetails, recipientDetails] = await Promise.all([
            user.findOne({ where: { id: from }, attributes: ['name', 'profile_image'] }),
            user.findOne({ where: { id: to }, attributes: ['name', 'profile_image'] })
        ]);
const senderName = senderDetails?.name || 'Unknown Sender';
        const senderProfileImage = senderDetails?.profile_image || 'default_sender_image_url.jpg'; // Replace with your default image URL
        const recipientName = recipientDetails?.name || 'Unknown Recipient';
        const recipientProfileImage = recipientDetails?.profile_image || 'default_recipient_image_url.jpg'; // Replace with your default image URL
        // Emit to the recipient's room
        io.to(`user_${to}`).emit('chat message', {
            from_user_id: from,
            to_user_id: to,
            message: message,
            sender_name: senderDetails.name,
            sender_profile_image: senderDetails.profile_image,
            recipient_name: recipientDetails.name,
            recipient_profile_image: recipientDetails.profile_image,
            timestamp: new Date().toISOString(),
        });
        // Emit to the sender's room (optional)
        io.to(`user_${from}`).emit('chat message', {
            from_user_id: from,
            to_user_id: to,
            message: message,
            sender_name: senderDetails.name,
            sender_profile_image: senderDetails.profile_image,
            recipient_name: recipientDetails.name,
            recipient_profile_image: recipientDetails.profile_image,
            timestamp: new Date().toISOString(),
        });
        // Save the message to the database
        const chatMessage = await ChatMessage.create({
            from_user_id: from,
            to_user_id: to,
            message: message
        });
        console.log("Message saved to DB:", chatMessage);
    } catch (error) {
   console.error('Error saving message to database:', error);
    }
});
*/


//true
  socket.on('newCommentNotification', (notification) => {
    console.log('Received new comment notification:', notification);
    io.emit('newCommentNotification', notification);
  });

//true
socket.on('newCommentLikeNotification', (notification) => {
  console.log('Received new like notification:', notification);
  // io.emit('newCommentLikeNotification', notification);
  io.to(`user_${notification.userId}`).emit('newCommentLikeNotification', notification);
});
//true
socket.on('postLikeNotification', (notification) => {
console.log('Received new like notification:', notification);
io.to(`user_${notification.userId}`).emit('postLikeNotification', notification);
});

//true
  socket.on('newSubCommentNotification', (notification) => {
    console.log('Received new sub-comment notification:', notification);
    io.to(`user_${notification.userId}`).emit('newSubCommentNotification', notification);
  });
//true
  socket.on('newLikeSubCommentNotification', (notification) => {
    console.log('Received new like sub-comment notification:', notification);
    io.to(`user_${notification.userId}`).emit('newLikeSubCommentNotification', notification);
  });

  socket.on('newFollowNotification', (notification) => {
    console.log('Received new follow notification:', notification);
    io.emit('newFollowNotification', notification);
  });


});

app.get('/getUserList', async (req,res)=>{
try{
const User= await user.findAll();
console.log("user-----------",User);
res.status(200).json(User);
}catch(error){
res.status(500).json(error);
}
})

app.get('/chatHistory/:user1/:user2',async (req,res) => {
  try {
    const { user1, user2 } = req.params;
    const { page = 1, limit = 10 } = req.query; // Get 'page' and 'limit' from query params with defaults

    // Calculate the offset (skip)
    const offset = (page - 1) * limit;

    // Fetch chat history with pagination
    const chatHistory = await ChatMessage.findAll({
      where: {
        [Op.or]: [
          { from_user_id: user1, to_user_id: user2 },
          { from_user_id: user2, to_user_id: user1 }
        ]
      },
      order: [['timestamp', 'DESC']], // Order by timestamp ascending
      limit: parseInt(limit),        // Limit results per page
      offset: parseInt(offset)       // Skip the number of records based on current page
    });

    // Count the total number of messages for pagination
    const totalMessages = await ChatMessage.count({
      where: {
        [Op.or]: [
          { from_user_id: user1, to_user_id: user2 },
          { from_user_id: user2, to_user_id: user1 }
        ]
      }
    });

    const totalPages = Math.ceil(totalMessages / limit);

    res.json({
      currentPage: parseInt(page),
      totalPages,
      totalMessages,
      chatHistory
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/chatList/:userId', async (req, res) => {
  const { userId } = req.params; // The logged-in user's ID

  try {
    // Fetch chat messages involving the user
    const chatMessages = await ChatMessage.findAll({
      where: {
        [Op.or]: [
          { from_user_id: userId },
          { to_user_id: userId }
        ]
      },
      order: [['timestamp', 'DESC']], // Order by timestamp descending
      limit: 50 // Adjust limit as needed
    });

    // Create a map to hold user details and last message
    const userMap = new Map();

    // Process chat messages
    chatMessages.forEach(chat => {
      const otherUserId = chat.from_user_id === userId ? chat.to_user_id : chat.from_user_id;

      // Update the userMap with the latest message and user details
      if (!userMap.has(otherUserId)) {
        userMap.set(otherUserId, {
          userId: otherUserId,
          last_message: chat.message,
          timestamp: chat.timestamp // Store the timestamp of the last message
        });
      } else {
        // Update last message and timestamp if this message is more recent
        const userDetail = userMap.get(otherUserId);
        userDetail.last_message = chat.message;
        userDetail.timestamp = chat.timestamp; // Update the timestamp
      }
    });

/*    // Fetch user details for each unique userId
    const chatDetails = await Promise.all(
      Array.from(userMap.keys()).map(async (userId) => {
        const userDetail = await user.findOne({ where: { id: userId }, attributes: ['name', 'profile_image'] });
        return {
          userId: userId,
          name: userDetail?.name || 'Unknown User',
          profile_image: userDetail?.profile_image || 'default_profile_image_url.jpg',
          last_message: userMap.get(userId).last_message, // Last message exchanged
          timestamp: userMap.get(userId).timestamp // Timestamp of the last message
        };
      })
    );
*/

const chatDetails = await Promise.all(
  Array.from(userMap.keys()).map(async (userId) => {
    const userDetail = await user.findOne({ where: { id: userId }, attributes: ['name', 'profile_image'] });
    return {
      userId: userId,
      name: userDetail?.name || 'Unknown User',
      profile_image: userDetail?.profile_image || 'default_profile_image_url.jpg',
      last_message: userMap.get(userId).last_message, // Last message exchanged
      timestamp: userMap.get(userId).timestamp // Timestamp of the last message
    };
  })
);

// Directly return the array without wrapping it in an object
res.json(chatDetails);

//    res.json({ chatDetails });
  } catch (error) {
    console.error('Error fetching chat list:', error);
    res.status(500).json({ error: 'Failed to fetch chat list' });
  }
});

// Start the server
const PORT = process.env.PORT || 2000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
