const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Detect production or cloud environments requiring SSL (non-localhost)
const isProduction = process.env.NODE_ENV === 'production' || 
  (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1'));

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

// Function to automatically initialize database if empty
const initializeDatabase = async () => {
  try {
    // Check if the 'admins' table exists
    const checkQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admins'
      );
    `;
    const res = await pool.query(checkQuery);
    const tableExists = res.rows[0].exists;

    if (!tableExists) {
      console.log('[Database Init] "admins" table not found. Initializing database schema...');
      
      // Load and execute schema.sql
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
      console.log('[Database Init] Schema migration completed successfully.');

      // Load and execute seed.sql
      const seedPath = path.join(__dirname, 'seed.sql');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await pool.query(seedSql);
      console.log('[Database Init] Seeding completed successfully.');
    } else {
      console.log('[Database Init] Database already initialized.');
    }
  } catch (err) {
    console.error('[Database Init Error] Failed to initialize database:', err);
  }
};

// Trigger database initialization on load
initializeDatabase();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
