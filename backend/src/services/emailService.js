function enviarEmail(destinatario, assunto, corpo) {
  console.log(`[Email mock] Para: ${destinatario} | Assunto: ${assunto}\n${corpo}`);
  return { sucesso: true };
}

module.exports = { enviarEmail };
