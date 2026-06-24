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
    .send({ nome: 'Lead agendado' });
  return resposta.body;
}

describe('Agendamentos', () => {
  test('cria agendamento para um lead', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token);

    const resposta = await request(app)
      .post(`/api/leads/${lead.id}/agendamentos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ servico: 'Consulta', data_hora: '2030-01-15 10:00:00' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.status).toBe('agendado');
  });

  test('rejeita sem data_hora', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token);

    const resposta = await request(app)
      .post(`/api/leads/${lead.id}/agendamentos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ servico: 'Consulta' });

    expect(resposta.status).toBe(400);
  });

  test('lista agendamentos do usuário ordenados por data', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token);

    await request(app)
      .post(`/api/leads/${lead.id}/agendamentos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ servico: 'Segundo', data_hora: '2030-02-01 10:00:00' });
    await request(app)
      .post(`/api/leads/${lead.id}/agendamentos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ servico: 'Primeiro', data_hora: '2030-01-01 10:00:00' });

    const resposta = await request(app).get('/api/agendamentos').set('Authorization', `Bearer ${token}`);
    expect(resposta.body.map((a) => a.servico)).toEqual(['Primeiro', 'Segundo']);
  });

  test('atualiza status do agendamento', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token);
    const agendamento = await request(app)
      .post(`/api/leads/${lead.id}/agendamentos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ servico: 'Consulta', data_hora: '2030-03-01 10:00:00' });

    const resposta = await request(app)
      .put(`/api/agendamentos/${agendamento.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'confirmado' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.status).toBe('confirmado');
  });

  test('rejeita status inválido', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token);
    const agendamento = await request(app)
      .post(`/api/leads/${lead.id}/agendamentos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ servico: 'Consulta', data_hora: '2030-03-01 10:00:00' });

    const resposta = await request(app)
      .put(`/api/agendamentos/${agendamento.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'inexistente' });

    expect(resposta.status).toBe(400);
  });
});
