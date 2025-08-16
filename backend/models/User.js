const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const { createActivityLog } = require('../utils/helpers');

class User {
  static async findByEmailOrUsername(emailOrUsername) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [emailOrUsername, emailOrUsername]
    );
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, name, username, email, phone, bio, profile_pic, interests, country, state, city, points, status, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async create(userData) {
    const { name, username, email, phone, password, bio, interests, country, state, city, profile_pic } = userData;
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      `INSERT INTO users 
       (name, username, email, phone, password_hash, bio, profile_pic, interests, country, state, city) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, username, email, phone, hashedPassword, bio, profile_pic, interests, country, state, city]
    );

    await createActivityLog('signup', result.insertId, null, 'New user registration');
    return result.insertId;
  }

  static async updateProfile(userId, updateData) {
    const { name, bio, interests, country, state, city, profile_pic } = updateData;
    
    const [result] = await pool.query(
      `UPDATE users SET 
       name = COALESCE(?, name),
       bio = COALESCE(?, bio),
       interests = COALESCE(?, interests),
       country = COALESCE(?, country),
       state = COALESCE(?, state),
       city = COALESCE(?, city),
       profile_pic = COALESCE(?, profile_pic)
       WHERE id = ?`,
      [name, bio, interests, country, state, city, profile_pic, userId]
    );

    if (result.affectedRows > 0) {
      await createActivityLog('profile_update', userId, null, 'Profile updated');
      return true;
    }
    return false;
  }

  static async updatePassword(userId, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const [result] = await pool.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    if (result.affectedRows > 0) {
      await createActivityLog('password_change', userId, null, 'Password changed');
      return true;
    }
    return false;
  }

  static async setResetToken(email, phone, token, expires) {
    const [result] = await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ? AND phone = ?',
      [token, expires, email, phone]
    );
    return result.affectedRows > 0;
  }

  static async findByResetToken(token) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );
    return rows[0];
  }

  static async clearResetToken(userId) {
    await pool.query(
      'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [userId]
    );
  }

  static async updateLastLogin(userId) {
    await pool.query(
      'UPDATE users SET last_login_time = NOW() WHERE id = ?',
      [userId]
    );
  }

  static async updatePoints(userId, points) {
    await pool.query(
      'UPDATE users SET points = ?, last_snap_time = NOW() WHERE id = ?',
      [points, userId]
    );
    await createActivityLog('points_updated', userId, null, `Points updated to ${points}`);
  }

  static async updateStatus(userId, status) {
    const [result] = await pool.query(
      'UPDATE users SET status = ? WHERE id = ?',
      [status, userId]
    );
    return result.affectedRows > 0;
  }

  static async getAllUsers() {
    const [rows] = await pool.query(
      'SELECT id, name, username, email, phone, status, points, created_at FROM users'
    );
    return rows;
  }

  static async searchUsers(query) {
    const [rows] = await pool.query(
      `SELECT id, name, username, profile_pic, points 
       FROM users 
       WHERE name LIKE ? OR username LIKE ? 
       LIMIT 10`,
      [`%${query}%`, `%${query}%`]
    );
    return rows;
  }
}

module.exports = User;