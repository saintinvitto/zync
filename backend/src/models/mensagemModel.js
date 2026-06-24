const db = require('../config/db');

async function listarPorLead(leadId) {
  const [rows] = await db.query(
    'SELECT * FROM mensagens WHERE lead_id = ? ORDER BY criado_em ASC',
    [leadId]
  );
  return rows;
}

async function criar({ leadId, conteudo, enviadoPor }) {
  const [result] = await db.query(
    'INSERT INTO mensagens (lead_id, conteudo, enviado_por) VALUES (?, ?, ?)',
    [leadId, conteudo, enviadoPor]
  );
  const [rows] = await db.query('SELECT * FROM mensagens WHERE id = ?', [result.insertId]);
  return rows[0];
}

module.exports = { listarPorLead, criar };
