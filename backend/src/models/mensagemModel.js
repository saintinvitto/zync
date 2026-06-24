const db = require('../config/db');

async function listarPorLead(leadId, { page, limit } = {}) {
  if (page === undefined && limit === undefined) {
    const [rows] = await db.query(
      'SELECT * FROM mensagens WHERE lead_id = ? ORDER BY criado_em ASC, id ASC',
      [leadId]
    );
    return rows;
  }

  const paginaNum = Math.max(1, parseInt(page, 10) || 1);
  const limiteNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (paginaNum - 1) * limiteNum;

  const [rows] = await db.query(
    'SELECT * FROM mensagens WHERE lead_id = ? ORDER BY criado_em ASC, id ASC LIMIT ? OFFSET ?',
    [leadId, limiteNum, offset]
  );

  const [totalRows] = await db.query(
    'SELECT COUNT(*) AS total FROM mensagens WHERE lead_id = ?',
    [leadId]
  );
  const total = totalRows[0].total;

  return {
    dados: rows,
    pagina: paginaNum,
    limite: limiteNum,
    total,
    totalPaginas: Math.ceil(total / limiteNum),
  };
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
