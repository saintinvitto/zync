USE zync;

CREATE TABLE IF NOT EXISTS logs_atividade (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  lead_id INT,
  acao VARCHAR(60) NOT NULL,
  detalhes JSON,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);
