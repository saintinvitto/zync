const { Pool } = require('pg');
require('dotenv').config();

const schema = process.env.PG_SCHEMA || (process.env.NODE_ENV === 'test' ? 'zync_test' : undefined);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false,
  options: schema ? `-c search_path=${schema}` : undefined,
});

module.exports = pool;
