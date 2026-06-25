const agendamentoModel = require('../models/agendamentoModel');
const leadModel = require('../models/leadModel');
const logModel = require('../models/logModel');
const notificacaoModel = require('../models/notificacaoModel');
const webhookService = require('./webhookService');

async function criarComEfeitos({ usuarioId, leadId, servico, data_hora, origem }) {
  const lead = await leadModel.buscarPorId(leadId, usuarioId);
  if (!lead) throw new Error('Lead não encontrado');

  const agendamento = await agendamentoModel.criar({ usuarioId, leadId, servico, data_hora });

  await logModel.registrar({
    usuarioId,
    leadId: lead.id,
    acao: 'agendamento_criado',
    detalhes: { data_hora: agendamento.data_hora, servico: agendamento.servico, origem: origem || 'manual' },
  });

  await notificacaoModel.criar({
    usuarioId,
    leadId: lead.id,
    tipo: 'agendamento_criado',
    mensagem: origem === 'ia' ? `A IA agendou um horário para ${lead.nome}` : `Novo agendamento para ${lead.nome}`,
  });

  webhookService.disparar(usuarioId, 'agendamento_criado', {
    id: agendamento.id,
    leadId: lead.id,
    leadNome: lead.nome,
    servico: agendamento.servico,
    data_hora: agendamento.data_hora,
  });

  return agendamento;
}

module.exports = { criarComEfeitos };
