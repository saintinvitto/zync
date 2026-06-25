const crypto = require('crypto');
const webhookModel = require('../models/webhookModel');
const webhookService = require('../services/webhookService');
const asyncHandler = require('../utils/asyncHandler');
const validators = require('../utils/validators');

function validarEventos(eventos) {
  if (!Array.isArray(eventos) || eventos.length === 0) {
    return `eventos deve ser uma lista com pelo menos um de: ${webhookService.EVENTOS.join(', ')}`;
  }

  if (!eventos.every((evento) => webhookService.EVENTOS.includes(evento))) {
    return `eventos deve conter apenas: ${webhookService.EVENTOS.join(', ')}`;
  }

  return null;
}

async function listar(req, res) {
  const webhooks = await webhookModel.listarPorUsuario(req.usuario.id);
  res.json(webhooks);
}

async function criar(req, res) {
  const { url, eventos } = req.body;

  if (!url) return res.status(400).json({ error: 'url é obrigatória' });
  if (!validators.dentroDoTamanho(url, 500)) return res.status(400).json({ error: 'url deve ter no máximo 500 caracteres' });
  if (!webhookService.urlPermitida(url)) return res.status(400).json({ error: 'url inválida ou não permitida (precisa ser http/https público)' });

  const erroEventos = validarEventos(eventos);
  if (erroEventos) return res.status(400).json({ error: erroEventos });

  const secret = crypto.randomBytes(32).toString('hex');
  const webhook = await webhookModel.criar({ usuarioId: req.usuario.id, url, eventos, secret });

  res.status(201).json(webhook);
}

async function atualizar(req, res) {
  const webhook = await webhookModel.buscarPorId(req.params.id, req.usuario.id);
  if (!webhook) return res.status(404).json({ error: 'Integração não encontrada' });

  const { url, eventos, ativo } = req.body;

  if (url !== undefined) {
    if (!validators.dentroDoTamanho(url, 500)) return res.status(400).json({ error: 'url deve ter no máximo 500 caracteres' });
    if (!webhookService.urlPermitida(url)) return res.status(400).json({ error: 'url inválida ou não permitida (precisa ser http/https público)' });
  }

  if (eventos !== undefined) {
    const erroEventos = validarEventos(eventos);
    if (erroEventos) return res.status(400).json({ error: erroEventos });
  }

  const atualizado = await webhookModel.atualizar(req.params.id, req.usuario.id, { url, eventos, ativo });
  res.json(atualizado);
}

async function remover(req, res) {
  const webhook = await webhookModel.buscarPorId(req.params.id, req.usuario.id);
  if (!webhook) return res.status(404).json({ error: 'Integração não encontrada' });

  await webhookModel.remover(req.params.id, req.usuario.id);
  res.status(204).send();
}

async function testar(req, res) {
  const webhook = await webhookModel.buscarPorId(req.params.id, req.usuario.id);
  if (!webhook) return res.status(404).json({ error: 'Integração não encontrada' });

  const resultado = await webhookService.enviarTeste(webhook);
  res.json(resultado);
}

module.exports = {
  listar: asyncHandler(listar),
  criar: asyncHandler(criar),
  atualizar: asyncHandler(atualizar),
  remover: asyncHandler(remover),
  testar: asyncHandler(testar),
};
