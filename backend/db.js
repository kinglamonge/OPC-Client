const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',           // Sesuaikan dengan user PostgreSQL Anda
  host: 'localhost',
  database: 'sasa_macheyeopc',   // Nama database
  password: 'sonic125RS',  // Sesuaikan dengan password PostgreSQL Anda
  port: 5432,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

module.exports = pool;