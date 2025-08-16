const { pool } = require('../config/db');
const { uploadToCloudinary } = require('../config/cloudinary');
const { createActivityLog } = require('../utils/socket');

// Create a new community
const createCommunity = async (req, res) => {
  const { name, description } = req.body;
  const communityImage = req.file;

  try {
    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Community name is required' });
    }

    // Upload community image to Cloudinary if provided
    let imageUrl = '';
    if (communityImage) {
      const result = await uploadToCloudinary(communityImage.path);
      imageUrl = result.secure_url;
    }

    // Insert new community
    const [result] = await pool.query(
      'INSERT INTO communities (name, description, image_url, created_by) VALUES (?, ?, ?, ?)',
      [name, description, imageUrl, req.user.id]
    );

    // Add creator as first member
    await pool.query(
      'INSERT INTO community_members (community_id, user_id) VALUES (?, ?)',
      [result.insertId, req.user.id]
    );

    // Create activity log
    await createActivityLog('community_created', req.user.id, result.insertId, 'New community created');

    res.status(201).json({ 
      message: 'Community created successfully',
      communityId: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all communities
const getCommunities = async (req, res) => {
  try {
    const [communities] = await pool.query(
      `SELECT c.*, u.name as creator_name,
       (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as members_count
       FROM communities c
       JOIN users u ON c.created_by = u.id
       ORDER BY c.created_at DESC`
    );

    // Check if current user is a member of each community
    if (req.user) {
      for (let community of communities) {
        const [isMember] = await pool.query(
          'SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ?',
          [community.id, req.user.id]
        );
        community.isMember = isMember.length > 0;
      }
    }

    res.json(communities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get community details
const getCommunityDetails = async (req, res) => {
  try {
    const [communities] = await pool.query(
      `SELECT c.*, u.name as creator_name, u.profile_pic as creator_avatar
       FROM communities c
       JOIN users u ON c.created_by = u.id
       WHERE c.id = ?`,
      [req.params.id]
    );

    if (communities.length === 0) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const community = communities[0];

    // Get members
    const [members] = await pool.query(
      `SELECT u.id, u.name, u.username, u.profile_pic, u.points
       FROM community_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.community_id = ?
       ORDER BY cm.joined_at`,
      [req.params.id]
    );

    // Check if current user is a member
    let isMember = false;
    if (req.user) {
      const [memberCheck] = await pool.query(
        'SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ?',
        [req.params.id, req.user.id]
      );
      isMember = memberCheck.length > 0;
    }

    res.json({
      ...community,
      members,
      isMember,
      membersCount: members.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Join a community
const joinCommunity = async (req, res) => {
  try {
    // Check if community exists
    const [communities] = await pool.query(
      'SELECT 1 FROM communities WHERE id = ?',
      [req.params.id]
    );

    if (communities.length === 0) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is already a member
    const [existing] = await pool.query(
      'SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'You are already a member of this community' });
    }

    // Add member
    await pool.query(
      'INSERT INTO community_members (community_id, user_id) VALUES (?, ?)',
      [req.params.id, req.user.id]
    );

    // Create activity log
    await createActivityLog('community_joined', req.user.id, req.params.id, 'Joined community');

    res.json({ message: 'You have successfully joined the community' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Leave a community
const leaveCommunity = async (req, res) => {
  try {
    // Remove member
    const [result] = await pool.query(
      'DELETE FROM community_members WHERE community_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'You are not a member of this community' });
    }

    // Create activity log
    await createActivityLog('community_left', req.user.id, req.params.id, 'Left community');

    res.json({ message: 'You have left the community' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all communities (admin)
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

// Delete community (admin)
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

module.exports = {
  createCommunity,
  getCommunities,
  getCommunityDetails,
  joinCommunity,
  leaveCommunity,
  getAllCommunities,
  deleteCommunity
};