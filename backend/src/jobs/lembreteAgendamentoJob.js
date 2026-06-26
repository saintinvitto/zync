const agendamentoModel = require('../models/agendamentoModel');
const mensagemModel = require('../models/mensagemModel');
const notificacaoModel = require('../models/notificacaoModel');
const whatsappService = require('../services/whatsappService');
const Sentry = require('../config/sentry');
const logger = require('../utils/logger');

const JANELA_HORAS = 24;

function formatarDataHora(dataHora) {
  return new Date(dataHora).toLocaleString('pt-BR', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
  });
}

function montarTexto(agendamento) {
  const servicoTexto = agendamento.servico ? ` de ${agendamento.servico}` : '';
  return `Oi, ${agendamento.lead_nome}! Passando pra lembrar do seu agendamento${servicoTexto} em ${formatarDataHora(agendamento.data_hora)}.`;
}

async function enviarLembretesPendentes() {
  const pendentes = await agendamentoModel.listarParaLembrete(JANELA_HORAS);

  for (const agendamento of pendentes) {
    try {
      const texto = montarTexto(agendamento);

      await mensagemModel.criar({ leadId: agendamento.lead_id, conteudo: texto, enviadoPor: 'ia' });
      await whatsappService.enviarMensagem(agendamento.lead_telefone, texto);
      await notificacaoModel.criar({
        usuarioId: agendamento.usuario_id,
        leadId: agendamento.lead_id,
        tipo: 'lembrete_agendamento_enviado',
        mensagem: `Lembrete de agendamento enviado para ${agendamento.lead_nome}`,
      });
      await agendamentoModel.marcarLembreteEnviado(agendamento.id);
    } catch (err) {
      logger.error('Erro ao enviar lembrete do agendamento', err, { agendamentoId: agendamento.id });
      Sentry.captureException(err);
    }
  }

  return pendentes.length;
}

module.exports = { enviarLembretesPendentes, JANELA_HORAS };
