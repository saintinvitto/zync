Auth.requireAuth();

if (!Auth.isAdmin()) {
  window.location.href = 'dashboard.html';
}

function formatBRL(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderBarlist(container, entradas, formatarValor) {
  if (entradas.length === 0) {
    container.innerHTML = '<div class="integracao-empty">Sem dados suficientes ainda.</div>';
    return;
  }

  const max = Math.max(...entradas.map(([, total]) => total));
  container.innerHTML = entradas.map(([rotulo, total]) => `
    <div class="barlist-row">
      <div class="barlist-top"><span>${escapeHtml(rotulo)}</span><strong>${formatarValor(total)}</strong></div>
      <div class="barlist-track"><div class="barlist-fill" style="width:${max ? (total / max) * 100 : 0}%"></div></div>
    </div>
  `).join('');
}

function renderCadastrosPorMes(usuarios) {
  const contagem = {};
  usuarios.forEach((u) => {
    const chave = new Date(u.criado_em).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    contagem[chave] = (contagem[chave] || 0) + 1;
  });

  renderBarlist(document.getElementById('analise-cadastros'), Object.entries(contagem), (n) => n);
}

function renderReceitaPorPlano(usuarios, planos) {
  const precoPorPlano = {};
  planos.forEach((p) => { precoPorPlano[p.nome] = Number(p.preco); });

  const receita = {};
  usuarios.forEach((u) => {
    if (u.assinatura_status !== 'ativa' || !u.plano_nome) return;
    receita[u.plano_nome] = (receita[u.plano_nome] || 0) + (precoPorPlano[u.plano_nome] || 0);
  });

  renderBarlist(document.getElementById('analise-receita'), Object.entries(receita), formatBRL);
}

async function carregarAnalises() {
  try {
    const [usuarios, planos] = await Promise.all([Api.admin.usuarios(), Api.admin.planos.listar()]);
    renderCadastrosPorMes(usuarios);
    renderReceitaPorPlano(usuarios, planos);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

carregarAnalises();
