jest.mock('../src/models/webhookModel');

const crypto = require('crypto');
const webhookModel = require('../src/models/webhookModel');
const webhookService = require('../src/services/webhookService');

describe('webhookService.urlPermitida', () => {
  test('aceita URL http/https pública', () => {
    expect(webhookService.urlPermitida('https://meu-erp.com/webhook')).toBe(true);
    expect(webhookService.urlPermitida('http://exemplo.com.br/x')).toBe(true);
  });

  test('rejeita protocolo diferente de http/https', () => {
    expect(webhookService.urlPermitida('ftp://exemplo.com/x')).toBe(false);
  });

  test('rejeita localhost e IPs privados (SSRF)', () => {
    expect(webhookService.urlPermitida('http://localhost:3001/x')).toBe(false);
    expect(webhookService.urlPermitida('http://127.0.0.1/x')).toBe(false);
    expect(webhookService.urlPermitida('http://192.168.1.10/x')).toBe(false);
    expect(webhookService.urlPermitida('http://10.0.0.5/x')).toBe(false);
    expect(webhookService.urlPermitida('http://172.16.0.1/x')).toBe(false);
  });

  test('rejeita string que não é uma URL válida', () => {
    expect(webhookService.urlPermitida('isso-nao-e-url')).toBe(false);
  });
});

describe('webhookService.enviarTeste', () => {
  const ORIGINAL_FETCH = global.fetch;

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    jest.clearAllMocks();
  });

  const webhook = { url: 'https://exemplo.com/hook', secret: 'segredo-teste' };

  test('assina o corpo com HMAC-SHA256 do secret e retorna sucesso', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    const resultado = await webhookService.enviarTeste(webhook);

    expect(resultado).toEqual({ sucesso: true, status: 200 });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, opcoes] = global.fetch.mock.calls[0];
    expect(url).toBe('https://exemplo.com/hook');

    const corpoEnviado = opcoes.body;
    const assinaturaEsperada = 'sha256=' + crypto.createHmac('sha256', 'segredo-teste').update(corpoEnviado).digest('hex');
    expect(opcoes.headers['X-Zync-Signature']).toBe(assinaturaEsperada);

    const payload = JSON.parse(corpoEnviado);
    expect(payload.evento).toBe('teste');
  });

  test('tenta de novo uma vez se a primeira chamada falhar, depois desiste', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    const resultado = await webhookService.enviarTeste(webhook);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(resultado).toEqual({ sucesso: false, status: 0 });
  }, 10000);

  test('sucesso na segunda tentativa depois de falhar na primeira', async () => {
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const resultado = await webhookService.enviarTeste(webhook);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(resultado).toEqual({ sucesso: true, status: 200 });
  }, 10000);
});

describe('webhookService.disparar', () => {
  const ORIGINAL_FETCH = global.fetch;

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    jest.clearAllMocks();
  });

  test('não chama fetch quando não há webhook ativo pro evento', async () => {
    webhookModel.listarAtivosParaEvento.mockResolvedValue([]);
    global.fetch = jest.fn();

    await webhookService.disparar(1, 'lead_criado', { id: 1 });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('dispara fetch assinado pra cada webhook ativo do evento', async () => {
    webhookModel.listarAtivosParaEvento.mockResolvedValue([
      { id: 1, url: 'https://a.com/hook', secret: 'segredo-a' },
      { id: 2, url: 'https://b.com/hook', secret: 'segredo-b' },
    ]);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await webhookService.disparar(1, 'lead_criado', { id: 42, nome: 'Maria' });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(webhookModel.listarAtivosParaEvento).toHaveBeenCalledWith(1, 'lead_criado');
  });

  test('nunca lança erro mesmo se o modelo falhar', async () => {
    webhookModel.listarAtivosParaEvento.mockRejectedValue(new Error('banco fora'));

    await expect(webhookService.disparar(1, 'lead_criado', {})).resolves.toBeUndefined();
  });
});
