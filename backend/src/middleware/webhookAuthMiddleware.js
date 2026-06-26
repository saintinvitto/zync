const crypto = require('crypto');
const logger = require('../utils/logger');

function verificarTokenWebhook(envVar) {
  return function (req, res, next) {
    const tokenEsperado = process.env[envVar];

    if (!tokenEsperado) {
      logger.error('Variável de ambiente do webhook não configurada — bloqueando por segurança', null, { envVar });
      return res.status(503).json({ error: 'Webhook não configurado' });
    }

    const esperado = Buffer.from(`Bearer ${tokenEsperado}`);
    const recebido = Buffer.from(req.headers.authorization || '');
    const valido = esperado.length === recebido.length && crypto.timingSafeEqual(esperado, recebido);

    if (!valido) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    next();
  };
}

module.exports = verificarTokenWebhook;
