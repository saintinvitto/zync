const planoModel = require('../models/planoModel');
const assinaturaModel = require('../models/assinaturaModel');
const syncpayService = require('../services/syncpayService');
const asyncHandler = require('../utils/asyncHandler');
const validators = require('../utils/validators');

async function checkout(req, res) {
  const { planoId, nome, cpf, email, telefone } = req.body;

  if (!planoId || !nome || !cpf || !email || !telefone) {
    return res.status(400).json({ error: 'planoId, nome, cpf, email e telefone são obrigatórios' });
  }

  if (!validators.cpfValido(cpf)) {
    return res.status(400).json({ error: 'cpf inválido' });
  }

  if (!validators.emailValido(email)) {
    return res.status(400).json({ error: 'email inválido' });
  }

  const plano = await planoModel.buscarPorId(planoId);
  if (!plano || !plano.ativo) {
    return res.status(404).json({ error: 'Plano não encontrado' });
  }

  const webhookUrl = `${process.env.BACKEND_PUBLIC_URL}/api/webhooks/syncpay`;

  const { pixCode, identifier } = await syncpayService.criarCobrancaPix({
    valor: plano.preco,
    descricao: `Assinatura Zync - ${plano.nome}`,
    cliente: { name: nome, cpf: cpf.replace(/\D/g, ''), email, phone: telefone.replace(/\D/g, '') },
    webhookUrl,
  });

  const assinatura = await assinaturaModel.criar({
    usuarioId: req.usuario.id,
    planoId: plano.id,
    valor: plano.preco,
    syncpayIdentifier: identifier,
    pixCode,
  });

  res.status(201).json({
    assinaturaId: assinatura.id,
    pixCode,
    identifier,
    valor: plano.preco,
  });
}

async function atual(req, res) {
  const assinatura = await assinaturaModel.buscarAtualPorUsuario(req.usuario.id);
  res.json(assinatura || null);
}

module.exports = {
  checkout: asyncHandler(checkout),
  atual: asyncHandler(atual),
};
