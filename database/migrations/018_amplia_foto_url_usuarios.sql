-- A coluna foto_url ainda esta VARCHAR(500) no banco real (herdado da era
-- MySQL, nunca foi alterada la). O schema.sql ja diz TEXT, mas isso so
-- documenta o estado desejado -- precisa rodar este ALTER de fato no Postgres
-- pra valer. Sem isso, salvar uma foto recortada (base64) falha com
-- "value too long for type character varying(500)".

ALTER TABLE usuarios
  ALTER COLUMN foto_url TYPE TEXT;
