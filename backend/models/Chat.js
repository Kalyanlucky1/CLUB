const { pool } = require('../config/db');
const { createActivityLog } = require('../utils/helpers');

class Chat {
  static async createMessage({ sender_id, receiver_id, community_id, message, image_url }) {
    const [result] = await pool.query(
      `INSERT INTO chat_messages 
       (sender_id, receiver_id, community_id, message, image_url) 
       VALUES (?, ?, ?, ?, ?)`,
      [sender_id, receiver_id, community_id, message, image_url]
    );

    await createActivityLog('message_sent', sender_id, receiver_id || community_id, 'Message sent');
    return result.insertId;
  }

  static async getDirectMessages(user1_id, user2_id) {
    const [rows] = await pool.query(
      `SELECT cm.*, u.name as sender_name, u.profile_pic as sender_avatar, u.points as sender_points
       FROM chat_messages cm
       JOIN users u ON cm.sender_id = u.id
       WHERE (cm.sender_id = ? AND cm.receiver_id = ?) OR (cm.sender_id = ? AND cm.receiver_id = ?)
       ORDER BY cm.created_at`,
      [user1_id, user2_id, user2_id, user1_id]
    );
    return rows;
  }

  static async getCommunityMessages(community_id) {
    const [rows] = await pool.query(
      `SELECT cm.*, u.name as sender_name, u.profile_pic as sender_avatar, u.points as sender_points
       FROM chat_messages cm
       JOIN users u ON cm.sender_id = u.id
       WHERE cm.community_id = ?
       ORDER BY cm.created_at`,
      [community_id]
    );
    return rows;
  }

  static async getConversations(user_id) {
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
      [user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id]
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
      [user_id, user_id]
    );

    return {
      directMessages,
      communityMessages
    };
  }

  static async markMessagesAsRead(sender_id, receiver_id) {
    await pool.query(
      'UPDATE chat_messages SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE',
      [sender_id, receiver_id]
    );
  }

  static async markCommunityMessagesAsRead(community_id, user_id) {
    await pool.query(
      `UPDATE chat_messages SET is_read = TRUE 
       WHERE community_id = ? AND sender_id != ? AND is_read = FALSE`,
      [community_id, user_id]
    );
  }

  static async getUnreadCount(receiver_id) {
    const [rows] = await pool.query(
      `SELECT sender_id, COUNT(*) as count
       FROM chat_messages
       WHERE receiver_id = ? AND is_read = FALSE
       GROUP BY sender_id`,
      [receiver_id]
    );
    return rows;
  }
}

module.exports = Chat;