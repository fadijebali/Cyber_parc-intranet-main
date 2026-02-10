const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log('Tables:', tables.rows.map(r => r.table_name));
  for (const row of tables.rows) {
    const name = row.table_name;
    const count = await pool.query(`SELECT COUNT(*)::int AS count FROM "${name}"`);
    console.log(`${name}:`, count.rows[0].count);
  }
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
