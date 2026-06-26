-- Fila de jobs generica no Postgres (sem precisar de Redis/Bull). Usada
-- primeiro pro disparo de campanha (tagController.dispararCampanha), que
-- hoje roda em memoria e perde o progresso se o processo reiniciar no meio.

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(60) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'falhou')),
  tentativas INT NOT NULL DEFAULT 0,
  max_tentativas INT NOT NULL DEFAULT 3,
  erro TEXT,
  agendado_para TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  processado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_pendentes ON jobs (status, agendado_para);
