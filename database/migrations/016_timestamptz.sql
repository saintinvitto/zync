-- Corrige colunas TIMESTAMP (sem fuso) para TIMESTAMPTZ.
-- Motivo: o driver pg serializa objetos Date do Node usando o fuso
-- horario LOCAL da maquina ao gravar em TIMESTAMP sem fuso, o que
-- desalinha qualquer comparacao com NOW() (ex: expiracao de token de
-- redefinicao de senha nunca validava). TIMESTAMPTZ guarda o instante
-- absoluto e elimina essa ambiguidade.

ALTER TABLE usuarios
  ALTER COLUMN criado_em TYPE TIMESTAMPTZ,
  ALTER COLUMN reset_token_expira TYPE TIMESTAMPTZ,
  ALTER COLUMN senha_alterada_em TYPE TIMESTAMPTZ;

ALTER TABLE leads
  ALTER COLUMN criado_em TYPE TIMESTAMPTZ,
  ALTER COLUMN fechado_em TYPE TIMESTAMPTZ;

ALTER TABLE mensagens
  ALTER COLUMN criado_em TYPE TIMESTAMPTZ;

ALTER TABLE tags
  ALTER COLUMN criado_em TYPE TIMESTAMPTZ;

ALTER TABLE agendamentos
  ALTER COLUMN data_hora TYPE TIMESTAMPTZ,
  ALTER COLUMN criado_em TYPE TIMESTAMPTZ;

ALTER TABLE logs_atividade
  ALTER COLUMN criado_em TYPE TIMESTAMPTZ;

ALTER TABLE notificacoes
  ALTER COLUMN criado_em TYPE TIMESTAMPTZ;

ALTER TABLE planos
  ALTER COLUMN criado_em TYPE TIMESTAMPTZ;

ALTER TABLE assinaturas
  ALTER COLUMN expira_em TYPE TIMESTAMPTZ,
  ALTER COLUMN criado_em TYPE TIMESTAMPTZ,
  ALTER COLUMN atualizado_em TYPE TIMESTAMPTZ;

ALTER TABLE mensagens_suporte
  ALTER COLUMN criado_em TYPE TIMESTAMPTZ;
