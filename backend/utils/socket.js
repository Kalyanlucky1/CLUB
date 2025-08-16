// const initializeSocket = (io) => {
//   io.on('connection', (socket) => {
//     console.log('New client connected');

//     // Join user's personal room for private updates
//     socket.on('joinUserRoom', (userId) => {
//       socket.join(`user_${userId}`);
//       console.log(`User ${userId} joined their room`);
//     });

//     // Join a community room for group chat
//     socket.on('joinCommunityRoom', (communityId) => {
//       socket.join(`community_${communityId}`);
//       console.log(`User joined community ${communityId}`);
//     });

//     // Handle new message
//     socket.on('sendMessage', async (data) => {
//       try {
//         const { senderId, receiverId, communityId, message, imageUrl } = data;
        
//         // Broadcast to the appropriate room
//         if (receiverId) {
//           // Private message
//           io.to(`user_${receiverId}`).emit('newMessage', {
//             senderId,
//             message,
//             imageUrl,
//             timestamp: new Date()
//           });
//         } else if (communityId) {
//           // Community message
//           io.to(`community_${communityId}`).emit('newCommunityMessage', {
//             senderId,
//             communityId,
//             message,
//             imageUrl,
//             timestamp: new Date()
//           });
//         }
//       } catch (error) {
//         console.error('Socket message error:', error);
//       }
//     });

//     // Handle event updates
//     socket.on('eventUpdate', (eventId) => {
//       io.emit('eventUpdated', eventId);
//     });

//     // Handle disconnect
//     socket.on('disconnect', () => {
//       console.log('Client disconnected');
//     });
//   });
// };

// module.exports = { initializeSocket };

const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join user's personal room
    socket.on('joinUserRoom', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Join community room
    socket.on('joinCommunityRoom', (communityId) => {
      socket.join(`community_${communityId}`);
      console.log(`User joined community ${communityId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};

module.exports = { initializeSocket };