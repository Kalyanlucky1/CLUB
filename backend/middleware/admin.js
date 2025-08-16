const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const adminMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user is admin
    if (decoded.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Get admin from database
    const [admins] = await pool.query(
      'SELECT id, email FROM admin_users WHERE id = ?',
      [decoded.user.id]
    );

    if (admins.length === 0) {
      return res.status(401).json({ message: 'Admin not found' });
    }

    // Attach admin to request
    req.user = admins[0];
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = adminMiddleware;





// const jwt = require('jsonwebtoken');
// const { pool } = require('../config/db');

// const adminMiddleware = async (req, res, next) => {
//   try {
//     // Get token from header
//     const token = req.header('Authorization')?.replace('Bearer ', '');
    
//     if (!token) {
//       return res.status(401).json({ message: 'No token, authorization denied' });
//     }

//     // Verify token
//     const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
    
//     // Check if admin still exists
//     const [admins] = await pool.query(
//       'SELECT id, email FROM admin_users WHERE id = ?',
//       [decoded.user.id]
//     );

//     if (admins.length === 0) {
//       return res.status(401).json({ message: 'Admin not found' });
//     }

//     // Attach admin to request
//     req.user = admins[0];
//     next();
//   } catch (err) {
//     console.error('Error verifying admin token:', err);
//     res.status(401).json({ message: 'Admin token is not valid' });
//   }
// };

// module.exports = adminMiddleware;