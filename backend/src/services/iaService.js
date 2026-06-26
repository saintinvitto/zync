const Sentry = require('../config/sentry');
const validators = require('../utils/validators');
const agendamentoService = require('./agendamentoService');
const logger = require('../utils/logger');

const TOM_DE_VOZ = {
  formal: 'Mantenha um tom formal e cortês.',
  casual: 'Mantenha um tom casual e direto, como numa conversa informal.',
  amigavel: 'Mantenha um tom amigável e caloroso.',
};

const FERRAMENTA_AGENDAR = {
  name: 'agendar_horario',
  description: 'Agenda um horário/consulta pro cliente atual. Só use depois que o cliente confirmar explicitamente uma data e horário específicos — não use pra apenas perguntar disponibilidade.',
  input_schema: {
    type: 'object',
    properties: {
      data_hora: {
        type: 'string',
        description: 'Data e hora exatas do agendamento, em ISO 8601 (ex: "2026-07-01T14:00:00-03:00"). Calcule a partir da data de hoje informada no system prompt.',
      },
      servico: {
        type: 'string',
        description: 'Nome do serviço, motivo ou observação do agendamento, se o cliente mencionou.',
      },
    },
    required: ['data_hora'],
  },
};

function montarSystemPrompt(empresa = {}, { podeAgendar } = {}) {
  const nomeEmpresa = empresa.nome_empresa || empresa.nome;
  const tom = TOM_DE_VOZ[empresa.ia_tom_de_voz] || TOM_DE_VOZ.amigavel;
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
  });

  let prompt = `Você é o assistente de atendimento ao cliente${nomeEmpresa ? ` da empresa "${nomeEmpresa}"` : ' de uma empresa'}, que usa o Zync (CRM de atendimento via WhatsApp). Responda em português do Brasil, de forma profissional e objetiva (no máximo 2-3 frases). ${tom}\n\nHoje é ${hoje}.`;

  if (empresa.ia_o_que_vende) {
    prompt += `\n\nO que a empresa vende/oferece: ${empresa.ia_o_que_vende}`;
  }

  if (empresa.ia_horario_funcionamento) {
    prompt += `\n\nHorário de funcionamento: ${empresa.ia_horario_funcionamento}`;
  }

  if (podeAgendar) {
    prompt += '\n\nSe o cliente confirmar uma data e horário específicos pra um agendamento (ex: "pode ser segunda às 14h"), use a ferramenta agendar_horario pra marcar de verdade — não diga só que vai agendar, agende usando a ferramenta. Calcule a data exata a partir de hoje quando o cliente usar termos relativos ("amanhã", "semana que vem"). Se faltar dia ou horário, pergunte antes de usar a ferramenta.';
  }

  prompt += '\n\nSe o cliente perguntar algo que você não sabe (preço exato, disponibilidade de agenda fora do que foi informado, endereço, ou qualquer outro dado que não foi passado acima), diga que um atendente vai confirmar em breve e pergunte se pode ajudar com mais alguma coisa. Nunca invente informação.';

  return prompt;
}

function respostaMock(mensagem) {
  const texto = mensagem.toLowerCase();

  if (texto.includes('preço') || texto.includes('preco') || texto.includes('valor')) {
    return 'Nossos valores variam de acordo com o serviço. Posso te passar os detalhes ou agendar uma consulta para avaliação?';
  }

  if (texto.includes('horário') || texto.includes('horario') || texto.includes('agenda')) {
    return 'Atendemos de segunda a sábado, das 8h às 18h. Quer que eu agende um horário pra você?';
  }

  if (texto.includes('endereço') || texto.includes('endereco') || texto.includes('local')) {
    return 'Estamos localizados no centro da cidade. Posso te enviar a localização exata?';
  }

  return 'Obrigado pela mensagem! Em breve um de nossos atendentes vai te responder. Posso ajudar com mais alguma coisa?';
}

async function chamarAnthropic({ system, messages, tools }) {
  const resposta = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system,
      messages,
      ...(tools ? { tools } : {}),
    }),
  });

  if (!resposta.ok) {
    const erro = await resposta.text();
    throw new Error(`Falha ao chamar a IA (status ${resposta.status}): ${erro}`);
  }

  return resposta.json();
}

function extrairTexto(dados) {
  const bloco = (dados.content || []).find((b) => b.type === 'text');
  return bloco && bloco.text;
}

async function executarAgendarHorario(input, contexto) {
  const { data_hora, servico } = input || {};

  if (!validators.dataValida(data_hora)) {
    return 'Erro: data_hora ausente ou inválida. Pergunte ao cliente a data e o horário de novo, de forma mais específica (dia, mês e hora).';
  }

  if (new Date(data_hora).getTime() < Date.now()) {
    return 'Erro: essa data já passou. Confirme com o cliente a data correta (verifique se calculou certo a partir de hoje) antes de agendar.';
  }

  try {
    await agendamentoService.criarComEfeitos({
      usuarioId: contexto.usuarioId,
      leadId: contexto.leadId,
      servico: servico || null,
      data_hora,
      origem: 'ia',
    });
    return `Agendamento criado com sucesso para ${data_hora}.`;
  } catch (err) {
    logger.error('Erro ao criar agendamento via IA', err, { usuarioId: contexto.usuarioId, leadId: contexto.leadId });
    return 'Erro ao tentar criar o agendamento. Avise o cliente que um atendente vai confirmar o horário em breve.';
  }
}

async function gerarResposta(mensagem, empresa = {}, contexto = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return respostaMock(mensagem);
  }

  const podeAgendar = !!(contexto.usuarioId && contexto.leadId);
  const system = montarSystemPrompt(empresa, { podeAgendar });
  const tools = podeAgendar ? [FERRAMENTA_AGENDAR] : undefined;
  const messages = [{ role: 'user', content: mensagem }];

  try {
    const primeira = await chamarAnthropic({ system, messages, tools });
    const usoDeFerramenta = (primeira.content || []).find((b) => b.type === 'tool_use');

    if (!usoDeFerramenta) {
      return extrairTexto(primeira) || respostaMock(mensagem);
    }

    const resultado = await executarAgendarHorario(usoDeFerramenta.input, contexto);

    messages.push({ role: 'assistant', content: primeira.content });
    messages.push({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: usoDeFerramenta.id, content: resultado }],
    });

    const segunda = await chamarAnthropic({ system, messages, tools });
    return extrairTexto(segunda) || respostaMock(mensagem);
  } catch (err) {
    logger.error('Erro ao gerar resposta de IA', err);
    Sentry.captureException(err);
    return respostaMock(mensagem);
  }
}

module.exports = { gerarResposta };
