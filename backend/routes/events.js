const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/auth');
const upload = require('../config/multer');

// Get all events
router.get('/', authMiddleware, eventController.getEvents);

// Get event details
router.get('/:id', authMiddleware, eventController.getEventDetails);

// Create event
router.post('/', authMiddleware, upload.single('image'), eventController.createEvent);

// Join event
router.post('/:id/join', authMiddleware, eventController.joinEvent);

// Leave event
router.post('/:id/leave', authMiddleware, eventController.leaveEvent);

module.exports = router;