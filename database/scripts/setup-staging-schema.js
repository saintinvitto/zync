const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL não definida');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  const schemaSql = fs.readFileSync(path.resolve(__dirname, '../schema.sql'), 'utf8');

  await client.query(`
    CREATE SCHEMA IF NOT EXISTS zync_staging;
    SET search_path TO zync_staging;
    ${schemaSql}
  `);

  const { rows } = await client.query('SELECT COUNT(*)::int AS total FROM planos');
  if (rows[0].total === 0) {
    await client.query(`
      INSERT INTO planos (nome, preco, intervalo_dias) VALUES
        ('Básico', 49.90, 30),
        ('Pro', 99.90, 30);
    `);
    console.log('Planos de exemplo inseridos no schema zync_staging.');
  } else {
    console.log('Schema zync_staging já tinha dados, seed pulado.');
  }

  await client.end();
  console.log('Schema zync_staging pronto (tabelas criadas/atualizadas via schema.sql).');
}

main().catch((err) => {
  console.error('Erro ao configurar schema de staging:', err.message);
  process.exit(1);
});
