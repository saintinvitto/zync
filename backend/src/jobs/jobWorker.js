const jobModel = require('../models/jobModel');
const campanhaService = require('../services/campanhaService');
const Sentry = require('../config/sentry');
const logger = require('../utils/logger');

const HANDLERS = {
  disparar_campanha: (payload) => campanhaService.disparar(payload),
};

async function processarProximoJob() {
  const job = await jobModel.reivindicarProximo();
  if (!job) return false;

  const handler = HANDLERS[job.tipo];

  try {
    if (!handler) throw new Error(`tipo de job desconhecido: ${job.tipo}`);
    await handler(job.payload);
    await jobModel.marcarConcluido(job.id);
  } catch (err) {
    logger.error('Erro ao processar job', err, { jobId: job.id, tipo: job.tipo });
    Sentry.captureException(err);
    await jobModel.marcarFalhaOuReagendar(job, err.message);
  }

  return true;
}

async function processarFilaCompleta() {
  let processouAlgo = true;
  while (processouAlgo) {
    processouAlgo = await processarProximoJob();
  }
}

module.exports = { processarProximoJob, processarFilaCompleta };
