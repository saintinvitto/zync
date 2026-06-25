Auth.requireAuth();

if (!Auth.isAdmin()) {
  window.location.href = 'dashboard.html';
}

const STATUS_ASSINATURA_LABELS = {
  pendente: 'Pendente',
  ativa: 'Ativa',
  cancelada: 'Cancelada',
  expirada: 'Expirada',
};

const usuarioAtual = Auth.getUsuario();

function formatData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

/* ---------- USUÁRIOS ---------- */
async function carregarUsuarios() {
  const lista = document.getElementById('admin-users-list');
  try {
    const usuarios = await Api.admin.usuarios();

    if (usuarios.length === 0) {
      lista.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${icon('building', 36)}</div><h3>Nenhuma empresa ainda</h3></div>`;
      return;
    }

    lista.innerHTML = usuarios.map((u) => `
      <div class="agenda-row anim-entrada" data-id="${u.id}">
        <div class="agenda-info">
          <div class="agenda-lead">${escapeHtml(u.nome)} ${u.is_admin ? '<span class="k-tag">admin</span>' : ''}</div>
          <div class="agenda-servico">${escapeHtml(u.email)} · cliente desde ${formatData(u.criado_em)}</div>
        </div>
        <div class="agenda-actions">
          ${u.plano_nome ? `<span class="agenda-servico">${escapeHtml(u.plano_nome)}</span>` : ''}
          ${u.assinatura_status ? `<span class="badge badge-${u.assinatura_status}">${STATUS_ASSINATURA_LABELS[u.assinatura_status] || u.assinatura_status}</span>` : '<span class="agenda-servico">Sem assinatura</span>'}
          <button class="btn btn-sm ${u.is_admin ? 'btn-danger' : 'btn-secondary'}" data-action="toggle-admin" data-id="${u.id}" data-atual="${u.is_admin ? 1 : 0}">
            ${u.is_admin ? 'Remover admin' : 'Tornar admin'}
          </button>
        </div>
      </div>
    `).join('');

    lista.querySelectorAll('[data-action="toggle-admin"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        const atual = btn.dataset.atual === '1';

        if (id === usuarioAtual.id && atual) {
          showToast('Você não pode remover seu próprio acesso de administrador', 'error');
          return;
        }

        try {
          await Api.admin.definirAdmin(id, !atual);
          showToast('Acesso atualizado', 'success');
          carregarUsuarios();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ---------- MENSAGENS DE SUPORTE ---------- */
async function carregarSuporte() {
  const lista = document.getElementById('admin-suporte-list');
  try {
    const itens = await Api.admin.suporte.listar();

    if (itens.length === 0) {
      lista.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${icon('messageCircle', 36)}</div><h3>Nenhuma mensagem ainda</h3></div>`;
      return;
    }

    lista.innerHTML = itens.map((m) => `
      <div class="agenda-row anim-entrada" data-id="${m.id}">
        <div class="agenda-info">
          <div class="agenda-lead">${escapeHtml(m.usuario_nome)} <span class="agenda-servico">(${escapeHtml(m.usuario_email)})</span></div>
          <div class="agenda-servico">${escapeHtml(m.mensagem)}</div>
          <div class="agenda-servico">
            ${formatDataHoraCurta(m.criado_em)}
            ${m.video_url ? ` · <a href="${escapeHtml(m.video_url)}" target="_blank" rel="noopener noreferrer" style="color:var(--azul-claro);">${icon('video', 12)} ver vídeo</a>` : ''}
          </div>
        </div>
        <div class="agenda-actions">
          <span class="badge ${m.respondida ? 'badge-ativa' : 'badge-pendente'}">${m.respondida ? 'Respondida' : 'Pendente'}</span>
          ${!m.respondida ? `<button class="btn btn-secondary btn-sm" data-action="marcar-respondida" data-id="${m.id}">Marcar como respondida</button>` : ''}
        </div>
      </div>
    `).join('');

    lista.querySelectorAll('[data-action="marcar-respondida"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await Api.admin.suporte.marcarRespondida(btn.dataset.id);
          carregarSuporte();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('refresh-admin').addEventListener('click', () => {
  carregarUsuarios();
  carregarSuporte();
});

carregarUsuarios();
carregarSuporte();
