const { pool } = require('../config/db');
const { uploadToCloudinary } = require('../config/cloudinary');
const { createActivityLog } = require('../utils/socket');

// Create a new event
const createEvent = async (req, res) => {
  const { title, description, date, time, location } = req.body;
  const eventImage = req.file;

  try {
    // Validate required fields
    if (!title || !date || !time || !location) {
      return res.status(400).json({ message: 'Title, date, time, and location are required' });
    }

    // Upload event image to Cloudinary if provided
    let imageUrl = '';
    if (eventImage) {
      const result = await uploadToCloudinary(eventImage.path);
      imageUrl = result.secure_url;
    }

    // Insert new event
    const [result] = await pool.query(
      'INSERT INTO events (title, description, date, time, location, image_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description, date, time, location, imageUrl, req.user.id]
    );

    // Create activity log
    await createActivityLog('event_created', req.user.id, result.insertId, 'New event created');

    res.status(201).json({ 
      message: 'Event created successfully',
      eventId: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all events
const getEvents = async (req, res) => {
  try {
    // Get upcoming events (from today onward)
    const [events] = await pool.query(
      `SELECT e.id, e.title, e.description, e.date, e.time, e.location, e.image_url, 
       u.id as creator_id, u.name as creator_name, u.profile_pic as creator_avatar,
       (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) as participants_count
       FROM events e
       JOIN users u ON e.created_by = u.id
       WHERE e.date >= CURDATE()
       ORDER BY e.date, e.time`
    );

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get event details
const getEventDetails = async (req, res) => {
  try {
    const [events] = await pool.query(
      `SELECT e.*, u.id as creator_id, u.name as creator_name, u.profile_pic as creator_avatar
       FROM events e
       JOIN users u ON e.created_by = u.id
       WHERE e.id = ?`,
      [req.params.id]
    );

    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = events[0];

    // Get participants
    const [participants] = await pool.query(
      `SELECT u.id, u.name, u.username, u.profile_pic
       FROM event_participants ep
       JOIN users u ON ep.user_id = u.id
       WHERE ep.event_id = ?`,
      [req.params.id]
    );

    // Check if current user is attending
    let isAttending = false;
    if (req.user) {
      const [attending] = await pool.query(
        'SELECT 1 FROM event_participants WHERE event_id = ? AND user_id = ?',
        [req.params.id, req.user.id]
      );
      isAttending = attending.length > 0;
    }

    res.json({
      ...event,
      participants,
      isAttending
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Join an event
const joinEvent = async (req, res) => {
  try {
    // Check if event exists
    const [events] = await pool.query(
      'SELECT 1 FROM events WHERE id = ?',
      [req.params.id]
    );

    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is already attending
    const [existing] = await pool.query(
      'SELECT 1 FROM event_participants WHERE event_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'You are already attending this event' });
    }

    // Add participant
    await pool.query(
      'INSERT INTO event_participants (event_id, user_id) VALUES (?, ?)',
      [req.params.id, req.user.id]
    );

    // Create activity log
    await createActivityLog('event_joined', req.user.id, req.params.id, 'Joined event');

    res.json({ message: 'You have successfully joined the event' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Leave an event
const leaveEvent = async (req, res) => {
  try {
    // Remove participant
    const [result] = await pool.query(
      'DELETE FROM event_participants WHERE event_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'You are not attending this event' });
    }

    // Create activity log
    await createActivityLog('event_left', req.user.id, req.params.id, 'Left event');

    res.json({ message: 'You have left the event' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all events (admin)
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

// Delete event (admin)
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

module.exports = {
  createEvent,
  getEvents,
  getEventDetails,
  joinEvent,
  leaveEvent,
  getAllEvents,
  deleteEvent
};