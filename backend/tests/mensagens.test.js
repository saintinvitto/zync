const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const { criarUsuarioEToken } = require('./helpers');

afterAll(async () => {
  await db.end();
});

async function criarLead(token) {
  const resposta = await request(app)
    .post('/api/leads')
    .set('Authorization', `Bearer ${token}`)
    .send({ nome: 'Lead com conversa' });
  return resposta.body;
}

describe('POST /api/leads/:leadId/mensagens', () => {
  test('cria mensagem válida', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token);

    const resposta = await request(app)
      .post(`/api/leads/${lead.id}/mensagens`)
      .set('Authorization', `Bearer ${token}`)
      .send({ conteudo: 'Olá!', enviado_por: 'cliente' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.conteudo).toBe('Olá!');
  });

  test('rejeita enviado_por inválido', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token);

    const resposta = await request(app)
      .post(`/api/leads/${lead.id}/mensagens`)
      .set('Authorization', `Bearer ${token}`)
      .send({ conteudo: 'Oi', enviado_por: 'robo' });

    expect(resposta.status).toBe(400);
  });

  test('rejeita mensagem em lead de outro usuário', async () => {
    const userA = await criarUsuarioEToken(app, request);
    const userB = await criarUsuarioEToken(app, request);
    const lead = await criarLead(userA.token);

    const resposta = await request(app)
      .post(`/api/leads/${lead.id}/mensagens`)
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ conteudo: 'Invasor', enviado_por: 'humano' });

    expect(resposta.status).toBe(404);
  });
});

describe('GET /api/leads/:leadId/mensagens', () => {
  test('lista mensagens em ordem cronológica', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token);

    for (const conteudo of ['Primeira', 'Segunda', 'Terceira']) {
      await request(app)
        .post(`/api/leads/${lead.id}/mensagens`)
        .set('Authorization', `Bearer ${token}`)
        .send({ conteudo, enviado_por: 'cliente' });
    }

    const resposta = await request(app)
      .get(`/api/leads/${lead.id}/mensagens`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.body.map((m) => m.conteudo)).toEqual(['Primeira', 'Segunda', 'Terceira']);
  });
});
