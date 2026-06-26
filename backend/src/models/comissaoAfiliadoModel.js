const db = require('../config/db');

async function criar({ afiliadoId, usuarioIndicadoId, assinaturaId, valor }) {
  const { rows } = await db.query(
    `INSERT INTO comissoes_afiliado (afiliado_id, usuario_indicado_id, assinatura_id, valor)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (assinatura_id) DO NOTHING
     RETURNING *`,
    [afiliadoId, usuarioIndicadoId, assinaturaId, valor]
  );
  return rows[0];
}

async function listarPorAfiliado(afiliadoId) {
  const { rows } = await db.query(
    `SELECT c.*, u.nome AS usuario_indicado_nome
     FROM comissoes_afiliado c
     JOIN usuarios u ON u.id = c.usuario_indicado_id
     WHERE c.afiliado_id = $1
     ORDER BY c.criado_em DESC`,
    [afiliadoId]
  );
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await db.query('SELECT * FROM comissoes_afiliado WHERE id = $1', [id]);
  return rows[0];
}

async function marcarPaga(id) {
  await db.query("UPDATE comissoes_afiliado SET status = 'paga' WHERE id = $1", [id]);
}

module.exports = { criar, listarPorAfiliado, buscarPorId, marcarPaga };
