// Add this at the very top to ensure it loads first
require('dotenv').config({ path: '../.env' }); // Adjust path if needed

console.log('Environment variables:', {
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD ? '*****' : 'MISSING', // Mask password
  DB_NAME: process.env.DB_NAME
});

const mysql = require('mysql2/promise');

async function testConnection() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  };

  console.log('Trying to connect with:', {
    ...config,
    password: config.password ? '*****' : 'MISSING'
  });

  try {
    const connection = await mysql.createConnection(config);
    console.log('Successfully connected to MySQL!');
    await connection.end();
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

testConnection();




// require('dotenv').config();
// const mysql = require('mysql2/promise');

// async function testConnection() {
//   try {
//     const connection = await mysql.createConnection({
//       host: process.env.DB_HOST,
//       user: process.env.DB_USER,
//       password: process.env.DB_PASSWORD,
//       database: process.env.DB_NAME
//     });
//     console.log('Successfully connected to MySQL!');
//     await connection.end();
//   } catch (err) {
//     console.error('Connection failed:', err);
//   }
// }

// testConnection();