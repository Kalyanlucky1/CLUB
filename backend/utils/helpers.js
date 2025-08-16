const { pool } = require('../config/db');

// Create activity log
const createActivityLog = async (type, userId, targetId, details) => {
  try {
    await pool.query(
      'INSERT INTO activity_logs (type, user_id, target_id, details) VALUES (?, ?, ?, ?)',
      [type, userId, targetId, details]
    );
  } catch (error) {
    console.error('Error creating activity log:', error);
  }
};

// Get level icon based on points
const getLevelIcon = (points) => {
  if (points > 180) return '😊'; // Smile (181+)
  if (points > 60) return '❤️'; // Heart (61-180)
  return '☮️'; // Peace (1-60)
};

module.exports = {
  createActivityLog,
  getLevelIcon
};