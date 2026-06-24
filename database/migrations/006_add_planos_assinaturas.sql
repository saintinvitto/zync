USE zync;

CREATE TABLE IF NOT EXISTS planos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(60) NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  intervalo_dias INT NOT NULL DEFAULT 30,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assinaturas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  plano_id INT NOT NULL,
  status ENUM('pendente', 'ativa', 'cancelada', 'expirada') NOT NULL DEFAULT 'pendente',
  syncpay_identifier VARCHAR(60),
  pix_code TEXT,
  valor DECIMAL(10,2) NOT NULL,
  expira_em DATETIME,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (plano_id) REFERENCES planos(id)
);

INSERT INTO planos (nome, preco, intervalo_dias) VALUES
  ('Básico', 49.90, 30),
  ('Pro', 99.90, 30);
