const db = require('../config/db');

async function listarAtivos() {
  const [rows] = await db.query('SELECT * FROM planos WHERE ativo = 1 ORDER BY preco ASC, id ASC');
  return rows;
}

async function buscarPorId(id) {
  const [rows] = await db.query('SELECT * FROM planos WHERE id = ?', [id]);
  return rows[0];
}

module.exports = { listarAtivos, buscarPorId };
