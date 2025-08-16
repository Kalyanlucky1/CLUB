require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');

//location
// Add this with your other route imports
const locationRoutes = require('./routes/locationRoutes');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const communityRoutes = require('./routes/communities');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');

// Import config and utils
const { pool } = require('./config/db');
const { initializeSocket } = require('./utils/socket');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ["GET", "POST"]
  }
});

// Connect to Database
pool.getConnection()
  .then(connection => {
    console.log('MySQL connected...');
    connection.release();
  })
  .catch(err => {
    console.error('MySQL connection error:', err);
    process.exit(1);
  });

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files from the client
app.use(express.static(path.join(__dirname, '../client')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
// Add this with your other app.use() routes
app.use('/api/locations', locationRoutes);

// Initialize Socket.io
initializeSocket(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const morgan = require('morgan');
// const http = require('http');
// const socketio = require('socket.io');
// const path = require('path');

// const { connectDB } = require('./config/db');
// const { initializeSocket } = require('./utils/socket');

// // Import routes
// const authRoutes = require('./routes/auth');
// const userRoutes = require('./routes/users');
// const eventRoutes = require('./routes/events');
// const communityRoutes = require('./routes/communities');
// const chatRoutes = require('./routes/chat');
// const adminRoutes = require('./routes/admin');

// // Initialize Express app
// const app = express();
// const server = http.createServer(app);
// const io = socketio(server, {
//   cors: {
//     origin: process.env.CLIENT_URL,
//     methods: ["GET", "POST"]
//   }
// });

// // Connect to Database
// connectDB();

// // Middleware
// app.use(helmet());
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(morgan('dev'));

// // Serve static files from the React app
// app.use(express.static(path.join(__dirname, '../client')));

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/events', eventRoutes);
// app.use('/api/communities', communityRoutes);
// app.use('/api/chat', chatRoutes);
// app.use('/api/admin', adminRoutes);

// // Initialize Socket.io
// initializeSocket(io);

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).send('Something broke!');
// });

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });