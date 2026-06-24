const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const { criarUsuarioEToken } = require('./helpers');

afterAll(async () => {
  await db.end();
});

function autorizacaoWebhook() {
  const tokenEsperado = process.env.WHATSAPP_WEBHOOK_TOKEN;
  return tokenEsperado ? `Bearer ${tokenEsperado}` : undefined;
}

describe('POST /api/webhooks/whatsapp/:usuarioId', () => {
  test('rejeita sem o token correto quando configurado', async () => {
    if (!process.env.WHATSAPP_WEBHOOK_TOKEN) return;

    const { usuario } = await criarUsuarioEToken(app, request);
    const resposta = await request(app)
      .post(`/api/webhooks/whatsapp/${usuario.id}`)
      .set('Authorization', 'Bearer token-errado')
      .send({ telefone: '11999998888', nome: 'Cliente Novo', mensagem: 'Oi' });

    expect(resposta.status).toBe(401);
  });

  test('cria lead e mensagens, gera notificação', async () => {
    const { token, usuario } = await criarUsuarioEToken(app, request);
    const auth = autorizacaoWebhook();

    const req = request(app).post(`/api/webhooks/whatsapp/${usuario.id}`);
    if (auth) req.set('Authorization', auth);

    const resposta = await req.send({ telefone: '11988887777', nome: 'Cliente WhatsApp', mensagem: 'Olá, gostaria de informações' });
    expect(resposta.status).toBe(200);

    const leads = await request(app).get('/api/leads').set('Authorization', `Bearer ${token}`);
    expect(leads.body).toHaveLength(1);
    expect(leads.body[0].telefone).toBe('11988887777');

    const mensagens = await request(app)
      .get(`/api/leads/${leads.body[0].id}/mensagens`)
      .set('Authorization', `Bearer ${token}`);
    expect(mensagens.body.map((m) => m.enviado_por)).toEqual(['cliente', 'ia']);

    const notificacoes = await request(app)
      .get('/api/notificacoes')
      .set('Authorization', `Bearer ${token}`);
    expect(notificacoes.body.some((n) => n.tipo === 'mensagem_recebida')).toBe(true);
  });

  test('reaproveita lead existente pelo telefone em mensagens seguintes', async () => {
    const { token, usuario } = await criarUsuarioEToken(app, request);
    const auth = autorizacaoWebhook();

    for (const mensagem of ['Primeira mensagem', 'Segunda mensagem']) {
      const req = request(app).post(`/api/webhooks/whatsapp/${usuario.id}`);
      if (auth) req.set('Authorization', auth);
      await req.send({ telefone: '11977776666', nome: 'Cliente Recorrente', mensagem });
    }

    const leads = await request(app).get('/api/leads').set('Authorization', `Bearer ${token}`);
    expect(leads.body).toHaveLength(1);
  });
});
