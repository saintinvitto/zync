const crypto = require('crypto');

async function criarUsuarioEToken(app, request, overrides = {}) {
  const sufixo = crypto.randomBytes(6).toString('hex');
  const dados = {
    nome: overrides.nome || `Usuario Teste ${sufixo}`,
    email: overrides.email || `teste-${sufixo}@zync.com`,
    senha: overrides.senha || 'senha123',
  };

  await request(app).post('/api/auth/register').send(dados);

  const resposta = await request(app)
    .post('/api/auth/login')
    .send({ email: dados.email, senha: dados.senha });

  return { usuario: resposta.body.usuario, token: resposta.body.token, ...dados };
}

module.exports = { criarUsuarioEToken };
