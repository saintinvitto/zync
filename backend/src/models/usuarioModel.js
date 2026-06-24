const db = require('../config/db');

async function findByEmail(email) {
  const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
  return rows[0];
}

async function create({ nome, email, senha_hash }) {
  const [result] = await db.query(
    'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
    [nome, email, senha_hash]
  );
  return { id: result.insertId, nome, email };
}

module.exports = { findByEmail, create };
