const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    const migrationFiles = fs.readdirSync(path.join(__dirname, '../migrations'))
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(__dirname, '../migrations', file), 'utf8');
      console.log(`Running migration: ${file}`);
      await pool.query(sql);
    }

    console.log('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();