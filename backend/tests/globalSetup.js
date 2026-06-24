const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  await connection.query('DROP DATABASE IF EXISTS zync_test');

  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8').replace(/zync/g, 'zync_test');
  await connection.query(schemaSql);

  await connection.query(
    "INSERT INTO zync_test.planos (nome, preco, intervalo_dias) VALUES ('Básico', 49.90, 30), ('Pro', 99.90, 30)"
  );

  await connection.end();
};
