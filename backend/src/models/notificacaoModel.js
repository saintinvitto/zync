const db = require('../config/db');

async function criar({ usuarioId, leadId, tipo, mensagem }) {
  await db.query(
    'INSERT INTO notificacoes (usuario_id, lead_id, tipo, mensagem) VALUES (?, ?, ?, ?)',
    [usuarioId, leadId || null, tipo, mensagem]
  );
}

async function listarPorUsuario(usuarioId, { lida, limit } = {}) {
  const limiteNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));

  const condicoes = ['usuario_id = ?'];
  const params = [usuarioId];

  if (lida !== undefined) {
    condicoes.push('lida = ?');
    params.push(lida === 'true' || lida === true ? 1 : 0);
  }

  const [rows] = await db.query(
    `SELECT * FROM notificacoes WHERE ${condicoes.join(' AND ')} ORDER BY criado_em DESC, id DESC LIMIT ?`,
    [...params, limiteNum]
  );

  return rows;
}

async function buscarPorId(id, usuarioId) {
  const [rows] = await db.query(
    'SELECT * FROM notificacoes WHERE id = ? AND usuario_id = ?',
    [id, usuarioId]
  );
  return rows[0];
}

async function contarNaoLidas(usuarioId) {
  const [rows] = await db.query(
    'SELECT COUNT(*) AS total FROM notificacoes WHERE usuario_id = ? AND lida = 0',
    [usuarioId]
  );
  return rows[0].total;
}

async function marcarComoLida(id, usuarioId) {
  await db.query(
    'UPDATE notificacoes SET lida = 1 WHERE id = ? AND usuario_id = ?',
    [id, usuarioId]
  );
}

async function marcarTodasComoLidas(usuarioId) {
  await db.query(
    'UPDATE notificacoes SET lida = 1 WHERE usuario_id = ? AND lida = 0',
    [usuarioId]
  );
}

module.exports = { criar, listarPorUsuario, buscarPorId, contarNaoLidas, marcarComoLida, marcarTodasComoLidas };
