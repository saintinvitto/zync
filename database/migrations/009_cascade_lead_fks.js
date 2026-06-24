const path = require('path');

const ALTERACOES = [
  { tabela: 'mensagens', coluna: 'lead_id', referencia: 'leads', acao: 'CASCADE' },
  { tabela: 'lead_tags', coluna: 'lead_id', referencia: 'leads', acao: 'CASCADE' },
  { tabela: 'lead_tags', coluna: 'tag_id', referencia: 'tags', acao: 'CASCADE' },
  { tabela: 'agendamentos', coluna: 'lead_id', referencia: 'leads', acao: 'CASCADE' },
  { tabela: 'notificacoes', coluna: 'lead_id', referencia: 'leads', acao: 'CASCADE' },
  { tabela: 'logs_atividade', coluna: 'lead_id', referencia: 'leads', acao: 'SET NULL' },
];

async function aplicar(connection, databaseName) {
  for (const { tabela, coluna, referencia, acao } of ALTERACOES) {
    const [rows] = await connection.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME = ?`,
      [databaseName, tabela, coluna, referencia]
    );

    if (rows.length === 0) {
      console.log(`(sem FK encontrada em ${tabela}.${coluna} -> ${referencia}, pulando)`);
      continue;
    }

    const constraintName = rows[0].CONSTRAINT_NAME;
    await connection.query(`ALTER TABLE ${tabela} DROP FOREIGN KEY ${constraintName}`);
    await connection.query(
      `ALTER TABLE ${tabela} ADD FOREIGN KEY (${coluna}) REFERENCES ${referencia}(id) ON DELETE ${acao}`
    );
    console.log(`${tabela}.${coluna} -> ${referencia}: ON DELETE ${acao} aplicado`);
  }
}

module.exports = { aplicar };

if (require.main === module) {
  const mysql = require(path.resolve(__dirname, '../../backend/node_modules/mysql2/promise'));
  require(path.resolve(__dirname, '../../backend/node_modules/dotenv')).config({
    path: path.resolve(__dirname, '../../backend/.env'),
  });

  (async () => {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    await aplicar(connection, process.env.DB_NAME);
    await connection.end();
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
