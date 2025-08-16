
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const [users] = await pool.query(
      'SELECT id, name, username, email, status FROM users WHERE id = ?',
      [decoded.user.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = users[0];

    // Check if user is banned or suspended
    if (user.status !== 'active') {
      return res.status(403).json({ message: `Account is ${user.status}. Please contact support.` });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// const jwt = require('jsonwebtoken');
// const { pool } = require('../config/db');

// const authMiddleware = async (req, res, next) => {
//   try {
//     // Get token from header
//     const token = req.header('Authorization')?.replace('Bearer ', '');

//     if (!token) {
//       return res.status(401).json({ message: 'No token, authorization denied' });
//     }

//     // Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // Check if user still exists
//     const [users] = await pool.query(
//       'SELECT id, username, email, status FROM users WHERE id = ?',
//       [decoded.user.id]
//     );

//     if (users.length === 0) {
//       return res.status(401).json({ message: 'User not found' });
//     }

//     if (users[0].status !== 'active') {
//       return res.status(401).json({ message: 'User account is not active' });
//     }

//     req.user = users[0];
//     next();
//   } catch (error) {
//     console.error(error);
//     res.status(401).json({ message: 'Token is not valid' });
//   }
// };

authMiddleware.isAdmin = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user is admin
    const [admins] = await pool.query(
      'SELECT id FROM admin_users WHERE id = ?',
      [decoded.user.id]
    );

    if (admins.length === 0) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.user = decoded.user;
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;







// // const { verifyUserToken } = require('../config/auth');

// // const authMiddleware = (req, res, next) => {
// //   // Get token from header
// //   const token = req.header('Authorization')?.replace('Bearer ', '');

// //   // Check if no token
// //   if (!token) {
// //     return res.status(401).json({ message: 'No token, authorization denied' });
// //   }

// //   // Verify token
// //   try {
// //     const decoded = verifyUserToken(token);
// //     req.user = decoded.user;
// //     next();
// //   } catch (err) {
// //     res.status(401).json({ message: 'Token is not valid' });
// //   }
// // };

// // const adminMiddleware = (req, res, next) => {
// //   // Get token from header
// //   const token = req.header('Authorization')?.replace('Bearer ', '');

// //   // Check if no token
// //   if (!token) {
// //     return res.status(401).json({ message: 'No token, authorization denied' });
// //   }

// //   // Verify token
// //   try {
// //     const decoded = verifyAdminToken(token);
// //     req.admin = decoded.admin;
// //     next();
// //   } catch (err) {
// //     res.status(401).json({ message: 'Token is not valid' });
// //   }
// // };

// // module.exports = {
// //   authMiddleware,
// //   adminMiddleware
// // };

// const jwt = require('jsonwebtoken');
// const { pool } = require('../config/db');

// const authMiddleware = async (req, res, next) => {
//   try {
//     // Get token from header
//     const token = req.header('Authorization')?.replace('Bearer ', '');
    
//     if (!token) {
//       return res.status(401).json({ message: 'No token, authorization denied' });
//     }

//     // Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
//     // Check if user still exists
//     const [users] = await pool.query(
//       'SELECT id, username, email, status FROM users WHERE id = ?',
//       [decoded.user.id]
//     );

//     if (users.length === 0) {
//       return res.status(401).json({ message: 'User not found' });
//     }

//     const user = users[0];

//     // Check if user is banned or suspended
//     if (user.status !== 'active') {
//       return res.status(403).json({ message: `Account is ${user.status}. Please contact support.` });
//     }

//     // Attach user to request
//     req.user = user;
//     next();
//   } catch (err) {
//     console.error('Error verifying token:', err);
//     res.status(401).json({ message: 'Token is not valid' });
//   }
// };

// module.exports = authMiddleware;