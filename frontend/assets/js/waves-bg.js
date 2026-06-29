(function initWaves() {
  const canvas = document.getElementById('wavesBg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const cfg = {
    lineColor: '#0008ff',
    waveSpeedX: 0.025,
    waveSpeedY: 0.03,
    waveAmpX: 80,
    waveAmpY: 0,
    friction: 0.5,
    tension: 0,
    maxCursorMove: 10,
    xGap: 4,
    yGap: 10,
  };

  // Ruido simplex 2D (algoritmo de dominio publico, Stefan Gustavson),
  // pra gerar um campo continuo: pontos vizinhos (em x e em y) puxam
  // valores parecidos, entao os fios verticais ondulam em grupo e se
  // cruzam como tecido, em vez de cada um tremer sozinho.
  function makeNoise2D(seed) {
    let s = seed >>> 0 || 1;
    function rand() {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s >>> 0) % 1000) / 1000;
    }
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    const perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const grad = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    function corner(gi, x, y) {
      let t = 0.5 - x * x - y * y;
      if (t < 0) return 0;
      t *= t;
      const g = grad[gi];
      return t * t * (g[0] * x + g[1] * y);
    }
    return function noise2D(xin, yin) {
      const s2 = (xin + yin) * F2;
      const i = Math.floor(xin + s2), j = Math.floor(yin + s2);
      const t2 = (i + j) * G2;
      const x0 = xin - (i - t2), y0 = yin - (j - t2);
      let i1, j1;
      if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
      const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      const ii = i & 255, jj = j & 255;
      const gi0 = perm[ii + perm[jj]] % 8;
      const gi1 = perm[ii + i1 + perm[jj + j1]] % 8;
      const gi2 = perm[ii + 1 + perm[jj + 1]] % 8;
      return 70 * (corner(gi0, x0, y0) + corner(gi1, x1, y1) + corner(gi2, x2, y2));
    };
  }
  const noise2D = makeNoise2D(7);
  const FREQ = 0.0035;

  // xGap/yGap originais (4/10) foram pensados pra uma caixa de demo
  // pequena. Numa tela cheia isso geraria dezenas de milhares de pontos
  // por frame. Aqui eles valem como espacamento minimo e a gente trava um
  // teto de fios/pontos por fio, escalando o espacamento real pro
  // tamanho da viewport.
  const MAX_STRANDS = 140;
  const MAX_POINTS_PER_STRAND = 80;

  // Sem escalar por devicePixelRatio: maior causa de lag em telas retina/4K.
  let w, h, strands = [];

  function buildGrid() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const xGap = Math.max(cfg.xGap, w / MAX_STRANDS);
    const yGap = Math.max(cfg.yGap, h / MAX_POINTS_PER_STRAND);

    strands = [];
    for (let x = 0; x <= w; x += xGap) {
      const points = [];
      for (let y = 0; y <= h + yGap; y += yGap) {
        points.push({ ox: x, oy: y, offX: 0, vx: 0 });
      }
      strands.push(points);
    }
  }
  buildGrid();
  window.addEventListener('resize', buildGrid, { passive: true });

  const mouse = { x: -9999, y: -9999, active: false };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  }, { passive: true });
  window.addEventListener('mouseleave', () => { mouse.active = false; });

  const cursorRadius = 140;
  const cursorRadius2 = cursorRadius * cursorRadius;
  // tension=0 no componente original significa "sem mola de retorno"; aqui
  // a gente garante um minimo pra nao deixar os pontos deslocados pra
  // sempre, mas o deslocamento total ja vem travado por maxCursorMove.
  const tensionUsed = Math.max(cfg.tension, 0.02);
  const t0 = performance.now();

  // ~40fps: rapido o suficiente pra nao parecer travado, mas ainda evita
  // redesenhar a cada frame de tela.
  const frameInterval = 1000 / 40;
  let lastDraw = 0;
  let rafId = null;

  function draw(now) {
    rafId = requestAnimationFrame(draw);
    if (now - lastDraw < frameInterval) return;
    lastDraw = now;

    const t = Math.max(0, now - t0) / 1000;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = cfg.lineColor;
    ctx.lineWidth = 1.1;
    ctx.globalAlpha = 0.55;

    const mouseOn = mouse.active;
    const tx = t * cfg.waveSpeedX * 3;
    const ty = t * cfg.waveSpeedY * 3;

    strands.forEach((points) => {
      const drawn = [];
      points.forEach((p) => {
        const n = noise2D(p.ox * FREQ + tx, p.oy * FREQ + ty);
        let px = p.ox + n * cfg.waveAmpX;
        const py = p.oy;

        if (mouseOn) {
          const dx = p.ox - mouse.x, dy = p.oy - mouse.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < cursorRadius2) {
            const dist = Math.sqrt(dist2) || 1;
            const force = 1 - dist / cursorRadius;
            p.vx += (dx / dist) * force * 2;
          }
        }
        p.vx += -p.offX * tensionUsed;
        p.vx *= cfg.friction;
        p.offX = Math.max(-cfg.maxCursorMove, Math.min(cfg.maxCursorMove, p.offX + p.vx));
        px += p.offX;

        drawn.push(px, py);
      });

      ctx.beginPath();
      ctx.moveTo(drawn[0], drawn[1]);
      let i = 2;
      for (; i < drawn.length - 2; i += 2) {
        const xc = (drawn[i] + drawn[i + 2]) / 2;
        const yc = (drawn[i + 1] + drawn[i + 3]) / 2;
        ctx.quadraticCurveTo(drawn[i], drawn[i + 1], xc, yc);
      }
      ctx.lineTo(drawn[drawn.length - 2], drawn[drawn.length - 1]);
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
  }

  rafId = requestAnimationFrame(draw);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId) {
      lastDraw = 0;
      rafId = requestAnimationFrame(draw);
    }
  });
})();
