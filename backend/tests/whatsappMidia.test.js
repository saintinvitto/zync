const crypto = require('crypto');
const request = require('supertest');

jest.mock('../src/services/whatsappService', () => ({
  enviarMensagem: jest.fn(() => Promise.resolve({ sucesso: true })),
  enviarMidia: jest.fn(() => Promise.resolve({ sucesso: true })),
  uploadMidia: jest.fn(() => Promise.resolve('midia-mock-id')),
  baixarMidia: jest.fn(() => Promise.resolve({ buffer: Buffer.from('bytes-fake'), mimeType: 'image/png' })),
}));

const app = require('../src/app');
const db = require('../src/config/db');
const whatsappService = require('../src/services/whatsappService');
const { criarUsuarioEToken } = require('./helpers');

afterAll(async () => {
  await db.end();
});

afterEach(() => {
  jest.clearAllMocks();
});

const APP_SECRET = 'segredo-app-teste-midia';

function assinar(payload) {
  const corpo = JSON.stringify(payload);
  return 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(corpo).digest('hex');
}

async function criarLead(token, overrides = {}) {
  const resposta = await request(app)
    .post('/api/leads')
    .set('Authorization', `Bearer ${token}`)
    .send({ nome: 'Lead Mídia', telefone: '11988887777', ...overrides });
  return resposta.body;
}

describe('POST /api/leads/:leadId/whatsapp/enviar-midia', () => {
  test('faz upload, envia e salva a mensagem com tipo imagem', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token);

    const resposta = await request(app)
      .post(`/api/leads/${lead.id}/whatsapp/enviar-midia`)
      .set('Authorization', `Bearer ${token}`)
      .field('legenda', 'Olha essa foto')
      .attach('arquivo', Buffer.from('fake-png-bytes'), { filename: 'foto.png', contentType: 'image/png' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.tipo).toBe('imagem');
    expect(resposta.body.midia_id).toBe('midia-mock-id');
    expect(resposta.body.conteudo).toBe('Olha essa foto');
    expect(whatsappService.uploadMidia).toHaveBeenCalledTimes(1);
    expect(whatsappService.enviarMidia).toHaveBeenCalledWith(
      '11988887777',
      expect.objectContaining({ tipo: 'imagem', midiaId: 'midia-mock-id' })
    );
  });

  test('classifica PDF como documento', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token);

    const resposta = await request(app)
      .post(`/api/leads/${lead.id}/whatsapp/enviar-midia`)
      .set('Authorization', `Bearer ${token}`)
      .attach('arquivo', Buffer.from('%PDF-fake'), { filename: 'exame.pdf', contentType: 'application/pdf' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.tipo).toBe('documento');
  });

  test('rejeita sem arquivo', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token);

    const resposta = await request(app)
      .post(`/api/leads/${lead.id}/whatsapp/enviar-midia`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(400);
  });

  test('404 pra lead de outro usuário', async () => {
    const { token: tokenA } = await criarUsuarioEToken(app, request);
    const { token: tokenB } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(tokenA);

    const resposta = await request(app)
      .post(`/api/leads/${lead.id}/whatsapp/enviar-midia`)
      .set('Authorization', `Bearer ${tokenB}`)
      .attach('arquivo', Buffer.from('x'), { filename: 'a.png', contentType: 'image/png' });

    expect(resposta.status).toBe(404);
  });

  test('400 pra lead sem telefone', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token, { telefone: undefined });

    const resposta = await request(app)
      .post(`/api/leads/${lead.id}/whatsapp/enviar-midia`)
      .set('Authorization', `Bearer ${token}`)
      .attach('arquivo', Buffer.from('x'), { filename: 'a.png', contentType: 'image/png' });

    expect(resposta.status).toBe(400);
  });
});

describe('GET /api/leads/:leadId/whatsapp/midia/:mensagemId', () => {
  test('retorna os bytes da mídia com o content-type certo', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token);

    const envio = await request(app)
      .post(`/api/leads/${lead.id}/whatsapp/enviar-midia`)
      .set('Authorization', `Bearer ${token}`)
      .attach('arquivo', Buffer.from('x'), { filename: 'a.png', contentType: 'image/png' });

    const resposta = await request(app)
      .get(`/api/leads/${lead.id}/whatsapp/midia/${envio.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.headers['content-type']).toMatch(/image\/png/);
  });

  test('404 pra mensagem sem mídia', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token);

    const mensagemTexto = await request(app)
      .post(`/api/leads/${lead.id}/whatsapp/enviar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ conteudo: 'Oi' });

    const resposta = await request(app)
      .get(`/api/leads/${lead.id}/whatsapp/midia/${mensagemTexto.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(404);
  });

  test('404 ao tentar acessar mídia de lead de outro usuário', async () => {
    const { token: tokenA } = await criarUsuarioEToken(app, request);
    const { token: tokenB } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(tokenA);

    const envio = await request(app)
      .post(`/api/leads/${lead.id}/whatsapp/enviar-midia`)
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('arquivo', Buffer.from('x'), { filename: 'a.png', contentType: 'image/png' });

    const resposta = await request(app)
      .get(`/api/leads/${lead.id}/whatsapp/midia/${envio.body.id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resposta.status).toBe(404);
  });
});

describe('Webhook da Meta recebendo imagem', () => {
  const ORIGINAL_APP_SECRET = process.env.WHATSAPP_APP_SECRET;

  afterEach(() => {
    process.env.WHATSAPP_APP_SECRET = ORIGINAL_APP_SECRET;
  });

  test('salva mensagem do tipo imagem e nao chama a IA quando nao tem legenda', async () => {
    process.env.WHATSAPP_APP_SECRET = APP_SECRET;
    const { token, usuario } = await criarUsuarioEToken(app, request);

    const usuarioModel = require('../src/models/usuarioModel');
    await usuarioModel.atualizar(usuario.id, { whatsapp_phone_number_id: 'phone-midia-1' });

    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'waba-id',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '550000000', phone_number_id: 'phone-midia-1' },
            contacts: [{ profile: { name: 'Cliente Foto' }, wa_id: '11955554444' }],
            messages: [{ from: '11955554444', id: 'wamid.midia', timestamp: '123', type: 'image', image: { id: 'meta-midia-id', mime_type: 'image/jpeg' } }],
          },
        }],
      }],
    };

    const resposta = await request(app)
      .post('/api/webhooks/whatsapp-meta')
      .set('x-hub-signature-256', assinar(payload))
      .send(payload);

    expect(resposta.status).toBe(200);

    const leads = await request(app).get('/api/leads').set('Authorization', `Bearer ${token}`);
    const lead = leads.body.find((l) => l.telefone === '11955554444');
    expect(lead).toBeDefined();

    const mensagens = await request(app)
      .get(`/api/leads/${lead.id}/mensagens`)
      .set('Authorization', `Bearer ${token}`);

    expect(mensagens.body).toHaveLength(1);
    expect(mensagens.body[0].tipo).toBe('imagem');
    expect(mensagens.body[0].midia_id).toBe('meta-midia-id');
    expect(whatsappService.enviarMensagem).not.toHaveBeenCalled();
  });
});
