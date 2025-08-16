const { pool } = require('../config/db');
const { createActivityLog } = require('../utils/helpers');

class Community {
  static async create({ name, description, image_url, created_by }) {
    const [result] = await pool.query(
      `INSERT INTO communities 
       (name, description, image_url, created_by) 
       VALUES (?, ?, ?, ?)`,
      [name, description, image_url, created_by]
    );

    // Add creator as first member
    await pool.query(
      'INSERT INTO community_members (community_id, user_id) VALUES (?, ?)',
      [result.insertId, created_by]
    );

    await createActivityLog('community_created', created_by, result.insertId, 'New community created');
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT c.*, u.name as creator_name, u.profile_pic as creator_avatar
       FROM communities c
       JOIN users u ON c.created_by = u.id
       WHERE c.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async getAll() {
    const [rows] = await pool.query(
      `SELECT c.*, u.name as creator_name,
       (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as members_count
       FROM communities c
       JOIN users u ON c.created_by = u.id
       ORDER BY c.created_at DESC`
    );
    return rows;
  }

  static async getByMember(userId) {
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.description, c.image_url 
       FROM communities c
       JOIN community_members cm ON c.id = cm.community_id
       WHERE cm.user_id = ?`,
      [userId]
    );
    return rows;
  }

  static async addMember(communityId, userId) {
    const [result] = await pool.query(
      'INSERT INTO community_members (community_id, user_id) VALUES (?, ?)',
      [communityId, userId]
    );

    if (result.affectedRows > 0) {
      await createActivityLog('community_joined', userId, communityId, 'Joined community');
      return true;
    }
    return false;
  }

  static async removeMember(communityId, userId) {
    const [result] = await pool.query(
      'DELETE FROM community_members WHERE community_id = ? AND user_id = ?',
      [communityId, userId]
    );

    if (result.affectedRows > 0) {
      await createActivityLog('community_left', userId, communityId, 'Left community');
      return true;
    }
    return false;
  }

  static async getMembers(communityId) {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.username, u.profile_pic, u.points
       FROM community_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.community_id = ?
       ORDER BY cm.joined_at`,
      [communityId]
    );
    return rows;
  }

  static async isMember(communityId, userId) {
    const [rows] = await pool.query(
      'SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ?',
      [communityId, userId]
    );
    return rows.length > 0;
  }

  static async getAllCommunities() {
    const [rows] = await pool.query(
      `SELECT c.*, u.name as creator_name,
       (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as members_count
       FROM communities c
       JOIN users u ON c.created_by = u.id
       ORDER BY c.created_at DESC`
    );
    return rows;
  }

  static async delete(communityId) {
    const [result] = await pool.query(
      'DELETE FROM communities WHERE id = ?',
      [communityId]
    );
    return result.affectedRows > 0;
  }

  static async search(query) {
    const [rows] = await pool.query(
      `SELECT c.*, u.name as creator_name,
       (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as members_count
       FROM communities c
       JOIN users u ON c.created_by = u.id
       WHERE c.name LIKE ? OR c.description LIKE ?
       ORDER BY c.created_at DESC
       LIMIT 10`,
      [`%${query}%`, `%${query}%`]
    );
    return rows;
  }
}

module.exports = Community;