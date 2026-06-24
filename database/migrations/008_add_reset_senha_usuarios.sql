USE zync;

ALTER TABLE usuarios
  ADD COLUMN reset_token_hash VARCHAR(64) NULL,
  ADD COLUMN reset_token_expira DATETIME NULL;
