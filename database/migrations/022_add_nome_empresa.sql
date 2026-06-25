-- Campo de nome da empresa na aba Perfil/Usuario da nova pagina de Configuracoes.

ALTER TABLE usuarios
  ADD COLUMN nome_empresa VARCHAR(120);
