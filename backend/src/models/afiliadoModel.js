const crypto = require('crypto');
const db = require('../config/db');

function gerarCodigo() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function criar({ usuarioId, percentualComissao }) {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = gerarCodigo();
    try {
      const { rows } = await db.query(
        `INSERT INTO afiliados (usuario_id, codigo, percentual_comissao)
         VALUES ($1, $2, $3) RETURNING *`,
        [usuarioId, codigo, percentualComissao ?? 20]
      );
      return rows[0];
    } catch (err) {
      if (err.code !== '23505' || tentativa === 4) throw err;
    }
  }
}

async function buscarPorId(id) {
  const { rows } = await db.query('SELECT * FROM afiliados WHERE id = $1', [id]);
  return rows[0];
}

async function buscarPorCodigo(codigo) {
  const { rows } = await db.query(
    'SELECT * FROM afiliados WHERE codigo = $1 AND ativo = true',
    [codigo]
  );
  return rows[0];
}

async function buscarPorUsuarioId(usuarioId) {
  const { rows } = await db.query('SELECT * FROM afiliados WHERE usuario_id = $1', [usuarioId]);
  return rows[0];
}

async function listarTodos() {
  // Subqueries em vez de JOIN direto com usuarios/comissoes_afiliado: as
  // duas relacoes sao 1-pra-muitos independentes entre si, e juntar as duas
  // no mesmo JOIN causa fan-out (cada indicado x cada comissao), duplicando
  // a soma de comissao_pendente/comissao_paga.
  const { rows } = await db.query(`
    SELECT a.id, a.codigo, a.percentual_comissao, a.ativo, a.criado_em,
           u.nome AS usuario_nome, u.email AS usuario_email,
           (SELECT COUNT(*) FROM usuarios ind WHERE ind.indicado_por_afiliado_id = a.id) AS total_indicados,
           (SELECT COALESCE(SUM(c.valor), 0) FROM comissoes_afiliado c WHERE c.afiliado_id = a.id AND c.status = 'pendente') AS comissao_pendente,
           (SELECT COALESCE(SUM(c.valor), 0) FROM comissoes_afiliado c WHERE c.afiliado_id = a.id AND c.status = 'paga') AS comissao_paga
    FROM afiliados a
    JOIN usuarios u ON u.id = a.usuario_id
    ORDER BY a.criado_em DESC
  `);
  return rows;
}

async function atualizar(id, dados) {
  const campos = [];
  const valores = [];
  let i = 1;

  if (dados.percentual_comissao !== undefined) {
    campos.push(`percentual_comissao = $${i++}`);
    valores.push(dados.percentual_comissao);
  }

  if (dados.ativo !== undefined) {
    campos.push(`ativo = $${i++}`);
    valores.push(dados.ativo);
  }

  if (campos.length === 0) return buscarPorId(id);

  await db.query(`UPDATE afiliados SET ${campos.join(', ')} WHERE id = $${i}`, [...valores, id]);
  return buscarPorId(id);
}

module.exports = { criar, buscarPorId, buscarPorCodigo, buscarPorUsuarioId, listarTodos, atualizar };
