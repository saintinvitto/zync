Auth.requireAuth();

if (!Auth.isAdmin()) {
  window.location.href = 'dashboard.html';
}

function formatBRL(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* ---------- MÉTRICAS ---------- */
async function carregarMetricas() {
  try {
    const dados = await Api.admin.metricas();
    document.getElementById('adm-total-usuarios').textContent = dados.totalUsuarios;
    document.getElementById('adm-mrr').textContent = formatBRL(dados.mrr);
    document.getElementById('adm-ativas').textContent = dados.assinaturasPorStatus.ativa || 0;
    const pendentesCanceladas = (dados.assinaturasPorStatus.pendente || 0) + (dados.assinaturasPorStatus.cancelada || 0);
    document.getElementById('adm-pendentes').textContent = pendentesCanceladas;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('refresh-admin').addEventListener('click', carregarMetricas);

carregarMetricas();
