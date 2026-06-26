function formatar(nivel, mensagem, meta) {
  return JSON.stringify({
    level: nivel,
    message: mensagem,
    timestamp: new Date().toISOString(),
    ...meta,
  });
}

function info(mensagem, meta) {
  console.log(formatar('info', mensagem, meta));
}

function warn(mensagem, meta) {
  console.warn(formatar('warn', mensagem, meta));
}

function error(mensagem, erro, meta) {
  console.error(formatar('error', mensagem, { erro: erro?.message, ...meta }));
}

module.exports = { info, warn, error };
