const adminModel = require('../models/adminModel');
const planoModel = require('../models/planoModel');
const usuarioModel = require('../models/usuarioModel');
const suporteModel = require('../models/suporteModel');
const assinaturaModel = require('../models/assinaturaModel');
const asyncHandler = require('../utils/asyncHandler');
const validators = require('../utils/validators');

async function listarUsuarios(req, res) {
  const usuarios = await adminModel.listarUsuarios({ incluirRemovidos: req.query.incluirRemovidos === 'true' });
  res.json(usuarios);
}

async function metricas(req, res) {
  const dados = await adminModel.metricas();
  res.json(dados);
}

async function definirAdmin(req, res) {
  const { isAdmin } = req.body;
  if (typeof isAdmin !== 'boolean') {
    return res.status(400).json({ error: 'isAdmin deve ser true ou false' });
  }

  const usuario = await usuarioModel.buscarPorId(req.params.id);
  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (Number(req.params.id) === req.usuario.id && !isAdmin) {
    return res.status(400).json({ error: 'Você não pode revogar seu próprio acesso de administrador' });
  }

  await usuarioModel.definirAdmin(req.params.id, isAdmin);
  res.json({ ok: true });
}

async function removerUsuario(req, res) {
  const usuario = await usuarioModel.buscarPorId(req.params.id);
  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (Number(req.params.id) === req.usuario.id) {
    return res.status(400).json({ error: 'Você não pode remover a própria conta por aqui' });
  }

  await adminModel.removerUsuario(req.params.id);
  res.status(204).send();
}

async function reativarUsuario(req, res) {
  const usuario = await usuarioModel.buscarPorId(req.params.id);
  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

  await adminModel.reativarUsuario(req.params.id);
  res.status(204).send();
}

async function cancelarAssinatura(req, res) {
  const assinatura = await assinaturaModel.buscarAtualPorUsuario(req.params.id);
  if (!assinatura || assinatura.status !== 'ativa') {
    return res.status(400).json({ error: 'Não há assinatura ativa para cancelar' });
  }

  await assinaturaModel.cancelar(assinatura.id, req.params.id);
  res.status(204).send();
}

async function listarPlanos(req, res) {
  const planos = await planoModel.listarTodos();
  res.json(planos);
}

async function criarPlano(req, res) {
  const { nome, preco, intervaloDias } = req.body;

  if (!nome || preco === undefined) {
    return res.status(400).json({ error: 'nome e preco são obrigatórios' });
  }

  if (!validators.valorPositivo(preco)) {
    return res.status(400).json({ error: 'preco deve ser um número positivo' });
  }

  if (intervaloDias !== undefined && (!Number.isInteger(intervaloDias) || intervaloDias <= 0)) {
    return res.status(400).json({ error: 'intervaloDias deve ser um número inteiro positivo' });
  }

  const plano = await planoModel.criar({ nome, preco, intervaloDias });
  res.status(201).json(plano);
}

async function atualizarPlano(req, res) {
  const plano = await planoModel.buscarPorId(req.params.id);
  if (!plano) return res.status(404).json({ error: 'Plano não encontrado' });

  if (req.body.preco !== undefined && !validators.valorPositivo(req.body.preco)) {
    return res.status(400).json({ error: 'preco deve ser um número positivo' });
  }

  if (
    req.body.intervaloDias !== undefined &&
    (!Number.isInteger(req.body.intervaloDias) || req.body.intervaloDias <= 0)
  ) {
    return res.status(400).json({ error: 'intervaloDias deve ser um número inteiro positivo' });
  }

  const atualizado = await planoModel.atualizar(req.params.id, req.body);
  res.json(atualizado);
}

async function listarSuporte(req, res) {
  const itens = await suporteModel.listarTodas();
  res.json(itens);
}

async function responderSuporte(req, res) {
  const item = await suporteModel.buscarPorId(req.params.id);
  if (!item) return res.status(404).json({ error: 'Mensagem não encontrada' });

  await suporteModel.marcarRespondida(req.params.id);
  res.status(204).send();
}

module.exports = {
  listarUsuarios: asyncHandler(listarUsuarios),
  metricas: asyncHandler(metricas),
  definirAdmin: asyncHandler(definirAdmin),
  removerUsuario: asyncHandler(removerUsuario),
  reativarUsuario: asyncHandler(reativarUsuario),
  cancelarAssinatura: asyncHandler(cancelarAssinatura),
  listarPlanos: asyncHandler(listarPlanos),
  criarPlano: asyncHandler(criarPlano),
  atualizarPlano: asyncHandler(atualizarPlano),
  listarSuporte: asyncHandler(listarSuporte),
  responderSuporte: asyncHandler(responderSuporte),
};
