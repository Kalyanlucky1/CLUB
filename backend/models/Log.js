const { pool } = require('../config/db');

class Log {
  static async create(type, user_id, target_id, details) {
    const [result] = await pool.query(
      `INSERT INTO activity_logs 
       (type, user_id, target_id, details) 
       VALUES (?, ?, ?, ?)`,
      [type, user_id, target_id, details]
    );
    return result.insertId;
  }

  static async getAll({ type, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    
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
    params.push(parseInt(limit), offset);

    const [rows] = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM activity_logs';
    if (type) {
      countQuery += ' WHERE type = ?';
    }
    const [total] = await pool.query(countQuery, type ? [type] : []);

    return {
      logs: rows,
      total: total[0].count,
      page: parseInt(page),
      limit: parseInt(limit)
    };
  }

  static async getRecentActivities(limit = 10) {
    const [rows] = await pool.query(
      `SELECT al.*, u.name as user_name
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  }

  static async getStats() {
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

    return {
      totalUsers: totalUsers[0].count,
      activeUsers: activeUsers[0].count,
      totalEvents: totalEvents[0].count,
      upcomingEvents: upcomingEvents[0].count,
      totalCommunities: totalCommunities[0].count,
      newSignups: newSignups[0].count
    };
  }
}

module.exports = Log;