-- Corrige 2 lacunas achadas em auditoria:
--
-- 1. RLS nunca foi ligado em campos_personalizados, lead_campos_valores,
--    webhooks e produtos (criadas depois da migration 017_enable_rls.sql,
--    que so cobriu as tabelas que existiam na epoca). Reaplica em todas
--    (idempotente - ligar RLS numa tabela que ja tem nao da erro).
--
-- 2. Indices faltando pra 2 consultas reais do codigo:
--    - listarParaLembrete (agendamentoModel): varre TODOS os tenants
--      buscando agendamento proximo sem lembrete, sem filtro de usuario_id.
--    - existeDoTipoNoMes (notificacaoModel): chamada a cada lead/mensagem
--      criada (usoService.verificarLimitesEAvisar).

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE campos_personalizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_campos_valores ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_atividade ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_suporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_agendamentos_lembrete_pendente ON agendamentos (data_hora)
  WHERE status = 'agendado' AND lembrete_enviado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_tipo_criado ON notificacoes (usuario_id, tipo, criado_em);
