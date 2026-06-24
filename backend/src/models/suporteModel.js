const db = require('../config/db');

async function criar({ usuarioId, mensagem, videoUrl }) {
  const { rows } = await db.query(
    'INSERT INTO mensagens_suporte (usuario_id, mensagem, video_url) VALUES ($1, $2, $3) RETURNING id',
    [usuarioId, mensagem, videoUrl || null]
  );
  return buscarPorId(rows[0].id);
}

async function buscarPorId(id) {
  const { rows } = await db.query('SELECT * FROM mensagens_suporte WHERE id = $1', [id]);
  return rows[0];
}

async function listarPorUsuario(usuarioId) {
  const { rows } = await db.query(
    'SELECT * FROM mensagens_suporte WHERE usuario_id = $1 ORDER BY criado_em DESC, id DESC',
    [usuarioId]
  );
  return rows;
}

async function listarTodas() {
  const { rows } = await db.query(
    `SELECT m.*, u.nome AS usuario_nome, u.email AS usuario_email
     FROM mensagens_suporte m
     JOIN usuarios u ON u.id = m.usuario_id
     ORDER BY m.respondida ASC, m.criado_em DESC, m.id DESC`
  );
  return rows;
}

async function marcarRespondida(id) {
  await db.query('UPDATE mensagens_suporte SET respondida = true WHERE id = $1', [id]);
}

module.exports = { criar, buscarPorId, listarPorUsuario, listarTodas, marcarRespondida };
