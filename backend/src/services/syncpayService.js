const BASE_URL = process.env.SYNCPAY_BASE_URL;
const CLIENT_ID = process.env.SYNCPAY_CLIENT_ID;
const CLIENT_SECRET = process.env.SYNCPAY_CLIENT_SECRET;

let tokenCache = { token: null, expiraEm: 0 };

async function obterToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiraEm) {
    return tokenCache.token;
  }

  const resposta = await fetch(`${BASE_URL}/api/partner/v1/auth-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
  });

  if (!resposta.ok) {
    throw new Error(`Falha ao autenticar com SyncPay (status ${resposta.status})`);
  }

  const dados = await resposta.json();
  tokenCache = {
    token: dados.access_token,
    expiraEm: Date.now() + (dados.expires_in - 60) * 1000,
  };

  return tokenCache.token;
}

async function criarCobrancaPix({ valor, descricao, cliente, webhookUrl }) {
  const token = await obterToken();

  const resposta = await fetch(`${BASE_URL}/api/partner/v1/cash-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: valor,
      description: descricao,
      webhook_url: webhookUrl,
      client: cliente,
    }),
  });

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.message || `Falha ao criar cobrança Pix (status ${resposta.status})`);
  }

  const dados = await resposta.json();
  return { pixCode: dados.pix_code, identifier: dados.identifier };
}

async function consultarTransacao(identifier) {
  const token = await obterToken();

  const resposta = await fetch(`${BASE_URL}/api/partner/v1/transaction/${identifier}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resposta.ok) {
    throw new Error(`Falha ao consultar transação (status ${resposta.status})`);
  }

  const dados = await resposta.json();
  return dados.data;
}

module.exports = { obterToken, criarCobrancaPix, consultarTransacao };
