const assinaturaModel = require('../models/assinaturaModel');
const planoModel = require('../models/planoModel');
const webhookService = require('../services/webhookService');
const afiliadoService = require('../services/afiliadoService');
const asyncHandler = require('../utils/asyncHandler');
const ntfy = require('../utils/ntfy');

async function receber(req, res) {
  const dados = req.body && req.body.data;
  if (!dados || !dados.id) {
    return res.status(400).json({ error: 'Payload inválido' });
  }

  const assinatura = await assinaturaModel.buscarPorIdentifier(dados.id);
  if (!assinatura) {
    return res.status(200).send();
  }

  if (dados.status === 'completed') {
    if (assinatura.status === 'ativa') {
      return res.status(200).send();
    }
    const plano = await planoModel.buscarPorId(assinatura.plano_id);
    await assinaturaModel.marcarAtiva(dados.id, plano.intervalo_dias);
    await afiliadoService.gerarComissaoSeAplicavel(assinatura);
    ntfy.notificar('Pagamento recebido no Zync!', { titulo: 'Zync · Pagamento aprovado', tag: 'moneybag' });
    webhookService.disparar(assinatura.usuario_id, 'pagamento_aprovado', {
      assinaturaId: assinatura.id,
      planoNome: plano.nome,
      valor: assinatura.valor,
    });
  } else if (dados.status === 'failed' || dados.status === 'refunded') {
    if (assinatura.status === 'cancelada') {
      return res.status(200).send();
    }
    await assinaturaModel.marcarFalha(dados.id);
  }

  res.status(200).send();
}

module.exports = { receber: asyncHandler(receber) };
