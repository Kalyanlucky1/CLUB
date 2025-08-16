const { pool } = require('../config/db');
const { uploadToCloudinary } = require('../config/cloudinary');
const { createActivityLog } = require('../utils/helpers');

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, name, username, email, phone, bio, profile_pic, interests, 
       country, state, city, points, last_snap_time, last_login_time 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    
    // Calculate user level based on points
    let levelIcon = '☮️'; // Peace (1-60)
    if (user.points > 180) {
      levelIcon = '😊'; // Smile (181+)
    } else if (user.points > 60) {
      levelIcon = '❤️'; // Heart (61-180)
    }

    // Get count of events attended
    const [eventsCount] = await pool.query(
      'SELECT COUNT(*) as count FROM event_participants WHERE user_id = ?',
      [req.user.id]
    );

    // Get created events
    const [createdEvents] = await pool.query(
      'SELECT id, title, date, time, location FROM events WHERE created_by = ? ORDER BY date, time',
      [req.user.id]
    );

    // Get joined events (upcoming)
    const [joinedEvents] = await pool.query(
      `SELECT e.id, e.title, e.date, e.time, e.location 
       FROM events e
       JOIN event_participants ep ON e.id = ep.event_id
       WHERE ep.user_id = ? AND e.date >= CURDATE()
       ORDER BY e.date, e.time`,
      [req.user.id]
    );

    // Get communities joined
    const [communities] = await pool.query(
      `SELECT c.id, c.name, c.description, c.image_url 
       FROM communities c
       JOIN community_members cm ON c.id = cm.community_id
       WHERE cm.user_id = ?`,
      [req.user.id]
    );

    res.json({
      ...user,
      levelIcon,
      eventsAttended: eventsCount[0].count,
      createdEvents,
      joinedEvents,
      communities
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  const { name, bio, interests, country, state, city } = req.body;
  const profilePic = req.files?.profilePic;

  try {
    let profilePicUrl = '';
    if (profilePic) {
      const result = await uploadToCloudinary(profilePic.tempFilePath);
      profilePicUrl = result.secure_url;
    }

    // Build update query based on provided fields
    let updateFields = [];
    let updateValues = [];

    if (name) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (bio) {
      updateFields.push('bio = ?');
      updateValues.push(bio);
    }
    if (interests) {
      updateFields.push('interests = ?');
      updateValues.push(interests);
    }
    if (country) {
      updateFields.push('country = ?');
      updateValues.push(country);
    }
    if (state) {
      updateFields.push('state = ?');
      updateValues.push(state);
    }
    if (city) {
      updateFields.push('city = ?');
      updateValues.push(city);
    }
    if (profilePicUrl) {
      updateFields.push('profile_pic = ?');
      updateValues.push(profilePicUrl);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateValues.push(req.user.id);

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await pool.query(query, updateValues);

    // Create activity log
    await createActivityLog('profile_update', req.user.id, null, 'Profile updated');

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users (for admin)
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
      `SELECT id, name, username, email, phone, bio, profile_pic, 
       interests, country, state, city, points, status, created_at 
       FROM users WHERE id = ?`,
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

// Update user status (admin only)
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

// Change password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    // Get current password hash
    const [users] = await pool.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    // Create activity log
    await createActivityLog('password_change', userId, null, 'Password changed successfully');

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  updateUserStatus,
  changePassword
};













// const { pool } = require('../config/db');
// const { uploadToCloudinary } = require('../config/cloudinary');
// const { createActivityLog } = require('../utils/socket');

// // Get user profile
// const getUserProfile = async (req, res) => {
//   try {
//     const [users] = await pool.query(
//       'SELECT id, name, username, email, phone, bio, profile_pic, interests, country, state, city, points, last_snap_time FROM users WHERE id = ?',
//       [req.user.id]
//     );

//     if (users.length === 0) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const user = users[0];
    
//     // Calculate user level based on points
//     let levelIcon = '☮️'; // Peace (1-60)
//     if (user.points > 180) {
//       levelIcon = '😊'; // Smile (181+)
//     } else if (user.points > 60) {
//       levelIcon = '❤️'; // Heart (61-180)
//     }

//     // Get count of events attended
//     const [eventsCount] = await pool.query(
//       'SELECT COUNT(*) as count FROM event_participants WHERE user_id = ?',
//       [req.user.id]
//     );

//     // Get created events
//     const [createdEvents] = await pool.query(
//       'SELECT id, title, date, time, location FROM events WHERE created_by = ? ORDER BY date, time',
//       [req.user.id]
//     );

//     // Get joined events (upcoming)
//     const [joinedEvents] = await pool.query(
//       `SELECT e.id, e.title, e.date, e.time, e.location 
//        FROM events e
//        JOIN event_participants ep ON e.id = ep.event_id
//        WHERE ep.user_id = ? AND e.date >= CURDATE()
//        ORDER BY e.date, e.time`,
//       [req.user.id]
//     );

//     // Get communities joined
//     const [communities] = await pool.query(
//       `SELECT c.id, c.name, c.description, c.image_url 
//        FROM communities c
//        JOIN community_members cm ON c.id = cm.community_id
//        WHERE cm.user_id = ?`,
//       [req.user.id]
//     );

//     res.json({
//       ...user,
//       levelIcon,
//       eventsAttended: eventsCount[0].count,
//       createdEvents,
//       joinedEvents,
//       communities
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Update user profile
// const updateProfile = async (req, res) => {
//   const { name, bio, interests, country, state, city } = req.body;
//   const profilePic = req.file;

//   try {
//     let profilePicUrl = '';
//     if (profilePic) {
//       const result = await uploadToCloudinary(profilePic.path);
//       profilePicUrl = result.secure_url;
//     }

//     // Build update query based on provided fields
//     let updateFields = [];
//     let updateValues = [];

//     if (name) {
//       updateFields.push('name = ?');
//       updateValues.push(name);
//     }
//     if (bio) {
//       updateFields.push('bio = ?');
//       updateValues.push(bio);
//     }
//     if (interests) {
//       updateFields.push('interests = ?');
//       updateValues.push(interests);
//     }
//     if (country) {
//       updateFields.push('country = ?');
//       updateValues.push(country);
//     }
//     if (state) {
//       updateFields.push('state = ?');
//       updateValues.push(state);
//     }
//     if (city) {
//       updateFields.push('city = ?');
//       updateValues.push(city);
//     }
//     if (profilePicUrl) {
//       updateFields.push('profile_pic = ?');
//       updateValues.push(profilePicUrl);
//     }

//     if (updateFields.length === 0) {
//       return res.status(400).json({ message: 'No fields to update' });
//     }

//     updateValues.push(req.user.id);

//     const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
//     await pool.query(query, updateValues);

//     // Create activity log
//     await createActivityLog('profile_update', req.user.id, null, 'Profile updated');

//     res.json({ message: 'Profile updated successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Get all users (for admin)
// const getAllUsers = async (req, res) => {
//   try {
//     const [users] = await pool.query(
//       'SELECT id, name, username, email, phone, status, points, created_at FROM users'
//     );
//     res.json(users);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Get user by ID (for admin)
// const getUserById = async (req, res) => {
//   try {
//     const [users] = await pool.query(
//       'SELECT id, name, username, email, phone, bio, profile_pic, interests, country, state, city, points, status, created_at FROM users WHERE id = ?',
//       [req.params.id]
//     );

//     if (users.length === 0) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const user = users[0];

//     // Get events attended
//     const [events] = await pool.query(
//       `SELECT e.id, e.title, e.date 
//        FROM events e
//        JOIN event_participants ep ON e.id = ep.event_id
//        WHERE ep.user_id = ?`,
//       [req.params.id]
//     );

//     // Get communities joined
//     const [communities] = await pool.query(
//       `SELECT c.id, c.name 
//        FROM communities c
//        JOIN community_members cm ON c.id = cm.community_id
//        WHERE cm.user_id = ?`,
//       [req.params.id]
//     );

//     res.json({
//       ...user,
//       events,
//       communities
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Update user status (admin only)
// const updateUserStatus = async (req, res) => {
//   const { status } = req.body;
//   const userId = req.params.id;

//   try {
//     // Validate status
//     if (!['active', 'suspended', 'banned'].includes(status)) {
//       return res.status(400).json({ message: 'Invalid status' });
//     }

//     await pool.query(
//       'UPDATE users SET status = ? WHERE id = ?',
//       [status, userId]
//     );

//     // Create activity log
//     await createActivityLog('admin_action', req.user.id, userId, `User status changed to ${status}`);

//     res.json({ message: 'User status updated successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// module.exports = {
//   getUserProfile,
//   updateProfile,
//   getAllUsers,
//   getUserById,
//   updateUserStatus
// };