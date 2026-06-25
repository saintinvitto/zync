const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const { criarUsuarioEToken } = require('./helpers');
const { enviarLembretesPendentes } = require('../src/jobs/lembreteAgendamentoJob');

afterAll(async () => {
  await db.end();
});

async function criarLeadComTelefone(token, telefone) {
  const resposta = await request(app)
    .post('/api/leads')
    .set('Authorization', `Bearer ${token}`)
    .send({ nome: 'Lead Lembrete', telefone });
  return resposta.body;
}

async function criarAgendamento(token, leadId, dataHoraISO, servico) {
  const resposta = await request(app)
    .post(`/api/leads/${leadId}/agendamentos`)
    .set('Authorization', `Bearer ${token}`)
    .send({ data_hora: dataHoraISO, servico });
  return resposta.body;
}

async function buscarAgendamento(token, leadId, agendamentoId) {
  const resposta = await request(app)
    .get(`/api/leads/${leadId}/agendamentos`)
    .set('Authorization', `Bearer ${token}`);
  return resposta.body.find((a) => a.id === agendamentoId);
}

async function listarMensagens(token, leadId) {
  const resposta = await request(app)
    .get(`/api/leads/${leadId}/mensagens`)
    .set('Authorization', `Bearer ${token}`);
  return resposta.body;
}

describe('lembreteAgendamentoJob', () => {
  test('envia lembrete e marca como enviado pra agendamento dentro da janela de 24h', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLeadComTelefone(token, '11999990000');
    const emDuasHoras = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const agendamento = await criarAgendamento(token, lead.id, emDuasHoras, 'Corte');

    await enviarLembretesPendentes();

    const atualizado = await buscarAgendamento(token, lead.id, agendamento.id);
    expect(atualizado.lembrete_enviado_em).not.toBeNull();

    const mensagens = await listarMensagens(token, lead.id);
    expect(mensagens.some((m) => m.enviado_por === 'ia' && m.conteudo.includes('lembrar'))).toBe(true);
  });

  test('não reenvia lembrete já marcado como enviado', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLeadComTelefone(token, '11999990001');
    const emUmaHora = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await criarAgendamento(token, lead.id, emUmaHora, 'Corte');

    await enviarLembretesPendentes();
    const mensagensAposPrimeiraExecucao = await listarMensagens(token, lead.id);

    await enviarLembretesPendentes();
    const mensagensAposSegundaExecucao = await listarMensagens(token, lead.id);

    expect(mensagensAposPrimeiraExecucao).toHaveLength(1);
    expect(mensagensAposSegundaExecucao).toHaveLength(1);
  });

  test('não envia lembrete pra agendamento fora da janela de 24h', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLeadComTelefone(token, '11999990002');
    const em48Horas = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const agendamento = await criarAgendamento(token, lead.id, em48Horas, 'Corte');

    await enviarLembretesPendentes();

    const atualizado = await buscarAgendamento(token, lead.id, agendamento.id);
    expect(atualizado.lembrete_enviado_em).toBeNull();

    const mensagens = await listarMensagens(token, lead.id);
    expect(mensagens).toHaveLength(0);
  });

  test('não envia lembrete pra lead sem telefone cadastrado', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const resposta = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Lead Sem Telefone' });
    const lead = resposta.body;

    const emUmaHora = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const agendamento = await criarAgendamento(token, lead.id, emUmaHora, 'Corte');

    await enviarLembretesPendentes();

    const atualizado = await buscarAgendamento(token, lead.id, agendamento.id);
    expect(atualizado.lembrete_enviado_em).toBeNull();
  });
});
