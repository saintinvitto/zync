const leadModel = require('../models/leadModel');
const mensagemModel = require('../models/mensagemModel');
const notificacaoModel = require('../models/notificacaoModel');
const usuarioModel = require('../models/usuarioModel');
const iaService = require('../services/iaService');
const whatsappService = require('../services/whatsappService');
const usoService = require('../services/usoService');
const asyncHandler = require('../utils/asyncHandler');

async function processarMensagemRecebida({ usuarioId, telefone, nome, mensagem, midia }) {
  let lead = await leadModel.buscarPorTelefone(telefone, usuarioId);
  if (!lead) {
    lead = await leadModel.criar({
      usuarioId,
      nome: nome || telefone,
      origem: 'WhatsApp',
      telefone,
    });
  }

  await mensagemModel.criar({
    leadId: lead.id,
    conteudo: mensagem || null,
    enviadoPor: 'cliente',
    tipo: midia ? midia.tipo : 'texto',
    midiaId: midia ? midia.midiaId : undefined,
    midiaMimeType: midia ? midia.mimeType : undefined,
  });

  await notificacaoModel.criar({
    usuarioId,
    leadId: lead.id,
    tipo: 'mensagem_recebida',
    mensagem: `${lead.nome} enviou uma mensagem`,
  });

  // Midia sem legenda nao tem texto pra IA responder - fica pro atendente humano ver no inbox.
  if (midia && !mensagem) {
    return lead;
  }

  const empresa = await usuarioModel.buscarPorId(usuarioId);
  const respostaTexto = await iaService.gerarResposta(mensagem, empresa, { usuarioId, leadId: lead.id });
  await mensagemModel.criar({ leadId: lead.id, conteudo: respostaTexto, enviadoPor: 'ia' });

  await whatsappService.enviarMensagem(telefone, respostaTexto);
  await usoService.verificarLimitesEAvisar(usuarioId);

  return lead;
}

async function receberMensagem(req, res) {
  const { usuarioId } = req.params;
  const { telefone, nome, mensagem } = req.body;

  if (!telefone || !mensagem) {
    return res.status(400).json({ error: 'telefone e mensagem são obrigatórios' });
  }

  await processarMensagemRecebida({ usuarioId, telefone, nome, mensagem });

  res.status(200).json({ ok: true });
}

async function enviarManual(req, res) {
  const lead = await leadModel.buscarPorId(req.params.leadId, req.usuario.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
  if (!lead.telefone) return res.status(400).json({ error: 'Lead não possui telefone cadastrado' });

  const { conteudo } = req.body;
  if (!conteudo) return res.status(400).json({ error: 'conteudo é obrigatório' });

  const mensagem = await mensagemModel.criar({ leadId: lead.id, conteudo, enviadoPor: 'humano' });
  await whatsappService.enviarMensagem(lead.telefone, conteudo);

  res.status(201).json(mensagem);
}

async function enviarMidiaManual(req, res) {
  const lead = await leadModel.buscarPorId(req.params.leadId, req.usuario.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
  if (!lead.telefone) return res.status(400).json({ error: 'Lead não possui telefone cadastrado' });

  if (!req.file) return res.status(400).json({ error: 'arquivo é obrigatório' });

  const tipo = req.file.mimetype.startsWith('image/') ? 'imagem' : 'documento';
  const legenda = req.body.legenda || undefined;

  const midiaId = await whatsappService.uploadMidia(req.file.buffer, req.file.mimetype);

  const mensagem = await mensagemModel.criar({
    leadId: lead.id,
    conteudo: legenda || null,
    enviadoPor: 'humano',
    tipo,
    midiaId,
    midiaMimeType: req.file.mimetype,
  });

  await whatsappService.enviarMidia(lead.telefone, { tipo, midiaId, legenda });

  res.status(201).json(mensagem);
}

async function baixarMidia(req, res) {
  const mensagem = await mensagemModel.buscarPorId(req.params.mensagemId);
  if (!mensagem || !mensagem.midia_id) {
    return res.status(404).json({ error: 'Mídia não encontrada' });
  }

  const lead = await leadModel.buscarPorId(mensagem.lead_id, req.usuario.id);
  if (!lead) return res.status(404).json({ error: 'Mídia não encontrada' });

  const { buffer, mimeType } = await whatsappService.baixarMidia(mensagem.midia_id);
  res.set('Content-Type', mimeType || mensagem.midia_mime_type || 'application/octet-stream');
  res.send(buffer);
}

module.exports = {
  processarMensagemRecebida,
  receberMensagem: asyncHandler(receberMensagem),
  enviarManual: asyncHandler(enviarManual),
  enviarMidiaManual: asyncHandler(enviarMidiaManual),
  baixarMidia: asyncHandler(baixarMidia),
};
