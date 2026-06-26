const db = require('../config/db');

async function enfileirar(tipo, payload) {
  const { rows } = await db.query(
    'INSERT INTO jobs (tipo, payload) VALUES ($1, $2) RETURNING id',
    [tipo, JSON.stringify(payload)]
  );
  return rows[0].id;
}

async function reivindicarProximo() {
  const { rows } = await db.query(
    `UPDATE jobs SET status = 'processando', tentativas = tentativas + 1
     WHERE id = (
       SELECT id FROM jobs
       WHERE status = 'pendente' AND agendado_para <= NOW()
       ORDER BY agendado_para
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`
  );
  return rows[0];
}

async function marcarConcluido(id) {
  await db.query("UPDATE jobs SET status = 'concluido', processado_em = NOW() WHERE id = $1", [id]);
}

async function marcarFalhaOuReagendar(job, erro) {
  if (job.tentativas >= job.max_tentativas) {
    await db.query(
      "UPDATE jobs SET status = 'falhou', erro = $1, processado_em = NOW() WHERE id = $2",
      [erro, job.id]
    );
    return;
  }

  const atrasoMinutos = job.tentativas * 2;
  await db.query(
    `UPDATE jobs SET status = 'pendente', erro = $1, agendado_para = NOW() + ($2 * INTERVAL '1 minute')
     WHERE id = $3`,
    [erro, atrasoMinutos, job.id]
  );
}

module.exports = { enfileirar, reivindicarProximo, marcarConcluido, marcarFalhaOuReagendar };
