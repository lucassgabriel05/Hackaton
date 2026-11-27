
'use strict';

/* ---------- desenho: onda, espectro, histórico ---------- */

// Controle independente da velocidade de cada gráfico
const ultimoDesenho = {
  wave: 0,
  spec: 0,
  hist: 0
};

const intervaloDesenho = 100; // milissegundos

function podeDesenhar(grafico) {
  const agora = performance.now();

  if (agora - ultimoDesenho[grafico] < intervaloDesenho) {
    return false;
  }

  ultimoDesenho[grafico] = agora;
  return true;
}

function drawIdle() {
  if (S.route !== 'monitor') return;

  [['cv-wave'], ['cv-spec'], ['cv-hist']].forEach(a => {
    const c = $('#' + a[0]);
    fit(c);

    const g = ctx2(c);
    if (!g) return;

    g.clearRect(0, 0, c.width, c.height);

    g.strokeStyle = 'rgba(120,160,255,.18)';
    g.lineWidth = 1;

    g.beginPath();
    g.moveTo(0, c.height / 2);
    g.lineTo(c.width, c.height / 2);
    g.stroke();
  });
}

function drawWave(pk) {
  if (!podeDesenhar('wave')) return;

  const c = $('#cv-wave');
  const dpr = fit(c);
  const g = ctx2(c);

  if (!g) return;

  const w = c.width;
  const h = c.height;

  g.clearRect(0, 0, w, h);

  g.strokeStyle = 'rgba(120,160,255,.12)';
  g.lineWidth = 1;

  for (let i = 1; i < 4; i++) {
    const y = h * i / 4;

    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }

  g.strokeStyle = 'rgba(120,160,255,.3)';
  g.beginPath();
  g.moveTo(0, h / 2);
  g.lineTo(w, h / 2);
  g.stroke();

  E.scale = Math.max(pk * 1.15, E.scale * 0.992, 0.004);

  const buf = E.t;
  const N = 1536;
  let st = 0;

  for (let i = 1; i < 2048; i++) {
    if (buf[i - 1] < 0 && buf[i] >= 0) {
      st = i;
      break;
    }
  }

  g.beginPath();

  for (let x = 0; x < w; x += 2) {
    const v = buf[st + Math.floor(x / w * N)] || 0;
    const y = h / 2 - (v / E.scale) * h * 0.44;

    if (x === 0) {
      g.moveTo(x, y);
    } else {
      g.lineTo(x, y);
    }
  }

  g.lineWidth = 2 * dpr;
  g.strokeStyle = COL.cyan;
  g.shadowColor = COL.cyan;
  g.shadowBlur = 8 * dpr;
  g.lineJoin = 'round';
  g.stroke();
  g.shadowBlur = 0;

  g.fillStyle = COL.muted;
  g.font = (10 * dpr) + 'px ' + COL.mono;
  g.textBaseline = 'top';
  g.fillText('+p', 6 * dpr, 4 * dpr);

  g.textBaseline = 'bottom';
  g.fillText('−p', 6 * dpr, h - 4 * dpr);
}

function drawSpec() {
  if (!podeDesenhar('spec')) return;

  const c = $('#cv-spec');
  const dpr = fit(c);
  const g = ctx2(c);

  if (!g || !E.ctx) return;

  const w = c.width;
  const h = c.height;

  g.clearRect(0, 0, w, h);

  const pl = 36 * dpr;
  const pb = 20 * dpr;
  const pt = 8 * dpr;
  const pw = w - pl - 4 * dpr;
  const ph = h - pb - pt;

  const sr = E.ctx.sampleRate;
  const hz = sr / E.an.fftSize;
  const fmin = 20;
  const fmax = Math.min(20000, sr / 2 * 0.98);

  const lg = Math.log(fmax / fmin);

  const xOf = f =>
    pl + pw * Math.log(f / fmin) / lg;

  const dbMin = -100;
  const dbMax = -20;

  const yOf = v =>
    pt + ph * (1 - clamp((v - dbMin) / (dbMax - dbMin), 0, 1));

  g.font = (10 * dpr) + 'px ' + COL.mono;
  g.fillStyle = COL.muted;

  // Faixa da voz humana
  g.fillStyle = 'rgba(34,211,238,.06)';
  g.fillRect(
    xOf(300),
    pt,
    xOf(3400) - xOf(300),
    ph
  );

  g.fillStyle = COL.muted;
  g.textBaseline = 'top';
  g.textAlign = 'center';

  g.fillText(
    'voz',
    (xOf(300) + xOf(3400)) / 2,
    pt + 3 * dpr
  );

  // Linhas de dB
  g.textAlign = 'right';
  g.textBaseline = 'middle';

  [-90, -60, -30].forEach(v => {
    const y = yOf(v);

    g.strokeStyle = 'rgba(120,160,255,.12)';
    g.lineWidth = 1;

    g.beginPath();
    g.moveTo(pl, y);
    g.lineTo(w, y);
    g.stroke();

    g.fillStyle = COL.muted;
    g.fillText(String(v), pl - 5 * dpr, y);
  });

  // Barras do espectro
  const B = 64;

  let best = -Infinity;
  let bx = 0;
  let by = 0;

  const grad = g.createLinearGradient(0, pt, 0, pt + ph);

  grad.addColorStop(0, COL.cyan);
  grad.addColorStop(1, COL.blue);

  for (let b = 0; b < B; b++) {
    const f0 = fmin * Math.pow(fmax / fmin, b / B);
    const f1 = fmin * Math.pow(fmax / fmin, (b + 1) / B);

    const i0 = Math.min(
      E.f.length - 1,
      Math.floor(f0 / hz)
    );

    const i1 = Math.max(
      i0,
      Math.min(E.f.length - 1, Math.floor(f1 / hz))
    );

    let m = -Infinity;

    for (let i = i0; i <= i1; i++) {
      if (E.f[i] > m) m = E.f[i];
    }

    if (!isFinite(m)) m = -120;

    E.pk[b] = Math.max(m, E.pk[b] - 0.5);

    const x0 = xOf(f0) + 1;
    const x1 = xOf(f1) - 1;
    const y = yOf(m);

    g.fillStyle = grad;
    g.globalAlpha = 0.9;

    g.fillRect(
      x0,
      y,
      Math.max(1, x1 - x0),
      pt + ph - y
    );

    g.globalAlpha = 1;

    g.fillStyle = 'rgba(233,241,255,.7)';

    g.fillRect(
      x0,
      yOf(E.pk[b]),
      Math.max(1, x1 - x0),
      Math.max(1, 1.5 * dpr)
    );

    if (m > best) {
      best = m;
      bx = (x0 + x1) / 2;
      by = y;
    }
  }

  // Frequência dominante
  if (S.freq && best > -95) {
    g.fillStyle = COL.fg;
    g.textAlign = 'center';
    g.textBaseline = 'bottom';

    g.fillText(
      n0(S.freq) + ' Hz',
      clamp(bx, pl + 24 * dpr, w - 24 * dpr),
      Math.max(pt + 12 * dpr, by - 3 * dpr)
    );
  }

  // Eixo de frequência
  g.textBaseline = 'top';
  g.textAlign = 'center';
  g.fillStyle = COL.muted;

  [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
    .forEach(f => {
      if (f > fmax) return;

      const x = xOf(f);

      g.strokeStyle = 'rgba(120,160,255,.25)';

      g.beginPath();
      g.moveTo(x, pt + ph);
      g.lineTo(x, pt + ph + 3 * dpr);
      g.stroke();

      g.fillText(
        f >= 1000 ? (f / 1000) + 'k' : String(f),
        x,
        pt + ph + 5 * dpr
      );
    });

  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.fillText('dBFS', 2 * dpr, pt);
}

function drawHist() {
  if (!podeDesenhar('hist')) return;

  const c = $('#cv-hist');
  const dpr = fit(c);
  const g = ctx2(c);

  if (!g) return;

  const w = c.width;
  const h = c.height;

  g.clearRect(0, 0, w, h);

  const lo = 20;
  const hi = 110;

  const yOf = v =>
    h * (1 - (clamp(v, lo, hi) - lo) / (hi - lo));

  // Faixas de classificação
  g.fillStyle = 'rgba(34,197,94,.10)';
  g.fillRect(0, yOf(T.quiet), w, h - yOf(T.quiet));

  g.fillStyle = 'rgba(250,204,21,.09)';
  g.fillRect(
    0,
    yOf(T.crit),
    w,
    yOf(T.quiet) - yOf(T.crit)
  );

  g.fillStyle = 'rgba(239,68,68,.10)';
  g.fillRect(0, 0, w, yOf(T.crit));

  g.font = (10 * dpr) + 'px ' + COL.mono;
  g.fillStyle = COL.muted;
  g.textAlign = 'left';
  g.textBaseline = 'bottom';

  // Linhas de referência
  [[T.quiet, '55 dB'], [T.crit, '70 dB']].forEach(a => {
    const y = yOf(a[0]);

    g.strokeStyle = 'rgba(233,241,255,.25)';
    g.setLineDash([5 * dpr, 4 * dpr]);

    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();

    g.setLineDash([]);

    g.fillText(a[1], 4 * dpr, y - 2 * dpr);
  });

  const H = S.hist;

  if (!H.length) return;

  // Linha do histórico
  g.beginPath();

  H.forEach((v, i) => {
    const x = w * (i + 240 - H.length) / 239;
    const y = yOf(v);

    if (i === 0) {
      g.moveTo(x, y);
    } else {
      g.lineTo(x, y);
    }
  });

  g.lineWidth = 2 * dpr;
  g.strokeStyle = COL.cyan;
  g.lineJoin = 'round';
  g.stroke();

  // Indicador da última medição
  const lx = w * 239 / 239;
  const ly = yOf(H[H.length - 1]);

  g.fillStyle = COL[cls(H[H.length - 1])];

  g.beginPath();
  g.arc(lx - 3 * dpr, ly, 4 * dpr, 0, Math.PI * 2);
  g.fill();
}
