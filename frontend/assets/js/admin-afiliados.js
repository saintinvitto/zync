Auth.requireAuth();

if (!Auth.isAdmin()) {
  window.location.href = 'dashboard.html';
}

let afiliadosCache = [];

function formatBRL(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

async function carregarAfiliados() {
  const lista = document.getElementById('admin-afiliados-list');
  try {
    afiliadosCache = await Api.admin.afiliados.listar();

    if (afiliadosCache.length === 0) {
      lista.innerHTML = '<div class="empty-state"><p>Nenhum afiliado cadastrado ainda.</p></div>';
      return;
    }

    lista.innerHTML = afiliadosCache.map((a) => `
      <div class="agenda-row anim-entrada" data-id="${a.id}">
        <div class="agenda-info">
          <div class="agenda-lead">${escapeHtml(a.usuario_nome)} <span class="k-tag">${escapeHtml(a.codigo)}</span></div>
          <div class="agenda-servico">
            ${a.percentual_comissao}% · ${a.total_indicados} indicado(s) ·
            pendente ${formatBRL(a.comissao_pendente)} · pago ${formatBRL(a.comissao_paga)}
          </div>
        </div>
        <div class="agenda-actions">
          <span class="badge ${a.ativo ? 'badge-ativa' : 'badge-expirada'}">${a.ativo ? 'Ativo' : 'Inativo'}</span>
          <button class="btn btn-secondary btn-sm" data-action="comissoes" data-id="${a.id}">Comissões</button>
          <button class="btn btn-ghost btn-sm" data-action="toggle-ativo" data-id="${a.id}" data-ativo="${a.ativo}">
            ${a.ativo ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </div>
    `).join('');

    lista.querySelectorAll('[data-action="comissoes"]').forEach((btn) => {
      btn.addEventListener('click', () => abrirComissoesModal(Number(btn.dataset.id)));
    });

    lista.querySelectorAll('[data-action="toggle-ativo"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await Api.admin.afiliados.atualizar(btn.dataset.id, { ativo: btn.dataset.ativo !== 'true' });
          carregarAfiliados();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ---------- NOVO AFILIADO ---------- */
const afiliadoModal = document.getElementById('afiliado-modal');

function abrirAfiliadoModal() {
  document.getElementById('afiliado-form').reset();
  document.getElementById('af-percentual').value = 20;
  afiliadoModal.classList.add('visible');
}

function fecharAfiliadoModal() {
  afiliadoModal.classList.remove('visible');
}

document.getElementById('open-new-afiliado').addEventListener('click', abrirAfiliadoModal);
afiliadoModal.querySelectorAll('[data-close-modal]').forEach((el) => el.addEventListener('click', fecharAfiliadoModal));
afiliadoModal.addEventListener('click', (e) => { if (e.target === afiliadoModal) fecharAfiliadoModal(); });

document.getElementById('afiliado-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const dados = {
    email: document.getElementById('af-email').value.trim(),
    percentualComissao: Number(document.getElementById('af-percentual').value),
  };

  const btn = document.getElementById('afiliado-submit');
  const label = document.getElementById('afiliado-submit-label');
  btn.disabled = true;
  label.innerHTML = '<span class="spinner"></span>';

  try {
    await Api.admin.afiliados.criar(dados);
    showToast('Afiliado criado', 'success');
    fecharAfiliadoModal();
    carregarAfiliados();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    label.textContent = 'Criar afiliado';
  }
});

/* ---------- COMISSOES ---------- */
const comissoesModal = document.getElementById('comissoes-modal');

async function abrirComissoesModal(afiliadoId) {
  const afiliado = afiliadosCache.find((a) => a.id === afiliadoId);
  document.getElementById('comissoes-modal-title').textContent = `Comissões — ${afiliado ? afiliado.usuario_nome : ''}`;

  const lista = document.getElementById('comissoes-list');
  lista.innerHTML = '<div class="empty-state"><span class="spinner"></span></div>';
  comissoesModal.classList.add('visible');

  try {
    const comissoes = await Api.admin.afiliados.comissoes(afiliadoId);

    if (comissoes.length === 0) {
      lista.innerHTML = '<div class="empty-state"><p>Nenhuma comissão ainda.</p></div>';
      return;
    }

    lista.innerHTML = comissoes.map((c) => `
      <div class="agenda-row anim-entrada" data-id="${c.id}">
        <div class="agenda-info">
          <div class="agenda-lead">${escapeHtml(c.usuario_indicado_nome)}</div>
          <div class="agenda-servico">${formatBRL(c.valor)} · ${new Date(c.criado_em).toLocaleDateString('pt-BR')}</div>
        </div>
        <div class="agenda-actions">
          <span class="badge ${c.status === 'paga' ? 'badge-ativa' : 'badge-expirada'}">${c.status === 'paga' ? 'Paga' : 'Pendente'}</span>
          ${c.status === 'pendente' ? `<button class="btn btn-secondary btn-sm" data-action="marcar-paga" data-id="${c.id}">Marcar paga</button>` : ''}
        </div>
      </div>
    `).join('');

    lista.querySelectorAll('[data-action="marcar-paga"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await Api.admin.afiliados.marcarComissaoPaga(btn.dataset.id);
          abrirComissoesModal(afiliadoId);
          carregarAfiliados();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

comissoesModal.querySelectorAll('[data-close-modal]').forEach((el) => el.addEventListener('click', () => comissoesModal.classList.remove('visible')));
comissoesModal.addEventListener('click', (e) => { if (e.target === comissoesModal) comissoesModal.classList.remove('visible'); });

carregarAfiliados();
