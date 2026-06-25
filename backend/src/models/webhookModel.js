const db = require('../config/db');

async function listarPorUsuario(usuarioId) {
  const { rows } = await db.query(
    'SELECT * FROM webhooks WHERE usuario_id = $1 ORDER BY criado_em DESC, id DESC',
    [usuarioId]
  );
  return rows;
}

async function buscarPorId(id, usuarioId) {
  const { rows } = await db.query('SELECT * FROM webhooks WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
  return rows[0];
}

async function criar({ usuarioId, url, eventos, secret }) {
  const { rows } = await db.query(
    'INSERT INTO webhooks (usuario_id, url, eventos, secret) VALUES ($1, $2, $3, $4) RETURNING id',
    [usuarioId, url, JSON.stringify(eventos), secret]
  );
  return buscarPorId(rows[0].id, usuarioId);
}

async function atualizar(id, usuarioId, { url, eventos, ativo }) {
  const campos = [];
  const valores = [];
  let i = 1;

  if (url !== undefined) { campos.push(`url = $${i++}`); valores.push(url); }
  if (eventos !== undefined) { campos.push(`eventos = $${i++}`); valores.push(JSON.stringify(eventos)); }
  if (ativo !== undefined) { campos.push(`ativo = $${i++}`); valores.push(ativo); }

  if (campos.length === 0) return buscarPorId(id, usuarioId);

  valores.push(id, usuarioId);
  await db.query(
    `UPDATE webhooks SET ${campos.join(', ')} WHERE id = $${i++} AND usuario_id = $${i}`,
    valores
  );
  return buscarPorId(id, usuarioId);
}

async function remover(id, usuarioId) {
  await db.query('DELETE FROM webhooks WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
}

async function listarAtivosParaEvento(usuarioId, evento) {
  const { rows } = await db.query(
    'SELECT * FROM webhooks WHERE usuario_id = $1 AND ativo = true AND eventos @> $2::jsonb',
    [usuarioId, JSON.stringify([evento])]
  );
  return rows;
}

module.exports = {
  listarPorUsuario,
  buscarPorId,
  criar,
  atualizar,
  remover,
  listarAtivosParaEvento,
};
