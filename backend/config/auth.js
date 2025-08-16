const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateUserToken = (user) => {
  return jwt.sign(
    {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: 'user'
      }
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const generateAdminToken = (admin) => {
  return jwt.sign(
    {
      admin: {
        id: admin.id,
        email: admin.email,
        role: 'admin'
      }
    },
    process.env.JWT_ADMIN_SECRET,
    { expiresIn: '1d' }
  );
};

const verifyUserToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const verifyAdminToken = (token) => {
  return jwt.verify(token, process.env.JWT_ADMIN_SECRET);
};

module.exports = {
  generateUserToken,
  generateAdminToken,
  verifyUserToken,
  verifyAdminToken
};