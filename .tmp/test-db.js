const pg = require('../node_modules/pg');

// Test 1: pooler with ssl rejectUnauthorized false
const pool1 = new pg.Pool({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.heumhtrrtfwbpoapyupv',
  password: 'Xm0sfzhmOCmEQULv',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

pool1.query('SELECT 1 as n')
  .then(r => { console.log('POOLER SSL=false SUCCESS:', JSON.stringify(r.rows)); pool1.end(); })
  .catch(e => { console.error('POOLER SSL=false FAIL:', e.message); pool1.end(); });
