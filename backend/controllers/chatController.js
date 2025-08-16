const { pool } = require('../config/db');
const { uploadToCloudinary } = require('../config/cloudinary');
const { createActivityLog } = require('../utils/helpers');

// Get all conversations for a user
const getConversations = async (req, res) => {
  try {
    // Get direct message conversations
    const [directMessages] = await pool.query(
      `SELECT u.id as user_id, u.name, u.username, u.profile_pic, u.points,
       (SELECT message FROM chat_messages 
        WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id)
        ORDER BY created_at DESC LIMIT 1) as last_message,
       (SELECT created_at FROM chat_messages 
        WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id)
        ORDER BY created_at DESC LIMIT 1) as last_message_time,
       (SELECT COUNT(*) FROM chat_messages 
        WHERE sender_id = u.id AND receiver_id = ? AND is_read = FALSE) as unread_count
       FROM users u
       WHERE u.id IN (
         SELECT DISTINCT CASE 
           WHEN sender_id = ? THEN receiver_id 
           ELSE sender_id 
         END as other_user
         FROM chat_messages
         WHERE sender_id = ? OR receiver_id = ?
       )`,
      [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]
    );

    // Get community conversations
    const [communityMessages] = await pool.query(
      `SELECT c.id as community_id, c.name, c.image_url,
       (SELECT message FROM chat_messages 
        WHERE community_id = c.id
        ORDER BY created_at DESC LIMIT 1) as last_message,
       (SELECT created_at FROM chat_messages 
        WHERE community_id = c.id
        ORDER BY created_at DESC LIMIT 1) as last_message_time,
       (SELECT COUNT(*) FROM chat_messages 
        WHERE community_id = c.id AND sender_id != ? AND is_read = FALSE) as unread_count
       FROM communities c
       JOIN community_members cm ON c.id = cm.community_id
       WHERE cm.user_id = ?`,
      [req.user.id, req.user.id]
    );

    res.json({
      directMessages,
      communityMessages
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get messages between two users or in a community
const getMessages = async (req, res) => {
  const { type, id } = req.params;

  try {
    let messages = [];
    
    if (type === 'user') {
      // Direct messages between two users
      const [result] = await pool.query(
        `SELECT cm.*, u.name as sender_name, u.profile_pic as sender_avatar, u.points as sender_points
         FROM chat_messages cm
         JOIN users u ON cm.sender_id = u.id
         WHERE (cm.sender_id = ? AND cm.receiver_id = ?) OR (cm.sender_id = ? AND cm.receiver_id = ?)
         ORDER BY cm.created_at`,
        [req.user.id, id, id, req.user.id]
      );
      messages = result;

      // Mark messages as read
      await pool.query(
        'UPDATE chat_messages SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE',
        [id, req.user.id]
      );
    } else if (type === 'community') {
      // Community messages
      const [result] = await pool.query(
        `SELECT cm.*, u.name as sender_name, u.profile_pic as sender_avatar, u.points as sender_points
         FROM chat_messages cm
         JOIN users u ON cm.sender_id = u.id
         WHERE cm.community_id = ?
         ORDER BY cm.created_at`,
        [id]
      );
      messages = result;

      // Mark messages as read (for the current user)
      await pool.query(
        `UPDATE chat_messages SET is_read = TRUE 
         WHERE community_id = ? AND sender_id != ? AND is_read = FALSE`,
        [id, req.user.id]
      );
    } else {
      return res.status(400).json({ message: 'Invalid conversation type' });
    }

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send a message
const sendMessage = async (req, res) => {
  const { type, id } = req.params;
  const { message } = req.body;
  const messageImage = req.file;

  try {
    // Validate message content
    if (!message && !messageImage) {
      return res.status(400).json({ message: 'Message or image is required' });
    }

    let imageUrl = '';
    if (messageImage) {
      const result = await uploadToCloudinary(messageImage.path);
      imageUrl = result.secure_url;
    }

    let result;
    if (type === 'user') {
      // Send direct message
      [result] = await pool.query(
        'INSERT INTO chat_messages (sender_id, receiver_id, message, image_url) VALUES (?, ?, ?, ?)',
        [req.user.id, id, message, imageUrl]
      );

      // Update snap streak if sending an image
      if (imageUrl) {
        await updateSnapStreak(req.user.id);
      }
    } else if (type === 'community') {
      // Send community message
      [result] = await pool.query(
        'INSERT INTO chat_messages (sender_id, community_id, message, image_url) VALUES (?, ?, ?, ?)',
        [req.user.id, id, message, imageUrl]
      );

      // Update snap streak if sending an image
      if (imageUrl) {
        await updateSnapStreak(req.user.id);
      }
    } else {
      return res.status(400).json({ message: 'Invalid conversation type' });
    }

    // Create activity log
    await createActivityLog('message_sent', req.user.id, id, 'Message sent');

    res.status(201).json({ 
      message: 'Message sent successfully',
      messageId: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to update snap streak
const updateSnapStreak = async (userId) => {
  try {
    // Get user's current points and last snap time
    const [users] = await pool.query(
      'SELECT points, last_snap_time FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) return;

    const user = users[0];
    const now = new Date();
    const lastSnapTime = user.last_snap_time ? new Date(user.last_snap_time) : null;

    // Calculate time difference in hours
    let hoursDiff = 24;
    if (lastSnapTime) {
      hoursDiff = (now - lastSnapTime) / (1000 * 60 * 60);
    }

    let newPoints = user.points;
    
    // If last snap was within 24 hours, increment streak
    if (hoursDiff <= 24) {
      newPoints += 1;
    } else {
      // Reset streak if more than 24 hours
      newPoints = 1;
    }

    // Update user's points and last snap time
    await pool.query(
      'UPDATE users SET points = ?, last_snap_time = NOW() WHERE id = ?',
      [newPoints, userId]
    );

    // Create activity log
    await createActivityLog('points_updated', userId, null, `Points updated to ${newPoints}`);
  } catch (error) {
    console.error('Error updating snap streak:', error);
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage
};









// const { pool } = require('../config/db');
// const { uploadToCloudinary } = require('../config/cloudinary');
// const { createActivityLog } = require('../utils/socket');

// // Get all conversations for a user
// const getConversations = async (req, res) => {
//   try {
//     // Get direct message conversations
//     const [directMessages] = await pool.query(
//       `SELECT u.id as user_id, u.name, u.username, u.profile_pic, u.points,
//        (SELECT message FROM chat_messages 
//         WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id)
//         ORDER BY created_at DESC LIMIT 1) as last_message,
//        (SELECT created_at FROM chat_messages 
//         WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id)
//         ORDER BY created_at DESC LIMIT 1) as last_message_time,
//        (SELECT COUNT(*) FROM chat_messages 
//         WHERE sender_id = u.id AND receiver_id = ? AND is_read = FALSE) as unread_count
//        FROM users u
//        WHERE u.id IN (
//          SELECT DISTINCT CASE 
//            WHEN sender_id = ? THEN receiver_id 
//            ELSE sender_id 
//          END as other_user
//          FROM chat_messages
//          WHERE sender_id = ? OR receiver_id = ?
//        )`,
//       [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]
//     );

//     // Get community conversations
//     const [communityMessages] = await pool.query(
//       `SELECT c.id as community_id, c.name, c.image_url,
//        (SELECT message FROM chat_messages 
//         WHERE community_id = c.id
//         ORDER BY created_at DESC LIMIT 1) as last_message,
//        (SELECT created_at FROM chat_messages 
//         WHERE community_id = c.id
//         ORDER BY created_at DESC LIMIT 1) as last_message_time,
//        (SELECT COUNT(*) FROM chat_messages 
//         WHERE community_id = c.id AND sender_id != ? AND is_read = FALSE) as unread_count
//        FROM communities c
//        JOIN community_members cm ON c.id = cm.community_id
//        WHERE cm.user_id = ?`,
//       [req.user.id, req.user.id]
//     );

//     res.json({
//       directMessages,
//       communityMessages
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Get messages between two users or in a community
// const getMessages = async (req, res) => {
//   const { type, id } = req.params;

//   try {
//     let messages = [];
    
//     if (type === 'user') {
//       // Direct messages between two users
//       const [result] = await pool.query(
//         `SELECT cm.*, u.name as sender_name, u.profile_pic as sender_avatar, u.points as sender_points
//          FROM chat_messages cm
//          JOIN users u ON cm.sender_id = u.id
//          WHERE (cm.sender_id = ? AND cm.receiver_id = ?) OR (cm.sender_id = ? AND cm.receiver_id = ?)
//          ORDER BY cm.created_at`,
//         [req.user.id, id, id, req.user.id]
//       );
//       messages = result;

//       // Mark messages as read
//       await pool.query(
//         'UPDATE chat_messages SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE',
//         [id, req.user.id]
//       );
//     } else if (type === 'community') {
//       // Community messages
//       const [result] = await pool.query(
//         `SELECT cm.*, u.name as sender_name, u.profile_pic as sender_avatar, u.points as sender_points
//          FROM chat_messages cm
//          JOIN users u ON cm.sender_id = u.id
//          WHERE cm.community_id = ?
//          ORDER BY cm.created_at`,
//         [id]
//       );
//       messages = result;

//       // Mark messages as read (for the current user)
//       await pool.query(
//         `UPDATE chat_messages SET is_read = TRUE 
//          WHERE community_id = ? AND sender_id != ? AND is_read = FALSE`,
//         [id, req.user.id]
//       );
//     } else {
//       return res.status(400).json({ message: 'Invalid conversation type' });
//     }

//     res.json(messages);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Send a message
// const sendMessage = async (req, res) => {
//   const { type, id } = req.params;
//   const { message } = req.body;
//   const messageImage = req.file;

//   try {
//     // Validate message content
//     if (!message && !messageImage) {
//       return res.status(400).json({ message: 'Message or image is required' });
//     }

//     let imageUrl = '';
//     if (messageImage) {
//       const result = await uploadToCloudinary(messageImage.path);
//       imageUrl = result.secure_url;
//     }

//     let result;
//     if (type === 'user') {
//       // Send direct message
//       [result] = await pool.query(
//         'INSERT INTO chat_messages (sender_id, receiver_id, message, image_url) VALUES (?, ?, ?, ?)',
//         [req.user.id, id, message, imageUrl]
//       );

//       // Update snap streak if sending an image
//       if (imageUrl) {
//         await updateSnapStreak(req.user.id);
//       }
//     } else if (type === 'community') {
//       // Send community message
//       [result] = await pool.query(
//         'INSERT INTO chat_messages (sender_id, community_id, message, image_url) VALUES (?, ?, ?, ?)',
//         [req.user.id, id, message, imageUrl]
//       );

//       // Update snap streak if sending an image
//       if (imageUrl) {
//         await updateSnapStreak(req.user.id);
//       }
//     } else {
//       return res.status(400).json({ message: 'Invalid conversation type' });
//     }

//     // Create activity log
//     await createActivityLog('message_sent', req.user.id, id, 'Message sent');

//     res.status(201).json({ 
//       message: 'Message sent successfully',
//       messageId: result.insertId
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Helper function to update snap streak
// const updateSnapStreak = async (userId) => {
//   try {
//     // Get user's current points and last snap time
//     const [users] = await pool.query(
//       'SELECT points, last_snap_time FROM users WHERE id = ?',
//       [userId]
//     );

//     if (users.length === 0) return;

//     const user = users[0];
//     const now = new Date();
//     const lastSnapTime = user.last_snap_time ? new Date(user.last_snap_time) : null;

//     // Calculate time difference in hours
//     let hoursDiff = 24;
//     if (lastSnapTime) {
//       hoursDiff = (now - lastSnapTime) / (1000 * 60 * 60);
//     }

//     let newPoints = user.points;
    
//     // If last snap was within 24 hours, increment streak
//     if (hoursDiff <= 24) {
//       newPoints += 1;
//     } else {
//       // Reset streak if more than 24 hours
//       newPoints = 1;
//     }

//     // Update user's points and last snap time
//     await pool.query(
//       'UPDATE users SET points = ?, last_snap_time = NOW() WHERE id = ?',
//       [newPoints, userId]
//     );

//     // Create activity log
//     await createActivityLog('points_updated', userId, null, `Points updated to ${newPoints}`);
//   } catch (error) {
//     console.error('Error updating snap streak:', error);
//   }
// };

// module.exports = {
//   getConversations,
//   getMessages,
//   sendMessage
// };