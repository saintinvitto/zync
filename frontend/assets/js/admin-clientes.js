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
let usuariosCache = [];

function formatData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function diasEntre(iso) {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)));
}

/* ---------- USUÁRIOS ---------- */
async function carregarUsuarios() {
  const lista = document.getElementById('admin-users-list');
  const incluirRemovidas = document.getElementById('mostrar-removidas').checked;

  try {
    usuariosCache = await Api.admin.usuarios(incluirRemovidas);

    if (usuariosCache.length === 0) {
      lista.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${icon('building', 36)}</div><h3>Nenhuma empresa ainda</h3></div>`;
      return;
    }

    lista.innerHTML = usuariosCache.map((u) => {
      const removida = !!u.removido_em;
      return `
      <div class="agenda-row anim-entrada" data-id="${u.id}" style="${removida ? 'opacity:0.55;' : ''}">
        <div class="agenda-info">
          <div class="agenda-lead">
            ${escapeHtml(u.nome)}
            ${u.is_admin ? '<span class="k-tag">admin</span>' : ''}
            ${removida ? '<span class="k-tag">removida</span>' : ''}
          </div>
          <div class="agenda-servico">
            ${escapeHtml(u.email)} · cliente desde ${formatData(u.criado_em)}
            ${removida ? ` · removida em ${formatData(u.removido_em)}` : ''}
          </div>
        </div>
        <div class="agenda-actions">
          ${u.plano_nome ? `<span class="agenda-servico">${escapeHtml(u.plano_nome)}</span>` : ''}
          ${u.assinatura_status ? `<span class="badge badge-${u.assinatura_status}">${STATUS_ASSINATURA_LABELS[u.assinatura_status] || u.assinatura_status}</span>` : '<span class="agenda-servico">Sem assinatura</span>'}
          <button type="button" class="btn btn-secondary btn-sm" data-action="detalhes" data-id="${u.id}">Detalhes</button>
          ${u.assinatura_status === 'ativa' ? `<button type="button" class="btn btn-secondary btn-sm" data-action="cancelar-assinatura" data-id="${u.id}">Cancelar assinatura</button>` : ''}
          <button class="btn btn-sm ${u.is_admin ? 'btn-danger' : 'btn-secondary'}" data-action="toggle-admin" data-id="${u.id}" data-atual="${u.is_admin ? 1 : 0}">
            ${u.is_admin ? 'Remover admin' : 'Tornar admin'}
          </button>
          ${removida
            ? `<button type="button" class="btn btn-secondary btn-sm" data-action="reativar" data-id="${u.id}">Reativar</button>`
            : `<button type="button" class="btn btn-danger btn-sm" data-action="remover" data-id="${u.id}">Remover</button>`}
        </div>
      </div>
    `;
    }).join('');

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

    lista.querySelectorAll('[data-action="detalhes"]').forEach((btn) => {
      btn.addEventListener('click', () => abrirDetalhes(Number(btn.dataset.id)));
    });

    lista.querySelectorAll('[data-action="cancelar-assinatura"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Cancelar a assinatura ativa dessa empresa?')) return;
        try {
          await Api.admin.cancelarAssinatura(btn.dataset.id);
          showToast('Assinatura cancelada', 'success');
          carregarUsuarios();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    lista.querySelectorAll('[data-action="remover"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        if (id === usuarioAtual.id) {
          showToast('Você não pode remover a própria conta por aqui', 'error');
          return;
        }
        if (!confirm('Remover essa empresa da lista? Os dados continuam salvos e isso pode ser desfeito marcando "Mostrar empresas removidas".')) return;

        try {
          await Api.admin.removerUsuario(id);
          showToast('Empresa removida', 'success');
          carregarUsuarios();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    lista.querySelectorAll('[data-action="reativar"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await Api.admin.reativarUsuario(btn.dataset.id);
          showToast('Empresa reativada', 'success');
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

/* ---------- DETALHES DA ASSINATURA ---------- */
const detalhesModal = document.getElementById('detalhes-modal');

function abrirDetalhes(id) {
  const u = usuariosCache.find((item) => item.id === id);
  if (!u) return;

  const dias = diasEntre(u.assinatura_criado_em);
  const conteudo = document.getElementById('detalhes-conteudo');

  if (!u.plano_nome) {
    conteudo.innerHTML = '<div class="integracao-empty">Essa empresa nunca teve uma assinatura.</div>';
  } else {
    conteudo.innerHTML = `
      <div><strong>Empresa:</strong> ${escapeHtml(u.nome)}</div>
      <div><strong>Plano:</strong> ${escapeHtml(u.plano_nome)}</div>
      <div><strong>Status:</strong> ${STATUS_ASSINATURA_LABELS[u.assinatura_status] || u.assinatura_status}</div>
      <div><strong>Assinante desde:</strong> ${formatData(u.assinatura_criado_em)} (${dias} ${dias === 1 ? 'dia' : 'dias'} atrás)</div>
      <div><strong>${u.assinatura_status === 'ativa' ? 'Expira em' : 'Expirou/expira em'}:</strong> ${u.assinatura_expira_em ? formatData(u.assinatura_expira_em) : '—'}</div>
    `;
  }

  detalhesModal.classList.add('visible');
}

detalhesModal.querySelectorAll('[data-close-modal]').forEach((el) => el.addEventListener('click', () => detalhesModal.classList.remove('visible')));
detalhesModal.addEventListener('click', (e) => { if (e.target === detalhesModal) detalhesModal.classList.remove('visible'); });

document.getElementById('mostrar-removidas').addEventListener('change', carregarUsuarios);

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
