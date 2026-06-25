jest.mock('../src/services/agendamentoService', () => ({
  criarComEfeitos: jest.fn().mockResolvedValue({ id: 1 }),
}));

const { gerarResposta } = require('../src/services/iaService');
const agendamentoService = require('../src/services/agendamentoService');

describe('iaService', () => {
  const ORIGINAL_FETCH = global.fetch;
  const ORIGINAL_API_KEY = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    process.env.ANTHROPIC_API_KEY = ORIGINAL_API_KEY;
    agendamentoService.criarComEfeitos.mockClear();
  });

  test('sem ANTHROPIC_API_KEY, usa o mock por palavra-chave', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    global.fetch = jest.fn();

    const resposta = await gerarResposta('Qual o preço da consulta?');

    expect(resposta).toMatch(/valores variam/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('com ANTHROPIC_API_KEY, chama a API da Anthropic e retorna o texto gerado', async () => {
    process.env.ANTHROPIC_API_KEY = 'chave-teste';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'Resposta gerada pela IA' }] }),
    });

    const resposta = await gerarResposta('Oi, gostaria de informações');

    expect(resposta).toBe('Resposta gerada pela IA');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-api-key': 'chave-teste' }),
      })
    );
  });

  test('se a API falhar, cai no mock em vez de lançar', async () => {
    process.env.ANTHROPIC_API_KEY = 'chave-teste';
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'erro' });

    const resposta = await gerarResposta('horário de atendimento?');

    expect(resposta).toMatch(/segunda a sábado/i);
  });

  test('monta o system prompt com os dados da empresa quando fornecidos', async () => {
    process.env.ANTHROPIC_API_KEY = 'chave-teste';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    });

    await gerarResposta('Oi', {
      nome_empresa: 'Studio Beleza & Cia',
      ia_o_que_vende: 'Limpeza de pele e design de sobrancelha',
      ia_horario_funcionamento: 'Seg a sáb, 9h às 19h',
      ia_tom_de_voz: 'casual',
    });

    const corpo = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(corpo.system).toContain('Studio Beleza & Cia');
    expect(corpo.system).toContain('Limpeza de pele e design de sobrancelha');
    expect(corpo.system).toContain('Seg a sáb, 9h às 19h');
    expect(corpo.system).toMatch(/casual/i);
  });

  test('sem dados da empresa, usa prompt genérico (sem quebrar)', async () => {
    process.env.ANTHROPIC_API_KEY = 'chave-teste';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    });

    await gerarResposta('Oi');

    const corpo = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(corpo.system).toContain('uma empresa');
  });

  test('sem leadId/usuarioId no contexto, não manda a ferramenta de agendar pra IA', async () => {
    process.env.ANTHROPIC_API_KEY = 'chave-teste';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    });

    await gerarResposta('Oi');

    const corpo = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(corpo.tools).toBeUndefined();
  });

  test('com contexto, manda a ferramenta agendar_horario pra IA', async () => {
    process.env.ANTHROPIC_API_KEY = 'chave-teste';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    });

    await gerarResposta('Oi', {}, { usuarioId: 1, leadId: 2 });

    const corpo = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(corpo.tools).toHaveLength(1);
    expect(corpo.tools[0].name).toBe('agendar_horario');
  });

  test('quando a IA usa a ferramenta de agendar, cria o agendamento e devolve a resposta final', async () => {
    process.env.ANTHROPIC_API_KEY = 'chave-teste';

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            { type: 'tool_use', id: 'toolu_1', name: 'agendar_horario', input: { data_hora: '2026-07-01T14:00:00', servico: 'Corte' } },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: 'Prontinho, agendei pra você!' }] }),
      });

    const resposta = await gerarResposta('Pode ser dia 01/07 às 14h', {}, { usuarioId: 5, leadId: 9 });

    expect(agendamentoService.criarComEfeitos).toHaveBeenCalledWith({
      usuarioId: 5,
      leadId: 9,
      servico: 'Corte',
      data_hora: '2026-07-01T14:00:00',
      origem: 'ia',
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(resposta).toBe('Prontinho, agendei pra você!');
  });

  test('se a data_hora vier inválida da ferramenta, não cria agendamento e avisa a IA do erro', async () => {
    process.env.ANTHROPIC_API_KEY = 'chave-teste';

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'tool_use', id: 'toolu_2', name: 'agendar_horario', input: { data_hora: 'data-invalida' } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: 'Pode me confirmar o dia e horário?' }] }),
      });

    await gerarResposta('marca pra mim', {}, { usuarioId: 5, leadId: 9 });

    expect(agendamentoService.criarComEfeitos).not.toHaveBeenCalled();

    const segundaChamada = JSON.parse(global.fetch.mock.calls[1][1].body);
    const toolResult = segundaChamada.messages[2].content[0];
    expect(toolResult.content).toMatch(/inválida/i);
  });

  test('se a data_hora vier no passado, não cria agendamento e avisa a IA do erro', async () => {
    process.env.ANTHROPIC_API_KEY = 'chave-teste';

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'tool_use', id: 'toolu_3', name: 'agendar_horario', input: { data_hora: '2020-01-01T10:00:00' } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: 'Vou confirmar a data certa com você' }] }),
      });

    await gerarResposta('marca pra ontem', {}, { usuarioId: 5, leadId: 9 });

    expect(agendamentoService.criarComEfeitos).not.toHaveBeenCalled();

    const segundaChamada = JSON.parse(global.fetch.mock.calls[1][1].body);
    const toolResult = segundaChamada.messages[2].content[0];
    expect(toolResult.content).toMatch(/já passou/i);
  });
});
