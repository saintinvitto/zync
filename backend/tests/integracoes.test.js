const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const { criarUsuarioEToken } = require('./helpers');

afterAll(async () => {
  await db.end();
});

function dadosValidos(overrides = {}) {
  return {
    url: 'https://meu-erp.exemplo.com/webhook',
    eventos: ['lead_criado'],
    ...overrides,
  };
}

describe('Integrações (webhooks)', () => {
  test('cria, lista, atualiza e remove uma integração', async () => {
    const { token } = await criarUsuarioEToken(app, request);

    const criada = await request(app)
      .post('/api/integracoes')
      .set('Authorization', `Bearer ${token}`)
      .send(dadosValidos());
    expect(criada.status).toBe(201);
    expect(criada.body.url).toBe('https://meu-erp.exemplo.com/webhook');
    expect(criada.body.eventos).toEqual(['lead_criado']);
    expect(criada.body.ativo).toBe(true);
    expect(typeof criada.body.secret).toBe('string');
    expect(criada.body.secret.length).toBeGreaterThan(20);

    const lista = await request(app).get('/api/integracoes').set('Authorization', `Bearer ${token}`);
    expect(lista.body).toHaveLength(1);

    const atualizada = await request(app)
      .patch(`/api/integracoes/${criada.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ativo: false });
    expect(atualizada.status).toBe(200);
    expect(atualizada.body.ativo).toBe(false);

    const removida = await request(app)
      .delete(`/api/integracoes/${criada.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(removida.status).toBe(204);

    const listaDepois = await request(app).get('/api/integracoes').set('Authorization', `Bearer ${token}`);
    expect(listaDepois.body).toHaveLength(0);
  });

  test('rejeita sem url', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const resposta = await request(app)
      .post('/api/integracoes')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventos: ['lead_criado'] });
    expect(resposta.status).toBe(400);
  });

  test('rejeita url interna (SSRF)', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const resposta = await request(app)
      .post('/api/integracoes')
      .set('Authorization', `Bearer ${token}`)
      .send(dadosValidos({ url: 'http://localhost:3001/x' }));
    expect(resposta.status).toBe(400);
  });

  test('rejeita evento inválido', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const resposta = await request(app)
      .post('/api/integracoes')
      .set('Authorization', `Bearer ${token}`)
      .send(dadosValidos({ eventos: ['evento_que_nao_existe'] }));
    expect(resposta.status).toBe(400);
  });

  test('rejeita eventos vazio', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const resposta = await request(app)
      .post('/api/integracoes')
      .set('Authorization', `Bearer ${token}`)
      .send(dadosValidos({ eventos: [] }));
    expect(resposta.status).toBe(400);
  });

  test('404 em integração de outro usuário', async () => {
    const { token: tokenA } = await criarUsuarioEToken(app, request);
    const { token: tokenB } = await criarUsuarioEToken(app, request);

    const criada = await request(app)
      .post('/api/integracoes')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(dadosValidos());

    const resposta = await request(app)
      .delete(`/api/integracoes/${criada.body.id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(resposta.status).toBe(404);
  });

  test('rejeita sem autenticação', async () => {
    const resposta = await request(app).get('/api/integracoes');
    expect(resposta.status).toBe(401);
  });

  test('/testar dispara a chamada e retorna o resultado', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const criada = await request(app)
      .post('/api/integracoes')
      .set('Authorization', `Bearer ${token}`)
      .send(dadosValidos());

    const ORIGINAL_FETCH = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    const resposta = await request(app)
      .post(`/api/integracoes/${criada.body.id}/testar`)
      .set('Authorization', `Bearer ${token}`);

    global.fetch = ORIGINAL_FETCH;

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ sucesso: true, status: 200 });
  });
});
