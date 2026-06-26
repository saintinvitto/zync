const Sentry = require('../config/sentry');

function enviarMock(telefone, texto) {
  console.log(`[WhatsApp mock] Enviando para ${telefone}: ${texto}`);
  return { sucesso: true };
}

async function enviarMensagem(telefone, texto) {
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    return enviarMock(telefone, texto);
  }

  try {
    const resposta = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: telefone.replace(/\D/g, ''),
          type: 'text',
          text: { body: texto },
        }),
      }
    );

    if (!resposta.ok) {
      const erro = await resposta.text();
      throw new Error(`Falha ao enviar WhatsApp (status ${resposta.status}): ${erro}`);
    }

    return { sucesso: true };
  } catch (err) {
    console.error('Erro ao enviar WhatsApp:', err.message);
    Sentry.captureException(err);
    return { sucesso: false };
  }
}

async function enviarMidia(telefone, { tipo, midiaId, legenda }) {
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    console.log(`[WhatsApp mock] Enviando ${tipo} pra ${telefone}: midiaId=${midiaId}`);
    return { sucesso: true };
  }

  try {
    const campo = tipo === 'documento' ? 'document' : 'image';
    const resposta = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: telefone.replace(/\D/g, ''),
          type: campo,
          [campo]: { id: midiaId, ...(legenda ? { caption: legenda } : {}) },
        }),
      }
    );

    if (!resposta.ok) {
      const erro = await resposta.text();
      throw new Error(`Falha ao enviar mídia WhatsApp (status ${resposta.status}): ${erro}`);
    }

    return { sucesso: true };
  } catch (err) {
    console.error('Erro ao enviar mídia WhatsApp:', err.message);
    Sentry.captureException(err);
    return { sucesso: false };
  }
}

async function uploadMidia(buffer, mimeType) {
  const formData = new FormData();
  formData.append('messaging_product', 'whatsapp');
  formData.append('file', new Blob([buffer], { type: mimeType }), 'arquivo');

  const resposta = await fetch(
    `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
      body: formData,
    }
  );

  if (!resposta.ok) {
    const erro = await resposta.text();
    throw new Error(`Falha ao enviar mídia pra Meta (status ${resposta.status}): ${erro}`);
  }

  const dados = await resposta.json();
  return dados.id;
}

async function baixarMidia(midiaId) {
  const metaResp = await fetch(`https://graph.facebook.com/v21.0/${midiaId}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
  });

  if (!metaResp.ok) {
    throw new Error(`Falha ao buscar metadados da mídia (status ${metaResp.status})`);
  }

  const meta = await metaResp.json();

  const arquivoResp = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
  });

  if (!arquivoResp.ok) {
    throw new Error(`Falha ao baixar mídia (status ${arquivoResp.status})`);
  }

  const buffer = Buffer.from(await arquivoResp.arrayBuffer());
  return { buffer, mimeType: meta.mime_type };
}

module.exports = { enviarMensagem, enviarMidia, uploadMidia, baixarMidia };
