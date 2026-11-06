const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',        
  host: 'localhost',
  database: 'sasa_macheyeopc',  
  password: 'sonic125RS',  
  port: 5432,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

module.exports = pool;