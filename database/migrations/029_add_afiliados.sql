-- Programa de afiliados: comissao recorrente (% sobre cada pagamento
-- confirmado de quem foi indicado), decidido com o time em 2026-06-25.

CREATE TABLE IF NOT EXISTS afiliados (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  percentual_comissao DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT idx_afiliados_usuario_unico UNIQUE (usuario_id)
);

-- Quem indicou quem - definido uma vez no cadastro, via codigo de indicacao.
ALTER TABLE usuarios ADD COLUMN indicado_por_afiliado_id INT NULL REFERENCES afiliados(id);

-- Cada pagamento confirmado (linha em assinaturas) gera no maximo 1 comissao
-- (UNIQUE em assinatura_id evita duplicar se o webhook do SyncPay repetir).
CREATE TABLE IF NOT EXISTS comissoes_afiliado (
  id SERIAL PRIMARY KEY,
  afiliado_id INT NOT NULL REFERENCES afiliados(id) ON DELETE CASCADE,
  usuario_indicado_id INT NOT NULL REFERENCES usuarios(id),
  assinatura_id INT NOT NULL REFERENCES assinaturas(id) ON DELETE CASCADE,
  valor DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'paga')),
  criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT idx_comissoes_assinatura_unica UNIQUE (assinatura_id)
);

CREATE INDEX IF NOT EXISTS idx_comissoes_afiliado_status ON comissoes_afiliado (afiliado_id, status);

ALTER TABLE afiliados ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes_afiliado ENABLE ROW LEVEL SECURITY;
