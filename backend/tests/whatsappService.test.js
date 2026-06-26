const { enviarMensagem, enviarMidia, uploadMidia, baixarMidia } = require('../src/services/whatsappService');

describe('whatsappService', () => {
  const ORIGINAL_FETCH = global.fetch;
  const ORIGINAL_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const ORIGINAL_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    process.env.WHATSAPP_ACCESS_TOKEN = ORIGINAL_TOKEN;
    process.env.WHATSAPP_PHONE_NUMBER_ID = ORIGINAL_PHONE_ID;
  });

  test('sem credenciais, cai no mock e nao chama fetch', async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    global.fetch = jest.fn();

    const resultado = await enviarMensagem('11999999999', 'Oi');

    expect(resultado).toEqual({ sucesso: true });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('com credenciais, chama a API do WhatsApp Cloud com o telefone limpo', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'token-teste';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456';
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const resultado = await enviarMensagem('(11) 99999-9999', 'Olá, tudo bem?');

    expect(resultado).toEqual({ sucesso: true });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v21.0/123456/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token-teste' }),
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: '11999999999',
          type: 'text',
          text: { body: 'Olá, tudo bem?' },
        }),
      })
    );
  });

  test('se a API falhar, retorna sucesso false em vez de lancar', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'token-teste';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456';
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'erro' });

    const resultado = await enviarMensagem('11999999999', 'Oi');

    expect(resultado).toEqual({ sucesso: false });
  });

  test('enviarMidia sem credenciais cai no mock', async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    global.fetch = jest.fn();

    const resultado = await enviarMidia('11999999999', { tipo: 'imagem', midiaId: 'midia-1' });

    expect(resultado).toEqual({ sucesso: true });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('enviarMidia com credenciais chama a API com o tipo certo', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'token-teste';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456';
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    await enviarMidia('11999999999', { tipo: 'documento', midiaId: 'midia-9', legenda: 'Nota fiscal' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v21.0/123456/messages',
      expect.objectContaining({
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: '11999999999',
          type: 'document',
          document: { id: 'midia-9', caption: 'Nota fiscal' },
        }),
      })
    );
  });

  test('uploadMidia envia multipart e retorna o id', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'token-teste';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'midia-nova' }) });

    const id = await uploadMidia(Buffer.from('conteudo-fake'), 'image/png');

    expect(id).toBe('midia-nova');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v21.0/123456/media',
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('uploadMidia lanca erro se a Meta rejeitar', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'token-teste';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456';
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'erro' });

    await expect(uploadMidia(Buffer.from('x'), 'image/png')).rejects.toThrow(/Falha ao enviar mídia/);
  });

  test('baixarMidia busca metadados e depois o arquivo', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'token-teste';
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://meta.example/arquivo', mime_type: 'image/png' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => Buffer.from('bytes-fake') });

    const resultado = await baixarMidia('midia-1');

    expect(resultado.mimeType).toBe('image/png');
    expect(Buffer.isBuffer(resultado.buffer)).toBe(true);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://graph.facebook.com/v21.0/midia-1',
      expect.objectContaining({ headers: { Authorization: 'Bearer token-teste' } })
    );
  });
});
