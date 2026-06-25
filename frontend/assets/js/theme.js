const Tema = {
  OPCOES: ['claro', 'escuro', 'sistema'],

  get() {
    return localStorage.getItem('tema') || 'sistema';
  },

  resolver(preferencia) {
    if (preferencia === 'sistema') {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'escuro';
    }
    return preferencia;
  },

  aplicar() {
    document.documentElement.dataset.theme = this.resolver(this.get());
  },

  set(preferencia) {
    localStorage.setItem('tema', preferencia);
    this.aplicar();
  },
};

Tema.aplicar();

window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  if (Tema.get() === 'sistema') Tema.aplicar();
});
