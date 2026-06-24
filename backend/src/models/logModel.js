const db = require('../config/db');

async function registrar({ usuarioId, leadId, acao, detalhes }) {
  await db.query(
    'INSERT INTO logs_atividade (usuario_id, lead_id, acao, detalhes) VALUES (?, ?, ?, ?)',
    [usuarioId, leadId || null, acao, detalhes ? JSON.stringify(detalhes) : null]
  );
}

async function listarPorUsuario(usuarioId, { leadId, limit } = {}) {
  const limiteNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  const condicoes = ['usuario_id = ?'];
  const params = [usuarioId];

  if (leadId) {
    condicoes.push('lead_id = ?');
    params.push(leadId);
  }

  const [rows] = await db.query(
    `SELECT * FROM logs_atividade WHERE ${condicoes.join(' AND ')} ORDER BY criado_em DESC, id DESC LIMIT ?`,
    [...params, limiteNum]
  );

  return rows;
}

module.exports = { registrar, listarPorUsuario };
