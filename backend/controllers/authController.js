const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { uploadToCloudinary } = require('../config/cloudinary');
const { createActivityLog } = require('../utils/helpers');

// Register a new user
const registerUser = async (req, res) => {
  try {
    const { name, username, email, phone, password, bio, interests, country, state, city } = req.body;
    const profilePic = req.file;

    // Validate required fields
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'Name, username, email, and password are required' });
    }

    // Check if username or email already exists
    const [existingUser] = await pool.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Upload profile picture if provided
    let profilePicUrl = '';
    if (profilePic) {
      const result = await uploadToCloudinary(profilePic.path);
      profilePicUrl = result.secure_url;
    }

    // Insert new user
    const [result] = await pool.query(
      'INSERT INTO users (name, username, email, phone, password_hash, bio, profile_pic, interests, country, state, city) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, username, email, phone, hashedPassword, bio, profilePicUrl, interests, country, state, city]
    );

    // Create activity log
    await createActivityLog('signup', result.insertId, null, 'New user registration');

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    // Find user by email or username
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [emailOrUsername, emailOrUsername]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check account status
    if (user.status !== 'active') {
      return res.status(403).json({ 
        message: `Account is ${user.status}. Please contact support.` 
      });
    }

    // Update last login time
    await pool.query(
      'UPDATE users SET last_login_time = NOW() WHERE id = ?',
      [user.id]
    );

    // Create JWT token
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: 'user'
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email, phone } = req.body;

    // Verify email and phone match
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND phone = ?',
      [email, phone]
    );

    if (users.length === 0) {
      return res.status(400).json({ 
        message: 'No user found with that email and phone combination' 
      });
    }

    // Generate reset token (simple 6-digit code for demo)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    // Store token in database
    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, resetTokenExpires, users[0].id]
    );

    // In production: Send email with reset token
    console.log(`Reset token for ${email}: ${resetToken}`);

    res.json({ 
      message: 'If your email and phone match, you will receive a reset code',
      token: resetToken // Only for development/testing
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Find user with valid reset token
    const [users] = await pool.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear reset token
    await pool.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, users[0].id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current password hash
    const [users] = await pool.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
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

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Server error during password change' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  changePassword
};









// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { pool } = require('../config/db');
// const { uploadToCloudinary } = require('../config/cloudinary');
// const { createActivityLog } = require('../utils/helpers');

// // Register a new user
// const registerUser = async (req, res) => {
//   const { name, username, email, phone, password, bio, interests, country, state, city } = req.body;
//   const profilePic = req.file;

//   try {
//     // Check if username or email already exists
//     const [existingUser] = await pool.query(
//       'SELECT * FROM users WHERE username = ? OR email = ?',
//       [username, email]
//     );

//     if (existingUser.length > 0) {
//       return res.status(400).json({ message: 'Username or email already exists' });
//     }

//     // Hash password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     // Upload profile picture to Cloudinary if provided
//     let profilePicUrl = '';
//     if (profilePic) {
//       const result = await uploadToCloudinary(profilePic.path);
//       profilePicUrl = result.secure_url;
//     }

//     // Insert new user
//     const [result] = await pool.query(
//       'INSERT INTO users (name, username, email, phone, password_hash, bio, profile_pic, interests, country, state, city) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
//       [name, username, email, phone, hashedPassword, bio, profilePicUrl, interests, country, state, city]
//     );

//     // Create activity log
//     await createActivityLog('signup', result.insertId, null, 'New user registration');

//     res.status(201).json({ message: 'User registered successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Login user
// const loginUser = async (req, res) => {
//   const { emailOrUsername, password } = req.body;

//   try {
//     // Find user by email or username
//     const [users] = await pool.query(
//       'SELECT * FROM users WHERE email = ? OR username = ?',
//       [emailOrUsername, emailOrUsername]
//     );

//     if (users.length === 0) {
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }

//     const user = users[0];

//     // Check password
//     const isMatch = await bcrypt.compare(password, user.password_hash);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }

//     // Check if user is banned or suspended
//     if (user.status !== 'active') {
//       return res.status(403).json({ message: `Account is ${user.status}. Please contact support.` });
//     }

//     // Update last login time
//     await pool.query(
//       'UPDATE users SET last_login_time = NOW() WHERE id = ?',
//       [user.id]
//     );

//     // Create JWT token
//     const payload = {
//       user: {
//         id: user.id,
//         username: user.username,
//         email: user.email,
//         role: 'user'
//       }
//     };

//     jwt.sign(
//       payload,
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' },
//       (err, token) => {
//         if (err) throw err;
        
//         // Create activity log
//         createActivityLog('login', user.id, null, 'User logged in');
        
//         res.json({ token });
//       }
//     );
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Forgot password
// const forgotPassword = async (req, res) => {
//   const { email, phone } = req.body;

//   try {
//     // Verify email and phone match
//     const [users] = await pool.query(
//       'SELECT * FROM users WHERE email = ? AND phone = ?',
//       [email, phone]
//     );

//     if (users.length === 0) {
//       return res.status(400).json({ message: 'No user found with that email and phone combination' });
//     }

//     // Generate reset token (simple 6-digit code for demo)
//     const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
//     const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

//     // Store token in database (in a real app, you'd have a password_reset_tokens table)
//     await pool.query(
//       'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
//       [resetToken, resetTokenExpires, users[0].id]
//     );

//     // In a real app, send email with reset link
//     console.log(`Reset token for ${email}: ${resetToken}`);

//     res.json({ message: 'If your email and phone match our records, you will receive a reset link' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Reset password
// const resetPassword = async (req, res) => {
//   const { token, newPassword } = req.body;

//   try {
//     // Find user with valid reset token
//     const [users] = await pool.query(
//       'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
//       [token]
//     );

//     if (users.length === 0) {
//       return res.status(400).json({ message: 'Invalid or expired token' });
//     }

//     const user = users[0];

//     // Hash new password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(newPassword, salt);

//     // Update password and clear reset token
//     await pool.query(
//       'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
//       [hashedPassword, user.id]
//     );

//     // Create activity log
//     await createActivityLog('password_reset', user.id, null, 'Password reset successfully');

//     res.json({ message: 'Password reset successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Change password
// const changePassword = async (req, res) => {
//   const { currentPassword, newPassword } = req.body;
//   const userId = req.user.id;

//   try {
//     // Get current password hash
//     const [users] = await pool.query(
//       'SELECT password_hash FROM users WHERE id = ?',
//       [userId]
//     );

//     if (users.length === 0) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const user = users[0];

//     // Verify current password
//     const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Current password is incorrect' });
//     }

//     // Hash new password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(newPassword, salt);

//     // Update password
//     await pool.query(
//       'UPDATE users SET password_hash = ? WHERE id = ?',
//       [hashedPassword, userId]
//     );

//     // Create activity log
//     await createActivityLog('password_change', userId, null, 'Password changed successfully');

//     res.json({ message: 'Password changed successfully' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// module.exports = {
//   registerUser,
//   loginUser,
//   forgotPassword,
//   resetPassword,
//   changePassword
// };




// // const bcrypt = require('bcryptjs');
// // const jwt = require('jsonwebtoken');
// // const { pool } = require('../config/db');
// // const { uploadToCloudinary } = require('../config/cloudinary');
// // const { createActivityLog } = require('../utils/helpers');

// // const registerUser = async (req, res) => {
// //   const { name, username, email, phone, password, bio, interests, country, state, city } = req.body;
// //   const profilePic = req.file;

// //   try {
// //     // Check if username or email exists
// //     const [existing] = await pool.query(
// //       'SELECT * FROM users WHERE username = ? OR email = ?',
// //       [username, email]
// //     );

// //     if (existing.length > 0) {
// //       return res.status(400).json({ message: 'Username or email already exists' });
// //     }

// //     // Hash password
// //     const salt = await bcrypt.genSalt(10);
// //     const hashedPassword = await bcrypt.hash(password, salt);

// //     // Upload profile picture if exists
// //     let profilePicUrl = '';
// //     if (profilePic) {
// //       const result = await uploadToCloudinary(profilePic.path);
// //       profilePicUrl = result.secure_url;
// //     }

// //     // Insert user
// //     const [result] = await pool.query(
// //       `INSERT INTO users (name, username, email, phone, password_hash, bio, 
// //        profile_pic, interests, country, state, city) 
// //        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
// //       [name, username, email, phone, hashedPassword, bio, 
// //        profilePicUrl, interests, country, state, city]
// //     );

// //     // Log activity
// //     await createActivityLog('signup', result.insertId, null, 'New user registered');

// //     res.status(201).json({ message: 'User registered successfully' });
// //   } catch (error) {
// //     console.error(error);
// //     res.status(500).json({ message: 'Server error' });
// //   }
// // };

// // const loginUser = async (req, res) => {
// //   const { emailOrUsername, password } = req.body;

// //   try {
// //     // Find user
// //     const [users] = await pool.query(
// //       'SELECT * FROM users WHERE email = ? OR username = ?',
// //       [emailOrUsername, emailOrUsername]
// //     );

// //     if (users.length === 0) {
// //       return res.status(400).json({ message: 'Invalid credentials' });
// //     }

// //     const user = users[0];

// //     // Check password
// //     const isMatch = await bcrypt.compare(password, user.password_hash);
// //     if (!isMatch) {
// //       return res.status(400).json({ message: 'Invalid credentials' });
// //     }

// //     // Check account status
// //     if (user.status !== 'active') {
// //       return res.status(403).json({ 
// //         message: `Account is ${user.status}. Contact support.` 
// //       });
// //     }

// //     // Update last login
// //     await pool.query(
// //       'UPDATE users SET last_login_time = NOW() WHERE id = ?',
// //       [user.id]
// //     );

// //     // Create JWT
// //     const token = jwt.sign(
// //       {
// //         user: {
// //           id: user.id,
// //           username: user.username,
// //           email: user.email,
// //           role: 'user'
// //         }
// //       },
// //       process.env.JWT_SECRET,
// //       { expiresIn: '7d' }
// //     );

// //     // Log activity
// //     await createActivityLog('login', user.id, null, 'User logged in');

// //     res.json({ token });
// //   } catch (error) {
// //     console.error(error);
// //     res.status(500).json({ message: 'Server error' });
// //   }
// // };

// // // Other auth controller functions (forgotPassword, resetPassword, changePassword)
// // // would follow the same pattern...

// // module.exports = {
// //   registerUser,
// //   loginUser,
// //   forgotPassword,
// //   resetPassword,
// //   changePassword
// // };



// // // const bcrypt = require('bcryptjs');
// // // const jwt = require('jsonwebtoken');
// // // const { pool } = require('../config/db');
// // // const { uploadToCloudinary } = require('../config/cloudinary');
// // // const { createActivityLog } = require('../utils/socket');

// // // // Register a new user
// // // const registerUser = async (req, res) => {
// // //   const { name, username, email, phone, password, bio, interests, country, state, city } = req.body;
// // //   const profilePic = req.file;

// // //   try {
// // //     // Check if username or email already exists
// // //     const [existingUser] = await pool.query(
// // //       'SELECT * FROM users WHERE username = ? OR email = ?',
// // //       [username, email]
// // //     );

// // //     if (existingUser.length > 0) {
// // //       return res.status(400).json({ message: 'Username or email already exists' });
// // //     }

// // //     // Hash password
// // //     const salt = await bcrypt.genSalt(10);
// // //     const hashedPassword = await bcrypt.hash(password, salt);

// // //     // Upload profile picture to Cloudinary if provided
// // //     let profilePicUrl = '';
// // //     if (profilePic) {
// // //       const result = await uploadToCloudinary(profilePic.path);
// // //       profilePicUrl = result.secure_url;
// // //     }

// // //     // Insert new user
// // //     const [result] = await pool.query(
// // //       'INSERT INTO users (name, username, email, phone, password_hash, bio, profile_pic, interests, country, state, city) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
// // //       [name, username, email, phone, hashedPassword, bio, profilePicUrl, interests, country, state, city]
// // //     );

// // //     // Create activity log
// // //     await createActivityLog('signup', result.insertId, null, 'New user registration');

// // //     res.status(201).json({ message: 'User registered successfully' });
// // //   } catch (error) {
// // //     console.error(error);
// // //     res.status(500).json({ message: 'Server error' });
// // //   }
// // // };

// // // // Login user
// // // const loginUser = async (req, res) => {
// // //   const { emailOrUsername, password } = req.body;

// // //   try {
// // //     // Find user by email or username
// // //     const [users] = await pool.query(
// // //       'SELECT * FROM users WHERE email = ? OR username = ?',
// // //       [emailOrUsername, emailOrUsername]
// // //     );

// // //     if (users.length === 0) {
// // //       return res.status(400).json({ message: 'Invalid credentials' });
// // //     }

// // //     const user = users[0];

// // //     // Check password
// // //     const isMatch = await bcrypt.compare(password, user.password_hash);
// // //     if (!isMatch) {
// // //       return res.status(400).json({ message: 'Invalid credentials' });
// // //     }

// // //     // Check if user is banned or suspended
// // //     if (user.status !== 'active') {
// // //       return res.status(403).json({ message: `Account is ${user.status}. Please contact support.` });
// // //     }

// // //     // Update last login time
// // //     await pool.query(
// // //       'UPDATE users SET last_login_time = NOW() WHERE id = ?',
// // //       [user.id]
// // //     );

// // //     // Create JWT token
// // //     const payload = {
// // //       user: {
// // //         id: user.id,
// // //         username: user.username,
// // //         email: user.email,
// // //         role: 'user'
// // //       }
// // //     };

// // //     jwt.sign(
// // //       payload,
// // //       process.env.JWT_SECRET,
// // //       { expiresIn: '7d' },
// // //       (err, token) => {
// // //         if (err) throw err;
        
// // //         // Create activity log
// // //         createActivityLog('login', user.id, null, 'User logged in');
        
// // //         res.json({ token });
// // //       }
// // //     );
// // //   } catch (error) {
// // //     console.error(error);
// // //     res.status(500).json({ message: 'Server error' });
// // //   }
// // // };

// // // // Forgot password
// // // const forgotPassword = async (req, res) => {
// // //   const { email, phone } = req.body;

// // //   try {
// // //     // Verify email and phone match
// // //     const [users] = await pool.query(
// // //       'SELECT * FROM users WHERE email = ? AND phone = ?',
// // //       [email, phone]
// // //     );

// // //     if (users.length === 0) {
// // //       return res.status(400).json({ message: 'No user found with that email and phone combination' });
// // //     }

// // //     // Generate reset token (simple 6-digit code for demo)
// // //     const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
// // //     const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

// // //     // Store token in database (in a real app, you'd have a password_reset_tokens table)
// // //     await pool.query(
// // //       'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
// // //       [resetToken, resetTokenExpires, users[0].id]
// // //     );

// // //     // In a real app, send email with reset link
// // //     console.log(`Reset token for ${email}: ${resetToken}`);

// // //     res.json({ message: 'If your email and phone match our records, you will receive a reset link' });
// // //   } catch (error) {
// // //     console.error(error);
// // //     res.status(500).json({ message: 'Server error' });
// // //   }
// // // };

// // // // Reset password
// // // const resetPassword = async (req, res) => {
// // //   const { token, newPassword } = req.body;

// // //   try {
// // //     // Find user with valid reset token
// // //     const [users] = await pool.query(
// // //       'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
// // //       [token]
// // //     );

// // //     if (users.length === 0) {
// // //       return res.status(400).json({ message: 'Invalid or expired token' });
// // //     }

// // //     const user = users[0];

// // //     // Hash new password
// // //     const salt = await bcrypt.genSalt(10);
// // //     const hashedPassword = await bcrypt.hash(newPassword, salt);

// // //     // Update password and clear reset token
// // //     await pool.query(
// // //       'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
// // //       [hashedPassword, user.id]
// // //     );

// // //     // Create activity log
// // //     await createActivityLog('password_reset', user.id, null, 'Password reset successfully');

// // //     res.json({ message: 'Password reset successfully' });
// // //   } catch (error) {
// // //     console.error(error);
// // //     res.status(500).json({ message: 'Server error' });
// // //   }
// // // };

// // // // Change password
// // // const changePassword = async (req, res) => {
// // //   const { currentPassword, newPassword } = req.body;
// // //   const userId = req.user.id;

// // //   try {
// // //     // Get current password hash
// // //     const [users] = await pool.query(
// // //       'SELECT password_hash FROM users WHERE id = ?',
// // //       [userId]
// // //     );

// // //     if (users.length === 0) {
// // //       return res.status(404).json({ message: 'User not found' });
// // //     }

// // //     const user = users[0];

// // //     // Verify current password
// // //     const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
// // //     if (!isMatch) {
// // //       return res.status(400).json({ message: 'Current password is incorrect' });
// // //     }

// // //     // Hash new password
// // //     const salt = await bcrypt.genSalt(10);
// // //     const hashedPassword = await bcrypt.hash(newPassword, salt);

// // //     // Update password
// // //     await pool.query(
// // //       'UPDATE users SET password_hash = ? WHERE id = ?',
// // //       [hashedPassword, userId]
// // //     );

// // //     // Create activity log
// // //     await createActivityLog('password_change', userId, null, 'Password changed successfully');

// // //     res.json({ message: 'Password changed successfully' });
// // //   } catch (error) {
// // //     console.error(error);
// // //     res.status(500).json({ message: 'Server error' });
// // //   }
// // // };

// // // module.exports = {
// // //   registerUser,
// // //   loginUser,
// // //   forgotPassword,
// // //   resetPassword,
// // //   changePassword
// // // };