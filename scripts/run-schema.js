const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

const PROJECT_REF = 'mrmwwlqolqsoyuxasrta';
const SUPABASE_TOKEN = 'sbp_b7c5fd3681e6fe8c9e6a5029d50744668b915d41';

fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: sql })
})
.then(r => r.json())
.then(d => {
  console.log('Schema result:', JSON.stringify(d).slice(0, 1000));
})
.catch(e => console.error('Error:', e));
