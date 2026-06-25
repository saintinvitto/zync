const crypto = require('crypto');
const Sentry = require('../config/sentry');
const webhookModel = require('../models/webhookModel');

const EVENTOS = ['lead_criado', 'lead_status_alterado', 'agendamento_criado', 'pagamento_aprovado'];

const HOSTS_BLOQUEADOS = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
const FAIXAS_PRIVADAS = [/^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[0-1])\./];

function urlPermitida(urlStr) {
  let url;
  try {
    url = new URL(urlStr);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(url.protocol)) return false;

  const host = url.hostname.toLowerCase();
  if (HOSTS_BLOQUEADOS.includes(host)) return false;
  if (FAIXAS_PRIVADAS.some((regex) => regex.test(host))) return false;

  return true;
}

function assinar(secret, corpo) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(corpo).digest('hex');
}

async function enviarComRetry(webhook, corpo) {
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      const resposta = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zync-Signature': assinar(webhook.secret, corpo),
        },
        body: corpo,
      });

      if (!resposta.ok) throw new Error(`Webhook respondeu status ${resposta.status}`);
      return { sucesso: true, status: resposta.status };
    } catch (err) {
      if (tentativa === 2) {
        console.error('Erro ao disparar webhook:', err.message);
        Sentry.captureException(err);
        return { sucesso: false, status: 0 };
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function disparar(usuarioId, evento, payload) {
  try {
    const webhooks = await webhookModel.listarAtivosParaEvento(usuarioId, evento);
    const corpo = JSON.stringify({ evento, dados: payload, enviado_em: new Date().toISOString() });

    for (const webhook of webhooks) {
      enviarComRetry(webhook, corpo);
    }
  } catch (err) {
    /* disparo de webhook nunca pode quebrar o fluxo principal (criar lead, pagamento, etc) */
    console.error('Erro ao preparar disparo de webhook:', err.message);
    Sentry.captureException(err);
  }
}

async function enviarTeste(webhook) {
  const corpo = JSON.stringify({
    evento: 'teste',
    dados: { mensagem: 'Disparo de teste do Zync' },
    enviado_em: new Date().toISOString(),
  });

  return enviarComRetry(webhook, corpo);
}

module.exports = { EVENTOS, urlPermitida, disparar, enviarTeste };
