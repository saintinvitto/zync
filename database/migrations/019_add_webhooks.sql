-- Webhooks de saida (feature de integracoes): cada usuario pode cadastrar
-- uma ou mais URLs que recebem um POST assinado (HMAC) quando eventos da
-- conta dele acontecem (lead criado, status mudou, agendamento criado,
-- pagamento aprovado).

CREATE TABLE IF NOT EXISTS webhooks (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  eventos JSONB NOT NULL DEFAULT '[]',
  secret VARCHAR(64) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhooks_usuario ON webhooks (usuario_id);
