Auth.requireAuth();

if (!Auth.isAdmin()) {
  window.location.href = 'dashboard.html';
}

let planosCache = [];

function formatBRL(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function carregarPlanos() {
  const lista = document.getElementById('admin-planos-list');
  try {
    planosCache = await Api.admin.planos.listar();

    lista.innerHTML = planosCache.map((p) => {
      const sufixo = p.intervalo_dias === 30 ? '/mês' : `/${p.intervalo_dias} dias`;
      return `
        <div class="agenda-row anim-entrada" data-id="${p.id}">
          <div class="agenda-info">
            <div class="agenda-lead">${escapeHtml(p.nome)}</div>
            <div class="agenda-servico">${formatBRL(p.preco)}${sufixo}</div>
          </div>
          <div class="agenda-actions">
            <span class="badge ${p.ativo ? 'badge-ativa' : 'badge-expirada'}">${p.ativo ? 'Ativo' : 'Inativo'}</span>
            <button class="btn btn-secondary btn-sm" data-action="editar-plano" data-id="${p.id}">Editar</button>
          </div>
        </div>
      `;
    }).join('');

    lista.querySelectorAll('[data-action="editar-plano"]').forEach((btn) => {
      btn.addEventListener('click', () => abrirPlanoModal(Number(btn.dataset.id)));
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

const planoModal = document.getElementById('plano-modal');

function abrirPlanoModal(planoId) {
  const plano = planoId ? planosCache.find((p) => p.id === planoId) : null;

  document.getElementById('plano-modal-title').textContent = plano ? 'Editar plano' : 'Novo plano';
  document.getElementById('pl-id').value = plano ? plano.id : '';
  document.getElementById('pl-nome').value = plano ? plano.nome : '';
  document.getElementById('pl-preco').value = plano ? plano.preco : '';
  document.getElementById('pl-intervalo').value = plano ? plano.intervalo_dias : 30;
  document.getElementById('pl-ativo').value = plano ? String(plano.ativo) : '1';
  document.getElementById('pl-ativo-field').style.display = plano ? 'block' : 'none';

  planoModal.classList.add('visible');
}

function fecharPlanoModal() {
  planoModal.classList.remove('visible');
  document.getElementById('plano-form').reset();
}

document.getElementById('open-new-plano').addEventListener('click', () => abrirPlanoModal(null));
planoModal.querySelectorAll('[data-close-modal]').forEach((el) => el.addEventListener('click', fecharPlanoModal));
planoModal.addEventListener('click', (e) => { if (e.target === planoModal) fecharPlanoModal(); });

document.getElementById('plano-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('pl-id').value;
  const dados = {
    nome: document.getElementById('pl-nome').value.trim(),
    preco: Number(document.getElementById('pl-preco').value),
    intervaloDias: Number(document.getElementById('pl-intervalo').value),
  };
  if (id) dados.ativo = document.getElementById('pl-ativo').value === '1';

  const btn = document.getElementById('plano-submit');
  const label = document.getElementById('plano-submit-label');
  btn.disabled = true;
  label.innerHTML = '<span class="spinner"></span>';

  try {
    if (id) {
      await Api.admin.planos.atualizar(id, dados);
    } else {
      await Api.admin.planos.criar(dados);
    }
    showToast('Plano salvo', 'success');
    fecharPlanoModal();
    carregarPlanos();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    label.textContent = 'Salvar';
  }
});

carregarPlanos();
