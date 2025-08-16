const { pool } = require('../config/db');
const { createActivityLog } = require('../utils/helpers');

class Event {
  static async create({ title, description, date, time, location, image_url, created_by }) {
    const [result] = await pool.query(
      `INSERT INTO events 
       (title, description, date, time, location, image_url, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, description, date, time, location, image_url, created_by]
    );

    await createActivityLog('event_created', created_by, result.insertId, 'New event created');
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT e.*, u.name as creator_name, u.profile_pic as creator_avatar
       FROM events e
       JOIN users u ON e.created_by = u.id
       WHERE e.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async getAllUpcoming() {
    const [rows] = await pool.query(
      `SELECT e.id, e.title, e.description, e.date, e.time, e.location, e.image_url, 
       u.id as creator_id, u.name as creator_name, u.profile_pic as creator_avatar,
       (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) as participants_count
       FROM events e
       JOIN users u ON e.created_by = u.id
       WHERE e.date >= CURDATE()
       ORDER BY e.date, e.time`
    );
    return rows;
  }

  static async getByCreator(creatorId) {
    const [rows] = await pool.query(
      `SELECT id, title, date, time, location 
       FROM events 
       WHERE created_by = ? 
       ORDER BY date, time`,
      [creatorId]
    );
    return rows;
  }

  static async getJoinedByUser(userId) {
    const [rows] = await pool.query(
      `SELECT e.id, e.title, e.date, e.time, e.location 
       FROM events e
       JOIN event_participants ep ON e.id = ep.event_id
       WHERE ep.user_id = ? AND e.date >= CURDATE()
       ORDER BY e.date, e.time`,
      [userId]
    );
    return rows;
  }

  static async addParticipant(eventId, userId) {
    const [result] = await pool.query(
      'INSERT INTO event_participants (event_id, user_id) VALUES (?, ?)',
      [eventId, userId]
    );

    if (result.affectedRows > 0) {
      await createActivityLog('event_joined', userId, eventId, 'Joined event');
      return true;
    }
    return false;
  }

  static async removeParticipant(eventId, userId) {
    const [result] = await pool.query(
      'DELETE FROM event_participants WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );

    if (result.affectedRows > 0) {
      await createActivityLog('event_left', userId, eventId, 'Left event');
      return true;
    }
    return false;
  }

  static async getParticipants(eventId) {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.username, u.profile_pic
       FROM event_participants ep
       JOIN users u ON ep.user_id = u.id
       WHERE ep.event_id = ?`,
      [eventId]
    );
    return rows;
  }

  static async isParticipant(eventId, userId) {
    const [rows] = await pool.query(
      'SELECT 1 FROM event_participants WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );
    return rows.length > 0;
  }

  static async getAllEvents() {
    const [rows] = await pool.query(
      `SELECT e.*, u.name as creator_name, 
       (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) as participants_count
       FROM events e
       JOIN users u ON e.created_by = u.id
       ORDER BY e.date DESC, e.time DESC`
    );
    return rows;
  }

  static async delete(eventId) {
    const [result] = await pool.query(
      'DELETE FROM events WHERE id = ?',
      [eventId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Event;