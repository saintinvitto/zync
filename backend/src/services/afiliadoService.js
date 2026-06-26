const usuarioModel = require('../models/usuarioModel');
const afiliadoModel = require('../models/afiliadoModel');
const comissaoAfiliadoModel = require('../models/comissaoAfiliadoModel');

async function gerarComissaoSeAplicavel(assinatura) {
  const usuario = await usuarioModel.buscarPorId(assinatura.usuario_id);
  if (!usuario || !usuario.indicado_por_afiliado_id) return;

  const afiliado = await afiliadoModel.buscarPorId(usuario.indicado_por_afiliado_id);
  if (!afiliado || !afiliado.ativo) return;

  const valor = Number((assinatura.valor * (afiliado.percentual_comissao / 100)).toFixed(2));

  await comissaoAfiliadoModel.criar({
    afiliadoId: afiliado.id,
    usuarioIndicadoId: usuario.id,
    assinaturaId: assinatura.id,
    valor,
  });
}

module.exports = { gerarComissaoSeAplicavel };
