const mensagemModel = require('../models/mensagemModel');
const notificacaoModel = require('../models/notificacaoModel');
const logModel = require('../models/logModel');
const whatsappService = require('./whatsappService');
const usoService = require('./usoService');
const Sentry = require('../config/sentry');
const logger = require('../utils/logger');

async function disparar({ usuarioId, tagId, tagNome, mensagem, leads }) {
  let enviados = 0;

  try {
    for (const lead of leads) {
      try {
        await mensagemModel.criar({ leadId: lead.id, conteudo: mensagem, enviadoPor: 'humano' });
        const resultado = await whatsappService.enviarMensagem(lead.telefone, mensagem);
        if (resultado.sucesso) enviados++;
      } catch (err) {
        logger.error('Erro ao enviar campanha pro lead', err, { leadId: lead.id });
        Sentry.captureException(err);
      }
    }

    await logModel.registrar({
      usuarioId,
      acao: 'campanha_disparada',
      detalhes: { tagId, tagNome, totalLeads: leads.length, enviados },
    });

    await notificacaoModel.criar({
      usuarioId,
      leadId: null,
      tipo: 'campanha_concluida',
      mensagem: `Campanha pra tag "${tagNome}" concluída: ${enviados}/${leads.length} mensagens enviadas.`,
    });

    await usoService.verificarLimitesEAvisar(usuarioId);
  } catch (err) {
    logger.error('Erro ao disparar campanha', err, { usuarioId, tagId });
    Sentry.captureException(err);
  }
}

module.exports = { disparar };
