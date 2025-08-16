const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminMiddleware = require('../middleware/admin');

// Admin login
router.post('/login', adminController.adminLogin);

// Dashboard analytics
router.get('/analytics', adminMiddleware, adminController.getDashboardAnalytics);

// Get all users
router.get('/users', adminMiddleware, adminController.getAllUsers);

// Get user by ID
router.get('/users/:id', adminMiddleware, adminController.getUserById);

// Update user status
router.put('/users/:id/status', adminMiddleware, adminController.updateUserStatus);

// Get all events
router.get('/events', adminMiddleware, adminController.getAllEvents);

// Delete event
router.delete('/events/:id', adminMiddleware, adminController.deleteEvent);

// Get all communities
router.get('/communities', adminMiddleware, adminController.getAllCommunities);

// Delete community
router.delete('/communities/:id', adminMiddleware, adminController.deleteCommunity);

// Get activity logs
router.get('/logs', adminMiddleware, adminController.getActivityLogs);

module.exports = router;





// const express = require('express');
// const router = express.Router();
// const adminController = require('../controllers/adminController');
// const adminMiddleware = require('../middleware/admin');

// // Admin login
// router.post('/login', adminController.adminLogin);

// // Dashboard analytics
// router.get('/dashboard', adminMiddleware, adminController.getDashboardAnalytics);

// // Activity logs
// router.get('/activities', adminMiddleware, adminController.getActivityLogs);

// // Get all users
// router.get('/users', adminMiddleware, adminController.getAllUsers);

// // Get user by ID
// router.get('/users/:id', adminMiddleware, adminController.getUserById);

// // Update user status
// router.put('/users/:id/status', adminMiddleware, adminController.updateUserStatus);

// // Verify admin token
// router.get('/verify', adminMiddleware, (req, res) => {
//   res.json({ valid: true });
// });

// module.exports = router;