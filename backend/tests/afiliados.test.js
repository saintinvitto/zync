const request = require('supertest');

jest.mock('../src/services/syncpayService', () => ({
  criarCobrancaPix: jest.fn(() =>
    Promise.resolve({
      pixCode: 'pix-mock-' + Math.random().toString(36).slice(2),
      identifier: 'mock-identifier-' + Math.random().toString(36).slice(2),
    })
  ),
  consultarTransacao: jest.fn(),
}));

jest.mock('../src/utils/ntfy', () => ({
  notificar: jest.fn(),
}));

const app = require('../src/app');
const db = require('../src/config/db');
const { criarUsuarioEToken } = require('./helpers');

afterAll(async () => {
  await db.end();
});

const CPF_VALIDO = '52998224725';

async function criarAdmin() {
  const usuarioComToken = await criarUsuarioEToken(app, request);
  await db.query('UPDATE usuarios SET is_admin = true WHERE id = $1', [usuarioComToken.usuario.id]);

  const relogin = await request(app)
    .post('/api/auth/login')
    .send({ email: usuarioComToken.email, senha: usuarioComToken.senha });

  return { ...usuarioComToken, token: relogin.body.token };
}

function autorizacaoWebhook() {
  return `Bearer ${process.env.SYNCPAY_WEBHOOK_TOKEN}`;
}

async function fazerCheckout(token, overrides = {}) {
  return request(app)
    .post('/api/assinaturas/checkout')
    .set('Authorization', `Bearer ${token}`)
    .send({
      planoId: 1,
      nome: 'Comprador Teste',
      cpf: CPF_VALIDO,
      email: 'comprador@zync.com',
      telefone: '11999998888',
      ...overrides,
    });
}

describe('POST /api/admin/afiliados', () => {
  test('cria afiliado pra usuario existente', async () => {
    const admin = await criarAdmin();
    const { email } = await criarUsuarioEToken(app, request);

    const resposta = await request(app)
      .post('/api/admin/afiliados')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email, percentualComissao: 25 });

    expect(resposta.status).toBe(201);
    expect(resposta.body.percentual_comissao).toBe('25.00');
    expect(resposta.body.codigo).toMatch(/^[0-9A-F]{8}$/);
  });

  test('rejeita email que nao existe', async () => {
    const admin = await criarAdmin();
    const resposta = await request(app)
      .post('/api/admin/afiliados')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: 'naoexiste@zync.com' });

    expect(resposta.status).toBe(404);
  });

  test('rejeita usuario que ja e afiliado', async () => {
    const admin = await criarAdmin();
    const { email } = await criarUsuarioEToken(app, request);

    await request(app)
      .post('/api/admin/afiliados')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email });

    const segunda = await request(app)
      .post('/api/admin/afiliados')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email });

    expect(segunda.status).toBe(409);
  });

  test('rejeita percentual fora de 0-100', async () => {
    const admin = await criarAdmin();
    const { email } = await criarUsuarioEToken(app, request);

    const resposta = await request(app)
      .post('/api/admin/afiliados')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email, percentualComissao: 150 });

    expect(resposta.status).toBe(400);
  });
});

describe('Fluxo completo: indicacao -> cadastro -> pagamento -> comissao', () => {
  test('gera comissao correta quando o indicado paga a assinatura', async () => {
    const admin = await criarAdmin();
    const afiliadoUsuario = await criarUsuarioEToken(app, request);

    const criarResp = await request(app)
      .post('/api/admin/afiliados')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: afiliadoUsuario.email, percentualComissao: 20 });
    const codigo = criarResp.body.codigo;
    const afiliadoId = criarResp.body.id;

    const emailIndicado = `indicado-${Date.now()}@zync.com`;
    await request(app).post('/api/auth/register').send({
      nome: 'Indicado Teste B',
      email: emailIndicado,
      senha: 'senha123',
      codigoIndicacao: codigo,
    });
    const loginIndicado = await request(app)
      .post('/api/auth/login')
      .send({ email: emailIndicado, senha: 'senha123' });
    const tokenIndicado = loginIndicado.body.token;

    const checkout = await fazerCheckout(tokenIndicado, { email: emailIndicado });
    expect(checkout.status).toBe(201);

    const webhook = await request(app)
      .post('/api/webhooks/syncpay')
      .set('Authorization', autorizacaoWebhook())
      .send({ data: { id: checkout.body.identifier, status: 'completed' } });
    expect(webhook.status).toBe(200);

    const comissoes = await request(app)
      .get(`/api/admin/afiliados/${afiliadoId}/comissoes`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(comissoes.status).toBe(200);
    expect(comissoes.body).toHaveLength(1);
    expect(comissoes.body[0].status).toBe('pendente');
    expect(Number(comissoes.body[0].valor)).toBeCloseTo(Number(checkout.body.valor) * 0.2, 2);

    const listaAfiliados = await request(app)
      .get('/api/admin/afiliados')
      .set('Authorization', `Bearer ${admin.token}`);
    const afiliadoNaLista = listaAfiliados.body.find((a) => a.id === afiliadoId);
    expect(Number(afiliadoNaLista.total_indicados)).toBeGreaterThanOrEqual(1);
    expect(Number(afiliadoNaLista.comissao_pendente)).toBeCloseTo(Number(checkout.body.valor) * 0.2, 2);
  });

  test('cadastro com codigo de indicacao invalido nao quebra o registro', async () => {
    const resposta = await request(app).post('/api/auth/register').send({
      nome: 'Sem Indicacao Valida',
      email: `semindicacao-${Date.now()}@zync.com`,
      senha: 'senha123',
      codigoIndicacao: 'CODIGOFALSO',
    });

    expect(resposta.status).toBe(201);
  });

  test('marcar comissao como paga', async () => {
    const admin = await criarAdmin();
    const afiliadoUsuario = await criarUsuarioEToken(app, request);

    const criarResp = await request(app)
      .post('/api/admin/afiliados')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: afiliadoUsuario.email });
    const codigo = criarResp.body.codigo;
    const afiliadoId = criarResp.body.id;

    const emailIndicado = `indicado-paga-${Date.now()}@zync.com`;
    await request(app).post('/api/auth/register').send({
      nome: 'Indicado Pago',
      email: emailIndicado,
      senha: 'senha123',
      codigoIndicacao: codigo,
    });
    const login = await request(app).post('/api/auth/login').send({ email: emailIndicado, senha: 'senha123' });

    const checkout = await fazerCheckout(login.body.token, { email: emailIndicado });
    await request(app)
      .post('/api/webhooks/syncpay')
      .set('Authorization', autorizacaoWebhook())
      .send({ data: { id: checkout.body.identifier, status: 'completed' } });

    const comissoes = await request(app)
      .get(`/api/admin/afiliados/${afiliadoId}/comissoes`)
      .set('Authorization', `Bearer ${admin.token}`);
    const comissaoId = comissoes.body[0].id;

    const marcarPaga = await request(app)
      .patch(`/api/admin/comissoes/${comissaoId}/paga`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(marcarPaga.status).toBe(204);

    const comissoesDepois = await request(app)
      .get(`/api/admin/afiliados/${afiliadoId}/comissoes`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(comissoesDepois.body[0].status).toBe('paga');
  });
});

describe('PUT /api/admin/afiliados/:id', () => {
  test('desativa um afiliado', async () => {
    const admin = await criarAdmin();
    const { email } = await criarUsuarioEToken(app, request);

    const criarResp = await request(app)
      .post('/api/admin/afiliados')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email });

    const atualizar = await request(app)
      .put(`/api/admin/afiliados/${criarResp.body.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ativo: false });

    expect(atualizar.status).toBe(200);
    expect(atualizar.body.ativo).toBe(false);
  });
});
