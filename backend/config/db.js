require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const connectDB = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL connected...');
    connection.release();
  } catch (err) {
    console.error('MySQL connection error:', err);
    process.exit(1);
  }
};

module.exports = { pool, connectDB };





// const mysql = require('mysql2/promise');

// const pool = mysql.createPool({
//   host: process.env.DB_HOST || 'localhost',
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || '',
//   database: process.env.DB_NAME || 'tribeshub',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

// module.exports = { pool };

// // const mysql = require('mysql2/promise');
// // require('dotenv').config();

// // const pool = mysql.createPool({
// //   host: process.env.DB_HOST,
// //   user: process.env.DB_USER,
// //   password: process.env.DB_PASSWORD,
// //   database: process.env.DB_NAME,
// //   waitForConnections: true,
// //   connectionLimit: 10,
// //   queueLimit: 0
// // });

// // const connectDB = async () => {
// //   try {
// //     const connection = await pool.getConnection();
// //     console.log('MySQL connected...');
// //     connection.release();
// //   } catch (err) {
// //     console.error('MySQL connection error:', err);
// //     process.exit(1);
// //   }
// // };

// // module.exports = { pool, connectDB };