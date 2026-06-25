async function notificar(mensagem, { titulo, tag } = {}) {
  const topico = process.env.NTFY_TOPIC;
  if (!topico) return;

  try {
    await fetch(`https://ntfy.sh/${topico}`, {
      method: 'POST',
      headers: {
        Title: titulo || 'Zync',
        Tags: tag || 'bell',
      },
      body: mensagem,
    });
  } catch {
    /* alerta e best-effort -- nunca pode quebrar o fluxo principal (login/cadastro/pagamento) */
  }
}

module.exports = { notificar };
