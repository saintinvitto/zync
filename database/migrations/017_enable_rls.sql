-- Ativa Row Level Security em todas as tabelas.
-- O backend conecta direto como usuario "postgres" (table owner), que
-- sempre ignora RLS - entao isso nao quebra nada no backend. O efeito
-- e fechar a API publica do Supabase (PostgREST/anon key) que ficaria
-- liberada por padrao sem isso.

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_atividade ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_suporte ENABLE ROW LEVEL SECURITY;
