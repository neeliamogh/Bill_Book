// Database connection helper using pg Pool
const { Pool } = require('pg');
require('dotenv').config();

// Detect production or cloud environments requiring SSL (non-localhost)
const isProduction = process.env.NODE_ENV === 'production' || 
  (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1'));

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
