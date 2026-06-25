-- Soft delete de empresas pelo admin: marca quando foi removida em vez de
-- apagar de verdade (varias tabelas como leads/assinaturas/logs nao tem
-- ON DELETE CASCADE de usuarios, e os dados do cliente devem ficar
-- recuperaveis caso o admin remova por engano).

ALTER TABLE usuarios
  ADD COLUMN removido_em TIMESTAMPTZ NULL;
