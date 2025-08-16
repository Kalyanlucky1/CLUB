const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash('Kalyan@111', 10);
    await pool.query(
      `INSERT INTO admin_users (email, password_hash) 
       VALUES ('avscreation37@gmail.com', ?)`,
      [hashedPassword]
    );

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();