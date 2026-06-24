const leadModel = require('../models/leadModel');
const logModel = require('../models/logModel');
const asyncHandler = require('../utils/asyncHandler');
const validators = require('../utils/validators');
const { paraCsv } = require('../utils/csv');

const COLUNAS_EXPORT = ['id', 'nome', 'servico', 'origem', 'telefone', 'status', 'valor', 'criado_em'];

function validarStatusEValor(dados) {
  if (dados.status !== undefined && !validators.STATUS_LEAD.includes(dados.status)) {
    return `status deve ser um de: ${validators.STATUS_LEAD.join(', ')}`;
  }

  if (dados.valor !== undefined && dados.valor !== null && !validators.valorPositivo(dados.valor)) {
    return 'valor deve ser um número positivo';
  }

  return null;
}

async function listar(req, res) {
  const { tagId, page, limit } = req.query;
  const leads = await leadModel.listarPorUsuario(req.usuario.id, { tagId, page, limit });
  res.json(leads);
}

async function inbox(req, res) {
  const leads = await leadModel.listarInbox(req.usuario.id);
  res.json(leads);
}

async function exportarCsv(req, res) {
  const leads = await leadModel.listarPorUsuario(req.usuario.id, { tagId: req.query.tagId });
  const csv = paraCsv(leads, COLUNAS_EXPORT);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  res.send(csv);
}

async function buscar(req, res) {
  const lead = await leadModel.buscarPorId(req.params.id, req.usuario.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
  res.json(lead);
}

async function criar(req, res) {
  const { nome, servico, origem, telefone, status, valor } = req.body;
  if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });

  const erro = validarStatusEValor(req.body);
  if (erro) return res.status(400).json({ error: erro });

  const lead = await leadModel.criar({ usuarioId: req.usuario.id, nome, servico, origem, telefone, status, valor });

  await logModel.registrar({
    usuarioId: req.usuario.id,
    leadId: lead.id,
    acao: 'lead_criado',
    detalhes: { nome: lead.nome },
  });

  res.status(201).json(lead);
}

async function atualizar(req, res) {
  const lead = await leadModel.buscarPorId(req.params.id, req.usuario.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  const erro = validarStatusEValor(req.body);
  if (erro) return res.status(400).json({ error: erro });

  const atualizado = await leadModel.atualizar(req.params.id, req.usuario.id, req.body);

  if (req.body.status !== undefined && req.body.status !== lead.status) {
    await logModel.registrar({
      usuarioId: req.usuario.id,
      leadId: lead.id,
      acao: 'lead_status_alterado',
      detalhes: { de: lead.status, para: req.body.status },
    });
  }

  res.json(atualizado);
}

async function remover(req, res) {
  const lead = await leadModel.buscarPorId(req.params.id, req.usuario.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  await leadModel.remover(req.params.id, req.usuario.id);
  res.status(204).send();
}

module.exports = {
  listar: asyncHandler(listar),
  inbox: asyncHandler(inbox),
  exportarCsv: asyncHandler(exportarCsv),
  buscar: asyncHandler(buscar),
  criar: asyncHandler(criar),
  atualizar: asyncHandler(atualizar),
  remover: asyncHandler(remover),
};
