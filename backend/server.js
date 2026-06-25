const app = require('./src/app');
const db = require('./src/config/db');

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Zync API rodando na porta ${PORT}`);
});

function encerrarGraciosamente(sinal) {
  console.log(`${sinal} recebido, encerrando requisições em andamento...`);

  server.close(async () => {
    await db.end();
    console.log('Encerrado.');
    process.exit(0);
  });

  // Se alguma requisição travar e não terminar a tempo, força o encerramento
  // pra nao deixar o processo zumbi quando o Railway tentar matar de qualquer jeito.
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => encerrarGraciosamente('SIGTERM'));
process.on('SIGINT', () => encerrarGraciosamente('SIGINT'));
