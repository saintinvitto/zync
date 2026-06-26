const Sentry = require('../config/sentry');
const logger = require('../utils/logger');

async function enviarEmail(destinatario, assunto, corpo) {
  if (!process.env.SENDGRID_API_KEY) {
    logger.info('Email mock enviado', { destinatario, assunto, corpo });
    return { sucesso: true };
  }

  try {
    const resposta = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: destinatario }] }],
        from: { email: process.env.EMAIL_FROM, name: 'Zync' },
        subject: assunto,
        content: [{ type: 'text/plain', value: corpo }],
      }),
    });

    if (!resposta.ok) {
      const erro = await resposta.text();
      throw new Error(`Falha ao enviar e-mail via SendGrid (status ${resposta.status}): ${erro}`);
    }

    return { sucesso: true };
  } catch (err) {
    logger.error('Erro ao enviar e-mail', err, { destinatario });
    Sentry.captureException(err);
    return { sucesso: false };
  }
}

module.exports = { enviarEmail };
