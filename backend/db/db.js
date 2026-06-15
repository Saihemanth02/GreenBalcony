const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

let pool;
if (!connectionString) {
  console.warn('WARNING: DATABASE_URL is not defined in environment variables. Local database query pool is disabled.');
  pool = {
    query: () => { throw new Error('Database pool is disabled. Connect via Supabase REST directly.'); },
    connect: () => { throw new Error('Database pool is disabled. Connect via Supabase REST directly.'); }
  };
} else {
  pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });

  // Test connection on startup
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Database connection failed:', err.message);
    } else {
      console.log('Database connected successfully at:', res.rows[0].now);
    }
  });
}

module.exports = pool;
