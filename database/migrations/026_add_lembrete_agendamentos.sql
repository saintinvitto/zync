-- Lembrete automatico de consulta: marca quando o lembrete ja foi
-- disparado pra esse agendamento, pra o job nao mandar a mesma
-- mensagem de novo a cada execucao.
ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS lembrete_enviado_em TIMESTAMPTZ NULL;
