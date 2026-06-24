const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const { criarUsuarioEToken } = require('./helpers');

afterAll(async () => {
  await db.end();
});

async function criarLead(token, nome = 'Lead notificado') {
  const resposta = await request(app)
    .post('/api/leads')
    .set('Authorization', `Bearer ${token}`)
    .send({ nome });
  return resposta.body;
}

describe('Notificações', () => {
  test('criar lead gera notificação não lida', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    await criarLead(token);

    const contagem = await request(app)
      .get('/api/notificacoes/contagem')
      .set('Authorization', `Bearer ${token}`);
    expect(contagem.body.naoLidas).toBe(1);

    const listar = await request(app).get('/api/notificacoes').set('Authorization', `Bearer ${token}`);
    expect(listar.body[0].tipo).toBe('lead_criado');
  });

  test('marcar como lida e marcar todas como lidas', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    await criarLead(token, 'Lead 1');
    await criarLead(token, 'Lead 2');

    const lista = await request(app).get('/api/notificacoes').set('Authorization', `Bearer ${token}`);
    const idMaisRecente = lista.body[0].id;

    await request(app)
      .patch(`/api/notificacoes/${idMaisRecente}/lida`)
      .set('Authorization', `Bearer ${token}`);

    const apos1 = await request(app)
      .get('/api/notificacoes/contagem')
      .set('Authorization', `Bearer ${token}`);
    expect(apos1.body.naoLidas).toBe(1);

    await request(app).patch('/api/notificacoes/lida-todas').set('Authorization', `Bearer ${token}`);

    const apos2 = await request(app)
      .get('/api/notificacoes/contagem')
      .set('Authorization', `Bearer ${token}`);
    expect(apos2.body.naoLidas).toBe(0);
  });

  test('retorna 404 ao marcar notificação inexistente como lida', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const resposta = await request(app)
      .patch('/api/notificacoes/999999/lida')
      .set('Authorization', `Bearer ${token}`);
    expect(resposta.status).toBe(404);
  });
});

describe('Logs de auditoria', () => {
  test('registra log ao criar lead e ao mudar status', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token);

    await request(app)
      .put(`/api/leads/${lead.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'em_contato' });

    const resposta = await request(app)
      .get(`/api/logs?leadId=${lead.id}`)
      .set('Authorization', `Bearer ${token}`);

    const acoes = resposta.body.map((l) => l.acao);
    expect(acoes).toContain('lead_criado');
    expect(acoes).toContain('lead_status_alterado');
  });

  test('log sobrevive à remoção do lead com lead_id nulo', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token);

    await request(app).delete(`/api/leads/${lead.id}`).set('Authorization', `Bearer ${token}`);

    const resposta = await request(app).get('/api/logs').set('Authorization', `Bearer ${token}`);
    const logDoLead = resposta.body.find((l) => l.acao === 'lead_criado');

    expect(logDoLead).toBeDefined();
    expect(logDoLead.lead_id).toBeNull();
  });
});
