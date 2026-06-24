const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const { criarUsuarioEToken } = require('./helpers');

afterAll(async () => {
  await db.end();
});

async function criarLead(token, dados) {
  return request(app).post('/api/leads').set('Authorization', `Bearer ${token}`).send(dados);
}

describe('Relatórios', () => {
  test('leads por origem agrupa corretamente', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    await criarLead(token, { nome: 'A', origem: 'Instagram' });
    await criarLead(token, { nome: 'B', origem: 'Instagram' });
    await criarLead(token, { nome: 'C', origem: 'WhatsApp' });
    await criarLead(token, { nome: 'D' });

    const resposta = await request(app)
      .get('/api/relatorios/leads-por-origem')
      .set('Authorization', `Bearer ${token}`);

    const mapa = Object.fromEntries(resposta.body.map((r) => [r.origem, r.total]));
    expect(mapa.Instagram).toBe(2);
    expect(mapa.WhatsApp).toBe(1);
    expect(mapa['Não informado']).toBe(1);
  });

  test('funil de conversão calcula taxa corretamente', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    await criarLead(token, { nome: 'A', status: 'fechado', valor: 100 });
    await criarLead(token, { nome: 'B', status: 'novo' });
    await criarLead(token, { nome: 'C', status: 'novo' });
    await criarLead(token, { nome: 'D', status: 'novo' });

    const resposta = await request(app)
      .get('/api/relatorios/funil-conversao')
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.body.totalGeral).toBe(4);
    expect(resposta.body.taxaConversao).toBe(25);
  });

  test('faturamento soma apenas leads fechados e respeita período', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    await criarLead(token, { nome: 'Fechado 1', status: 'fechado', valor: 300 });
    await criarLead(token, { nome: 'Fechado 2', status: 'fechado', valor: 200 });
    await criarLead(token, { nome: 'Aberto', status: 'novo', valor: 999 });

    const resposta = await request(app)
      .get('/api/relatorios/faturamento')
      .set('Authorization', `Bearer ${token}`);

    const totalGeral = resposta.body.reduce((soma, r) => soma + Number(r.total), 0);
    expect(totalGeral).toBe(500);

    const futuro = await request(app)
      .get('/api/relatorios/faturamento?inicio=2099-01-01')
      .set('Authorization', `Bearer ${token}`);
    expect(futuro.body).toEqual([]);
  });

  test('rejeita parâmetros de filtro inválidos', async () => {
    const { token } = await criarUsuarioEToken(app, request);

    const dataInvalida = await request(app)
      .get('/api/relatorios/faturamento?inicio=nao-e-data')
      .set('Authorization', `Bearer ${token}`);
    expect(dataInvalida.status).toBe(400);

    const agrupamentoInvalido = await request(app)
      .get('/api/relatorios/faturamento?agrupamento=semana')
      .set('Authorization', `Bearer ${token}`);
    expect(agrupamentoInvalido.status).toBe(400);
  });

  test('relatórios não misturam dados entre usuários', async () => {
    const userA = await criarUsuarioEToken(app, request);
    const userB = await criarUsuarioEToken(app, request);
    await criarLead(userA.token, { nome: 'Só de A', origem: 'Facebook' });

    const resposta = await request(app)
      .get('/api/relatorios/leads-por-origem')
      .set('Authorization', `Bearer ${userB.token}`);

    expect(resposta.body.find((r) => r.origem === 'Facebook')).toBeUndefined();
  });
});
