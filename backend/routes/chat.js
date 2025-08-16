const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');

// Get all conversations for a user
router.get('/conversations', authMiddleware, chatController.getConversations);

// Get messages in a conversation (user or community)
router.get('/messages/:type/:id', authMiddleware, chatController.getMessages);

// Send a message (to user or community)
router.post('/send/:type/:id', authMiddleware, chatController.sendMessage);

module.exports = router;







// const express = require('express');
// const router = express.Router();
// const chatController = require('../controllers/chatController');
// const authMiddleware = require('../middleware/auth');
// const upload = require('../config/multer');

// // Get conversations
// router.get('/conversations', authMiddleware, chatController.getConversations);

// // Get messages
// router.get('/messages/:type/:id', authMiddleware, chatController.getMessages);

// // Send message
// router.post('/send', authMiddleware, chatController.sendMessage);

// // Send image
// router.post('/send-image', authMiddleware, upload.single('image'), chatController.sendImage);

// module.exports = router;