const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.get('/:id', userController.getUserById);

// Protected routes (require authentication)
router.use(authMiddleware);

// Profile routes
router.get('/profile', userController.getUserProfile);
router.put('/profile', userController.updateProfile);

// Password routes
router.put('/change-password', userController.changePassword);

// Admin-only routes
router.use(authMiddleware.isAdmin);
router.get('/', userController.getAllUsers);
router.put('/:id/status', userController.updateUserStatus);

module.exports = router;







// const express = require('express');
// const router = express.Router();
// const userController = require('../controllers/userController');
// const authMiddleware = require('../middleware/auth');
// const upload = require('../config/multer');

// // Get user profile
// router.get('/profile', authMiddleware, userController.getUserProfile);

// // Update user profile
// router.put('/profile', authMiddleware, upload.single('profilePic'), userController.updateProfile);

// // Change password
// router.put('/change-password', authMiddleware, userController.changePassword);

// module.exports = router;