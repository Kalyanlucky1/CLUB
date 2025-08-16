
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../config/multer'); // For file uploads

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', upload.single('profile_pic'), authController.registerUser);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authController.loginUser);

// @route   POST /api/auth/forgot-password
// @desc    Initiate password reset
// @access  Public
router.post('/forgot-password', authController.forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', authController.resetPassword);

// @route   POST /api/auth/change-password
// @desc    Change password (logged in users)
// @access  Private
router.post('/change-password', authController.changePassword);

module.exports = router;




// const express = require('express');
// const router = express.Router();
// const authController = require('../controllers/authController');
// const upload = require('../config/multer');

// // Register a new user
// router.post('/register', upload.single('profilePic'), authController.registerUser);

// // Login user
// router.post('/login', authController.loginUser);

// // Forgot password
// router.post('/forgot-password', authController.forgotPassword);

// // Reset password
// router.post('/reset-password', authController.resetPassword);

// //change password
// router.post('/change-password', authController.changePassword);
// // Check username availability
// router.get('/check-username', authController.checkUsername);

// // Check email availability
// router.get('/check-email', authController.checkEmail);

// // In routes/auth.js:
// console.log(authController);  // Should show your methods
// console.log(authController.registerUser);  // Should be a function

// module.exports = router;