const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createActivityLog } = require('../utils/helpers');

// Admin login
const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find admin by email
    const [admins] = await pool.query(
      'SELECT * FROM admin_users WHERE email = ?',
      [email]
    );

    if (admins.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const admin = admins[0];

    // Check password
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const payload = {
      user: {
        id: admin.id,
        email: admin.email,
        role: 'admin'
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get dashboard analytics
const getDashboardAnalytics = async (req, res) => {
  try {
    // Get total users count
    const [totalUsers] = await pool.query('SELECT COUNT(*) as count FROM users');
    
    // Get active users (logged in last 7 days)
    const [activeUsers] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE last_login_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );
    
    // Get total events count
    const [totalEvents] = await pool.query('SELECT COUNT(*) as count FROM events');
    
    // Get upcoming events count
    const [upcomingEvents] = await pool.query(
      'SELECT COUNT(*) as count FROM events WHERE date >= CURDATE()'
    );
    
    // Get total communities count
    const [totalCommunities] = await pool.query('SELECT COUNT(*) as count FROM communities');
    
    // Get new signups last 7 days
    const [newSignups] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );
    
    // Get activity logs for recent activities
    const [recentActivities] = await pool.query(
      `SELECT al.*, u.name as user_name
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 10`
    );

    res.json({
      totalUsers: totalUsers[0].count,
      activeUsers: activeUsers[0].count,
      totalEvents: totalEvents[0].count,
      upcomingEvents: upcomingEvents[0].count,
      totalCommunities: totalCommunities[0].count,
      newSignups: newSignups[0].count,
      recentActivities
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, username, email, phone, status, points, created_at FROM users'
    );
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, username, email, phone, bio, profile_pic, interests, country, state, city, points, status, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    // Get events attended
    const [events] = await pool.query(
      `SELECT e.id, e.title, e.date 
       FROM events e
       JOIN event_participants ep ON e.id = ep.event_id
       WHERE ep.user_id = ?`,
      [req.params.id]
    );

    // Get communities joined
    const [communities] = await pool.query(
      `SELECT c.id, c.name 
       FROM communities c
       JOIN community_members cm ON c.id = cm.community_id
       WHERE cm.user_id = ?`,
      [req.params.id]
    );

    res.json({
      ...user,
      events,
      communities
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user status
const updateUserStatus = async (req, res) => {
  const { status } = req.body;
  const userId = req.params.id;

  try {
    // Validate status
    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await pool.query(
      'UPDATE users SET status = ? WHERE id = ?',
      [status, userId]
    );

    // Create activity log
    await createActivityLog('admin_action', req.user.id, userId, `User status changed to ${status}`);

    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all events
const getAllEvents = async (req, res) => {
  try {
    const [events] = await pool.query(
      `SELECT e.*, u.name as creator_name, 
       (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) as participants_count
       FROM events e
       JOIN users u ON e.created_by = u.id
       ORDER BY e.date DESC, e.time DESC`
    );
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete event
const deleteEvent = async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM events WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Create activity log
    await createActivityLog('admin_action', req.user.id, req.params.id, 'Event deleted');

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all communities
const getAllCommunities = async (req, res) => {
  try {
    const [communities] = await pool.query(
      `SELECT c.*, u.name as creator_name,
       (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as members_count
       FROM communities c
       JOIN users u ON c.created_by = u.id
       ORDER BY c.created_at DESC`
    );
    res.json(communities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete community
const deleteCommunity = async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM communities WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Create activity log
    await createActivityLog('admin_action', req.user.id, req.params.id, 'Community deleted');

    res.json({ message: 'Community deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get activity logs
const getActivityLogs = async (req, res) => {
  const { type, page = 1, limit = 20 } = req.query;

  try {
    let query = `
      SELECT al.*, u.name as user_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
    `;
    let params = [];

    if (type) {
      query += ' WHERE al.type = ?';
      params.push(type);
    }

    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (page - 1) * limit);

    const [logs] = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as count FROM activity_logs';
    if (type) {
      countQuery += ' WHERE type = ?';
    }
    const [total] = await pool.query(countQuery, type ? [type] : []);

    res.json({
      logs,
      total: total[0].count,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  adminLogin,
  getDashboardAnalytics,
  getAllUsers,
  getUserById,
  updateUserStatus,
  getAllEvents,
  deleteEvent,
  getAllCommunities,
  deleteCommunity,
  getActivityLogs
};






// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { pool } = require('../config/db');
// const { createActivityLog } = require('../utils/socket');

// // Admin login
// const adminLogin = async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     // Find admin by email
//     const [admins] = await pool.query(
//       'SELECT * FROM admin_users WHERE email = ?',
//       [email]
//     );

//     if (admins.length === 0) {
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }

//     const admin = admins[0];

//     // Check password
//     const isMatch = await bcrypt.compare(password, admin.password_hash);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }

//     // Create JWT token
//     const payload = {
//       user: {
//         id: admin.id,
//         email: admin.email,
//         role: 'admin'
//       }
//     };

//     jwt.sign(
//       payload,
//       process.env.JWT_SECRET,
//       { expiresIn: '1d' },
//       (err, token) => {
//         if (err) throw err;
//         res.json({ token });
//       }
//     );
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Get dashboard analytics
// const getDashboardAnalytics = async (req, res) => {
//   try {
//     // Get total users count
//     const [totalUsers] = await pool.query('SELECT COUNT(*) as count FROM users');
    
//     // Get active users (logged in last 7 days)
//     const [activeUsers] = await pool.query(
//       'SELECT COUNT(*) as count FROM users WHERE last_login_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
//     );
    
//     // Get total events count
//     const [totalEvents] = await pool.query('SELECT COUNT(*) as count FROM events');
    
//     // Get upcoming events count
//     const [upcomingEvents] = await pool.query(
//       'SELECT COUNT(*) as count FROM events WHERE date >= CURDATE()'
//     );
    
//     // Get total communities count
//     const [totalCommunities] = await pool.query('SELECT COUNT(*) as count FROM communities');
    
//     // Get new signups last 7 days
//     const [newSignups] = await pool.query(
//       'SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
//     );
    
//     // Get activity logs for recent activities
//     const [recentActivities] = await pool.query(
//       `SELECT al.*, u.name as user_name
//        FROM activity_logs al
//        LEFT JOIN users u ON al.user_id = u.id
//        ORDER BY al.created_at DESC
//        LIMIT 10`
//     );

//     res.json({
//       totalUsers: totalUsers[0].count,
//       activeUsers: activeUsers[0].count,
//       totalEvents: totalEvents[0].count,
//       upcomingEvents: upcomingEvents[0].count,
//       totalCommunities: totalCommunities[0].count,
//       newSignups: newSignups[0].count,
//       recentActivities
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Get activity logs
// const getActivityLogs = async (req, res) => {
//   const { type, page = 1, limit = 20 } = req.query;

//   try {
//     let query = `
//       SELECT al.*, u.name as user_name
//       FROM activity_logs al
//       LEFT JOIN users u ON al.user_id = u.id
//     `;
//     let params = [];

//     if (type) {
//       query += ' WHERE al.type = ?';
//       params.push(type);
//     }

//     query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
//     params.push(parseInt(limit), (page - 1) * limit);

//     const [logs] = await pool.query(query, params);

//     // Get total count for pagination
//     let countQuery = 'SELECT COUNT(*) as count FROM activity_logs';
//     if (type) {
//       countQuery += ' WHERE type = ?';
//     }
//     const [total] = await pool.query(countQuery, type ? [type] : []);

//     res.json({
//       logs,
//       total: total[0].count,
//       page: parseInt(page),
//       limit: parseInt(limit)
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// module.exports = {
//   adminLogin,
//   getDashboardAnalytics,
//   getActivityLogs
// };