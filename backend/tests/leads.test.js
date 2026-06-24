const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const { criarUsuarioEToken } = require('./helpers');

afterAll(async () => {
  await db.end();
});

async function criarLead(token, dados = {}) {
  const resposta = await request(app)
    .post('/api/leads')
    .set('Authorization', `Bearer ${token}`)
    .send({ nome: 'Lead Teste', ...dados });
  return resposta;
}

describe('POST /api/leads', () => {
  test('cria lead com nome apenas', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const resposta = await criarLead(token);

    expect(resposta.status).toBe(201);
    expect(resposta.body.status).toBe('novo');
    expect(resposta.body.fechado_em).toBeNull();
  });

  test('rejeita lead sem nome', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const resposta = await request(app).post('/api/leads').set('Authorization', `Bearer ${token}`).send({});

    expect(resposta.status).toBe(400);
  });

  test('rejeita status inválido', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const resposta = await criarLead(token, { status: 'inexistente' });

    expect(resposta.status).toBe(400);
  });

  test('seta fechado_em automaticamente ao criar já fechado', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const resposta = await criarLead(token, { status: 'fechado', valor: 100 });

    expect(resposta.body.status).toBe('fechado');
    expect(resposta.body.fechado_em).not.toBeNull();
  });

  test('exige token de autenticação', async () => {
    const resposta = await request(app).post('/api/leads').send({ nome: 'Sem token' });
    expect(resposta.status).toBe(401);
  });
});

describe('GET /api/leads', () => {
  test('lista apenas leads do próprio usuário', async () => {
    const userA = await criarUsuarioEToken(app, request);
    const userB = await criarUsuarioEToken(app, request);

    await criarLead(userA.token, { nome: 'Lead A1' });
    await criarLead(userA.token, { nome: 'Lead A2' });
    await criarLead(userB.token, { nome: 'Lead B1' });

    const respostaA = await request(app).get('/api/leads').set('Authorization', `Bearer ${userA.token}`);
    const respostaB = await request(app).get('/api/leads').set('Authorization', `Bearer ${userB.token}`);

    expect(respostaA.body).toHaveLength(2);
    expect(respostaB.body).toHaveLength(1);
    expect(respostaA.body.every((l) => l.nome.startsWith('Lead A'))).toBe(true);
  });

  test('busca textual encontra por nome parcial', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    await criarLead(token, { nome: 'Maria Silva' });
    await criarLead(token, { nome: 'Mariana Costa' });
    await criarLead(token, { nome: 'Joao Pereira' });

    const resposta = await request(app)
      .get('/api/leads?busca=mari')
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.body).toHaveLength(2);
  });

  test('filtra por status e por faixa de valor', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    await criarLead(token, { nome: 'Fechado caro', status: 'fechado', valor: 900 });
    await criarLead(token, { nome: 'Fechado barato', status: 'fechado', valor: 50 });
    await criarLead(token, { nome: 'Novo', status: 'novo' });

    const porStatus = await request(app)
      .get('/api/leads?status=fechado')
      .set('Authorization', `Bearer ${token}`);
    expect(porStatus.body).toHaveLength(2);

    const porValor = await request(app)
      .get('/api/leads?valorMin=100&valorMax=1000')
      .set('Authorization', `Bearer ${token}`);
    expect(porValor.body).toHaveLength(1);
    expect(porValor.body[0].nome).toBe('Fechado caro');
  });

  test('rejeita status de filtro inválido', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const resposta = await request(app)
      .get('/api/leads?status=lixo')
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(400);
  });

  test('paginação retorna envelope com metadados', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    for (let i = 0; i < 3; i++) await criarLead(token, { nome: `Lead ${i}` });

    const resposta = await request(app)
      .get('/api/leads?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.body).toHaveProperty('dados');
    expect(resposta.body.dados).toHaveLength(2);
    expect(resposta.body.total).toBe(3);
    expect(resposta.body.totalPaginas).toBe(2);
  });

  test('ordena mais recentes primeiro mesmo com timestamps iguais', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const respostas = await Promise.all([
      criarLead(token, { nome: 'Lote 1' }),
      criarLead(token, { nome: 'Lote 2' }),
      criarLead(token, { nome: 'Lote 3' }),
    ]);
    const idsCriados = respostas.map((r) => r.body.id).sort((a, b) => b - a);

    const resposta = await request(app).get('/api/leads').set('Authorization', `Bearer ${token}`);
    const idsRetornados = resposta.body.map((l) => l.id);

    expect(idsRetornados).toEqual(idsCriados);
  });
});

describe('GET /api/leads/:id', () => {
  test('retorna 404 ao buscar lead de outro usuário', async () => {
    const userA = await criarUsuarioEToken(app, request);
    const userB = await criarUsuarioEToken(app, request);

    const leadA = await criarLead(userA.token, { nome: 'Lead privado' });

    const resposta = await request(app)
      .get(`/api/leads/${leadA.body.id}`)
      .set('Authorization', `Bearer ${userB.token}`);

    expect(resposta.status).toBe(404);
  });
});

describe('PUT /api/leads/:id', () => {
  test('fechar lead seta fechado_em, reabrir limpa', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token, { nome: 'Negociação' });

    const fechado = await request(app)
      .put(`/api/leads/${lead.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'fechado', valor: 250 });
    expect(fechado.body.fechado_em).not.toBeNull();

    const reaberto = await request(app)
      .put(`/api/leads/${lead.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'em_contato' });
    expect(reaberto.body.fechado_em).toBeNull();
  });

  test('não permite atualizar lead de outro usuário', async () => {
    const userA = await criarUsuarioEToken(app, request);
    const userB = await criarUsuarioEToken(app, request);
    const lead = await criarLead(userA.token, { nome: 'Protegido' });

    const resposta = await request(app)
      .put(`/api/leads/${lead.body.id}`)
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ nome: 'Hackeado' });

    expect(resposta.status).toBe(404);
  });
});

describe('DELETE /api/leads/:id', () => {
  test('remove lead do próprio usuário', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token, { nome: 'Descartável' });

    const remover = await request(app)
      .delete(`/api/leads/${lead.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(remover.status).toBe(204);

    const buscar = await request(app)
      .get(`/api/leads/${lead.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(buscar.status).toBe(404);
  });
});
