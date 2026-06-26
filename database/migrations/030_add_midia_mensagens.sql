-- Suporte a midia (imagem/documento) nas mensagens do WhatsApp.
--
-- Nao guardamos o arquivo em lugar nenhum nosso - a Meta mantem a midia
-- (por um tempo limitado) e a gente so guarda a referencia (media_id).
-- Pra exibir, o backend busca uma URL temporaria na Meta sob demanda
-- (ver whatsappService.buscarUrlMidia). Evita precisar de bucket/storage
-- proprio pra essa primeira versao.

ALTER TABLE mensagens ALTER COLUMN conteudo DROP NOT NULL;

ALTER TABLE mensagens
  ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'imagem', 'documento')),
  ADD COLUMN midia_id VARCHAR(100) NULL,
  ADD COLUMN midia_mime_type VARCHAR(100) NULL;
