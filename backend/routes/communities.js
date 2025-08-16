const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const authMiddleware = require('../middleware/auth');
const upload = require('../config/multer');

// Get all communities
router.get('/', authMiddleware, communityController.getCommunities);

// Get community details
router.get('/:id', authMiddleware, communityController.getCommunityDetails);

// Create community
router.post('/', authMiddleware, upload.single('image'), communityController.createCommunity);

// Join community
router.post('/:id/join', authMiddleware, communityController.joinCommunity);

// Leave community
router.post('/:id/leave', authMiddleware, communityController.leaveCommunity);

module.exports = router;