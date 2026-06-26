const db = require('../config/db');

async function listarPorLead(leadId, { page, limit } = {}) {
  if (page === undefined && limit === undefined) {
    const { rows } = await db.query(
      'SELECT * FROM mensagens WHERE lead_id = $1 ORDER BY criado_em ASC, id ASC',
      [leadId]
    );
    return rows;
  }

  const paginaNum = Math.max(1, parseInt(page, 10) || 1);
  const limiteNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (paginaNum - 1) * limiteNum;

  const { rows } = await db.query(
    'SELECT * FROM mensagens WHERE lead_id = $1 ORDER BY criado_em ASC, id ASC LIMIT $2 OFFSET $3',
    [leadId, limiteNum, offset]
  );

  const { rows: totalRows } = await db.query(
    'SELECT COUNT(*)::int AS total FROM mensagens WHERE lead_id = $1',
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

async function criar({ leadId, conteudo, enviadoPor, tipo, midiaId, midiaMimeType }) {
  const { rows } = await db.query(
    `INSERT INTO mensagens (lead_id, conteudo, enviado_por, tipo, midia_id, midia_mime_type)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [leadId, conteudo ?? null, enviadoPor, tipo || 'texto', midiaId || null, midiaMimeType || null]
  );
  return rows[0];
}

async function buscarPorId(id) {
  const { rows } = await db.query('SELECT * FROM mensagens WHERE id = $1', [id]);
  return rows[0];
}

module.exports = { listarPorLead, criar, buscarPorId };
