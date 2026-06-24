const leadModel = require('../models/leadModel');

async function listar(req, res) {
  const leads = await leadModel.listarPorUsuario(req.usuario.id);
  res.json(leads);
}

async function buscar(req, res) {
  const lead = await leadModel.buscarPorId(req.params.id, req.usuario.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
  res.json(lead);
}

async function criar(req, res) {
  const { nome, servico, origem, status, valor } = req.body;
  if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });

  const lead = await leadModel.criar({ usuarioId: req.usuario.id, nome, servico, origem, status, valor });
  res.status(201).json(lead);
}

async function atualizar(req, res) {
  const lead = await leadModel.buscarPorId(req.params.id, req.usuario.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  const atualizado = await leadModel.atualizar(req.params.id, req.usuario.id, req.body);
  res.json(atualizado);
}

async function remover(req, res) {
  const lead = await leadModel.buscarPorId(req.params.id, req.usuario.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  await leadModel.remover(req.params.id, req.usuario.id);
  res.status(204).send();
}

module.exports = { listar, buscar, criar, atualizar, remover };
