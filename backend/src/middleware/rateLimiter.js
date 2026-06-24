const rateLimit = require('express-rate-limit');

const skipEmTeste = () => process.env.NODE_ENV === 'test';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipEmTeste,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipEmTeste,
  message: { error: 'Muitas requisições. Tente novamente em breve.' },
});

module.exports = { authLimiter, webhookLimiter };
