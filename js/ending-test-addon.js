// ============================================================
// RIFT CRAWLER – Ending Test Addon
// ============================================================
// Isolated finale prototype. Press O to preview the ending screen.
// Enter / Escape returns to the title screen.

import { stopMusic } from './audio.js';

(function () {
  const TEST_KEY = 'KeyO';
  const ENDING_SCREEN = 'ending-test';
  const BG_URL = 'assets/backgrounds/ending.png';
  const MUSIC_URL = 'assets/audio/ending.mp3';
  const SCROLL_SPEED = 24; // px per second
  const LINE_HEIGHT = 28;

  const ENDING_STORY = [
    'TIEF UNTER DEN ZERBROCHENEN HALLEN',
    'verstummte der letzte Waechter des Rifts.',
    '',
    'Was einst als Riss im Stein begann,',
    'wuchs zu einem Hunger zwischen den Welten.',
    '',
    'Etage um Etage frass sich die Dunkelheit',
    'durch Krypten, Abgruende und vergessene Tore.',
    '',
    'Doch einer stieg hinab,',
    'nicht weil er unsterblich war,',
    'sondern weil niemand sonst zurueckkehrte.',
    '',
    'Klingen zerbrachen.',
    'Bomben vergluehten.',
    'Das Echo der Monster wurde leiser.',
    '',
    'Im Nexus blieb nur der Puls des Rifts,',
    'ein kaltes Licht, das Namen vergessen macht.',
    '',
    'Dann fiel der letzte Schlag.',
    'Der Raum atmete aus.',
    'Und die Welten fanden ihre Grenzen wieder.',
    '',
    'Der Crawler trat aus dem Licht,',
    'gezeichnet von Staub, Gold und alten Narben.',
    '',
    'Ob der Rift fuer immer geschlossen bleibt,',
    'weiss niemand.',
    '',
    'Aber heute schweigt die Tiefe.',
    'Heute gehoert die Nacht dir.',
    '',
    'RIFT CRAWLER',
    'THE END'
  ];

  const FINAL_CREDITS = [
    'THANKS FOR PLAYING',
    '',
    'GAME DESIGN & IDEA',
    'INGO RUDDAT',
    'THE FOX'
  ];

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  const endingBg = new Image();
  endingBg.src = BG_URL;

  let active = false;
  let endingTime = 0;
  let endingStartedAt = 0;
  let lastFrameTime = 0;
  let endingMusic = null;
  let fallbackAudioCtx = null;
  let fallbackNodes = [];
  let sparks = [];
  let embers = [];
  let sparkSpawnAcc = 0;
  let emberSpawnAcc = 0;

  function getState() {
    return window.__state || null;
  }

  function enterEndingTest() {
    const state = getState();

    active = true;
    endingStartedAt = performance.now();
    lastFrameTime = endingStartedAt;
    endingTime = 0;
    resetEndingParticles();

    try { stopMusic(); } catch (e) { /* game audio not ready */ }

    if (state) {
      state.screen = ENDING_SCREEN;
      state.running = false;
      state.paused = false;
      state.floorTransition = false;
      state.screenFlash = 0;
    }

    window.__audio?.playSfx?.('clear');
    startEndingMusic();
    drawEndingScreen(0);
  }

  function leaveEndingTest() {
    if (!active) return;

    active = false;
    stopEndingMusic();
    resetEndingParticles();

    const state = getState();
    if (state) {
      state.screen = 'title';
      state.running = false;
      state.paused = false;
    }
  }

  function startEndingMusic() {
    stopEndingMusic();

    endingMusic = new Audio(MUSIC_URL);
    endingMusic.loop = true;
    endingMusic.volume = 0.42;

    const playPromise = endingMusic.play();
    if (playPromise) {
      playPromise.catch(() => startFallbackDrone());
    }
  }

  function stopEndingMusic() {
    if (endingMusic) {
      endingMusic.pause();
      endingMusic.currentTime = 0;
      endingMusic = null;
    }

    for (const node of fallbackNodes) {
      try { node.stop(); } catch (e) { /* already stopped */ }
    }
    fallbackNodes = [];
  }

  function startFallbackDrone() {
    fallbackAudioCtx = fallbackAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (fallbackAudioCtx.state === 'suspended') fallbackAudioCtx.resume();

    const master = fallbackAudioCtx.createGain();
    master.gain.value = 0.045;
    master.connect(fallbackAudioCtx.destination);

    const base = 38;
    [1, 1.5, 2, 2.75].forEach((mul, i) => {
      const osc = fallbackAudioCtx.createOscillator();
      const lfo = fallbackAudioCtx.createOscillator();
      const lfoGain = fallbackAudioCtx.createGain();
      const gain = fallbackAudioCtx.createGain();

      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = base * mul;
      lfo.frequency.value = 0.04 + i * 0.025;
      lfoGain.gain.value = 2 + i;
      gain.gain.value = 0.7 / (i + 1);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(master);

      lfo.start();
      osc.start();
      fallbackNodes.push(lfo, osc);
    });
  }

  window.__showEndingTest = enterEndingTest;
  window.__hideEndingTest = leaveEndingTest;

  window.addEventListener('keydown', event => {
    if (event.code === TEST_KEY) {
      event.preventDefault();
      event.stopPropagation();
      enterEndingTest();
      return;
    }

    if (active && (event.code === 'Enter' || event.code === 'Escape')) {
      event.preventDefault();
      event.stopPropagation();
      leaveEndingTest();
    }
  }, true);

  function renderLoop(now) {
    requestAnimationFrame(renderLoop);
    if (!active) return;

    const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;
    endingTime = (now - endingStartedAt) / 1000;
    updateEndingParticles(dt);
    drawEndingScreen(dt);
  }

  function drawEndingScreen() {
    const w = canvas.width;
    const h = canvas.height;
    const t = endingTime;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    if (endingBg.complete && endingBg.naturalWidth > 0) {
      drawCoverImage(endingBg, 0, 0, w, h);
    } else {
      drawProceduralNexus(w, h, t);
    }

    const pulse = 0.12 + Math.sin(t * 1.2) * 0.035;
    ctx.fillStyle = `rgba(0, 0, 0, ${pulse})`;
    ctx.fillRect(0, 0, w, h);

    drawRiftShimmers(w, h, t);
    drawEndingParticles(w, h, 'behind');
    drawHeader(w, h, t);
    drawStoryScroller(w, h, t);
    drawFinalCredits(w, h, t);
    drawEndingParticles(w, h, 'front');
    drawFooter(w, h, t);
    drawScanlines(w, h, t);

    ctx.restore();
  }

  function drawCoverImage(img, x, y, w, h) {
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (img.naturalWidth - sw) / 2;
    const sy = (img.naturalHeight - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function drawProceduralNexus(w, h, t) {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h));
    gradient.addColorStop(0, '#271035');
    gradient.addColorStop(0.4, '#080a1c');
    gradient.addColorStop(1, '#02030a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 110; i++) {
      const a = i * 0.39 + t * 0.08;
      const r = 40 + (i * 17) % 520;
      const x = w / 2 + Math.cos(a) * r;
      const y = h / 2 + Math.sin(a * 0.74) * r * 0.45;
      const alpha = 0.12 + ((i % 7) / 7) * 0.22;
      ctx.fillStyle = `rgba(60, 220, 255, ${alpha})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  function getScrollerMetrics(w, h) {
    const panelY = h * 0.24;
    const panelH = h * 0.46;
    const startY = panelY + panelH + 40;
    const totalHeight = ENDING_STORY.length * LINE_HEIGHT;
    const scrollY = startY - endingTime * SCROLL_SPEED;
    const endProgress = Math.min(1, Math.max(0, (panelY - (scrollY + totalHeight)) / 180));
    const nearEnd = Math.min(1, Math.max(0, (endingTime - Math.max(0, (totalHeight - panelH) / SCROLL_SPEED)) / 8));

    return { panelY, panelH, startY, totalHeight, scrollY, endProgress, nearEnd };
  }

  function resetEndingParticles() {
    sparks = [];
    embers = [];
    sparkSpawnAcc = 0;
    emberSpawnAcc = 0;
  }

  function updateEndingParticles(dt) {
    const w = canvas.width;
    const h = canvas.height;
    const metrics = getScrollerMetrics(w, h);
    const finaleBoost = Math.max(metrics.nearEnd, metrics.endProgress);

    emberSpawnAcc += dt * (10 + finaleBoost * 16);
    while (emberSpawnAcc >= 1) {
      emberSpawnAcc -= 1;
      spawnEmber(w, h, finaleBoost);
    }

    sparkSpawnAcc += dt * (2.5 + finaleBoost * 12);
    while (sparkSpawnAcc >= 1) {
      sparkSpawnAcc -= 1;
      spawnSpark(w, h, finaleBoost);
    }

    embers = embers.filter(p => updateParticle(p, dt, w, h));
    sparks = sparks.filter(p => updateParticle(p, dt, w, h));
  }

  function spawnEmber(w, h, boost) {
    const maxLife = 5 + Math.random() * 5;
    embers.push({
      layer: Math.random() < 0.65 ? 'behind' : 'front',
      x: Math.random() * w,
      y: -12 - Math.random() * 80,
      vx: -12 + Math.random() * 24,
      vy: 18 + Math.random() * 34 + boost * 22,
      drift: 0.6 + Math.random() * 1.8,
      size: 1 + Math.random() * 2.4,
      life: maxLife,
      maxLife,
      alpha: 0.12 + Math.random() * 0.32,
      hue: Math.random() < 0.55 ? 'cyan' : 'violet',
      spin: Math.random() * Math.PI * 2,
      kind: 'ember'
    });
  }

  function spawnSpark(w, h, boost) {
    const maxLife = 1.1 + Math.random() * 1.4;
    sparks.push({
      layer: Math.random() < 0.35 ? 'behind' : 'front',
      x: Math.random() * w,
      y: -20 - Math.random() * 140,
      vx: -55 + Math.random() * 110,
      vy: 120 + Math.random() * 160 + boost * 110,
      drift: 1 + Math.random() * 3,
      size: 1.4 + Math.random() * 3.2 + boost * 1.5,
      life: maxLife,
      maxLife,
      alpha: 0.45 + Math.random() * 0.5,
      hue: Math.random() < 0.68 ? 'gold' : 'magenta',
      spin: Math.random() * Math.PI * 2,
      kind: 'spark'
    });
  }

  function updateParticle(p, dt, w, h) {
    p.life -= dt;
    p.spin += dt * p.drift;
    p.x += (p.vx + Math.sin(p.spin) * 18) * dt;
    p.y += p.vy * dt;
    p.vy += (p.kind === 'spark' ? 80 : 10) * dt;

    return p.life > 0 && p.y < h + 90 && p.x > -120 && p.x < w + 120;
  }

  function drawEndingParticles(w, h, layer) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const p of embers) {
      if (p.layer !== layer) continue;
      const fade = Math.max(0, p.life / p.maxLife);
      const alpha = p.alpha * Math.min(1, fade * 1.4);
      const color = p.hue === 'cyan'
        ? `rgba(33,230,255,${alpha})`
        : `rgba(180,77,255,${alpha})`;

      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of sparks) {
      if (p.layer !== layer) continue;
      const fade = Math.max(0, p.life / p.maxLife);
      const alpha = p.alpha * Math.min(1, fade * 1.7);
      const color = p.hue === 'gold'
        ? `rgba(255,220,120,${alpha})`
        : `rgba(255,43,214,${alpha})`;
      const tail = 10 + p.size * 6;

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = Math.max(1, p.size * 0.7);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.035, p.y - tail);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawRiftShimmers(w, h, t) {
    const metrics = getScrollerMetrics(w, h);
    const boost = Math.max(metrics.nearEnd, metrics.endProgress);
    if (boost <= 0.02) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.textAlign = 'center';

    for (let i = 0; i < 4; i++) {
      const alpha = (0.05 + boost * 0.12) * (0.6 + Math.sin(t * 2.4 + i) * 0.4);
      const radiusX = 160 + i * 52 + Math.sin(t * 1.7 + i) * 12;
      const radiusY = 42 + i * 14;
      const cx = w / 2 + Math.sin(t * 0.7 + i) * 18;
      const cy = h * 0.47 + Math.cos(t * 0.6 + i) * 10;

      ctx.strokeStyle = `rgba(33,230,255,${Math.max(0, alpha)})`;
      ctx.shadowColor = '#21e6ff';
      ctx.shadowBlur = 24;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radiusX, radiusY, Math.sin(t * 0.2) * 0.08, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawHeader(w, h, t) {
    ctx.textAlign = 'center';

    const titleY = h * 0.12;
    ctx.font = 'bold 44px monospace';
    ctx.fillStyle = '#fff3a3';
    ctx.shadowColor = '#fff3a3';
    ctx.shadowBlur = 22;
    ctx.fillText('DER RIFT SCHLIESST SICH', w / 2, titleY);

    ctx.shadowBlur = 10;
    ctx.shadowColor = '#21e6ff';
    ctx.fillStyle = '#21e6ff';
    ctx.font = '17px monospace';
    ctx.fillText('Die letzte Kammer verstummt. Nur dein Echo bleibt.', w / 2, titleY + 34);

    ctx.shadowBlur = 0;
  }

  function drawStoryScroller(w, h, t) {
    const panelX = w / 2 - 390;
    const { panelY, panelH, scrollY, endProgress } = getScrollerMetrics(w, h);
    const panelW = 780;
    const storyAlpha = 1 - endProgress;

    if (storyAlpha <= 0.02) return;

    ctx.save();
    ctx.globalAlpha = storyAlpha;

    ctx.fillStyle = 'rgba(2, 6, 18, 0.42)';
    roundRect(panelX, panelY, panelW, panelH, 20, true, false);
    ctx.strokeStyle = 'rgba(33,230,255,0.28)';
    ctx.lineWidth = 1.2;
    roundRect(panelX, panelY, panelW, panelH, 20, false, true);

    ctx.beginPath();
    ctx.rect(panelX + 24, panelY + 18, panelW - 48, panelH - 36);
    ctx.clip();

    ctx.textAlign = 'center';
    ctx.font = '18px monospace';

    ENDING_STORY.forEach((line, index) => {
      const y = scrollY + index * LINE_HEIGHT;
      if (y < panelY - 20 || y > panelY + panelH + 30) return;

      const edgeFadeTop = Math.min(1, Math.max(0, (y - panelY) / 52));
      const edgeFadeBottom = Math.min(1, Math.max(0, (panelY + panelH - y) / 52));
      const alpha = Math.min(edgeFadeTop, edgeFadeBottom, 0.95);

      if (line === 'RIFT CRAWLER' || line === 'THE END') {
        ctx.font = line === 'THE END' ? 'bold 30px monospace' : 'bold 24px monospace';
        ctx.fillStyle = line === 'THE END'
          ? `rgba(255, 243, 163, ${alpha})`
          : `rgba(33, 230, 255, ${alpha})`;
        ctx.shadowColor = line === 'THE END' ? '#fff3a3' : '#21e6ff';
        ctx.shadowBlur = 14;
      } else if (line === line.toUpperCase() && line.length > 0) {
        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = `rgba(255, 43, 214, ${alpha})`;
        ctx.shadowColor = '#ff2bd6';
        ctx.shadowBlur = 8;
      } else {
        ctx.font = '18px monospace';
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.86})`;
        ctx.shadowBlur = 0;
      }

      if (line.length > 0) ctx.fillText(line, w / 2, y);
    });

    ctx.restore();
  }

  function drawFinalCredits(w, h, t) {
    const { panelY, panelH, endProgress } = getScrollerMetrics(w, h);
    if (endProgress <= 0.02) return;

    const alpha = smoothstep(0, 1, endProgress);
    const panelX = w / 2 - 390;
    const panelW = 780;
    const centerY = panelY + panelH * 0.5;
    const breathe = Math.sin(t * 1.8) * 4;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = 'rgba(2, 6, 18, 0.58)';
    roundRect(panelX, panelY, panelW, panelH, 24, true, false);
    ctx.strokeStyle = `rgba(255, 243, 163, ${0.28 + alpha * 0.22})`;
    ctx.lineWidth = 1.6;
    roundRect(panelX, panelY, panelW, panelH, 24, false, true);

    ctx.textAlign = 'center';

    ctx.font = 'bold 46px monospace';
    ctx.fillStyle = '#fff3a3';
    ctx.shadowColor = '#fff3a3';
    ctx.shadowBlur = 26;
    ctx.fillText(FINAL_CREDITS[0], w / 2, centerY - 74 + breathe);

    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.70)';
    ctx.shadowBlur = 0;
    ctx.fillText(FINAL_CREDITS[2], w / 2, centerY - 12);

    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#21e6ff';
    ctx.shadowColor = '#21e6ff';
    ctx.shadowBlur = 18;
    ctx.fillText(FINAL_CREDITS[3], w / 2, centerY + 30);

    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#ff2bd6';
    ctx.shadowColor = '#ff2bd6';
    ctx.shadowBlur = 18;
    ctx.fillText(FINAL_CREDITS[4], w / 2, centerY + 68);

    ctx.restore();
  }

  function smoothstep(edge0, edge1, value) {
    const x = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
    return x * x * (3 - 2 * x);
  }

  function drawFooter(w, h, t) {
    const panelY = h * 0.84;
    ctx.textAlign = 'center';
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(2, 6, 18, 0.62)';
    roundRect(w / 2 - 300, panelY - 54, 600, 104, 18, true, false);
    ctx.strokeStyle = 'rgba(33,230,255,0.45)';
    ctx.lineWidth = 1.5;
    roundRect(w / 2 - 300, panelY - 54, 600, 104, 18, false, true);

    ctx.fillStyle = 'rgba(255,255,255,0.84)';
    ctx.font = '16px monospace';
    ctx.fillText('FINAL STORY SCROLLER  //  TESTTASTE: O', w / 2, panelY - 18);
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.fillText('ENTER / ESC – Zurueck zum Titel', w / 2, panelY + 12);

    const blink = Math.sin(t * 3) > 0;
    if (blink) {
      ctx.fillStyle = '#ff2bd6';
      ctx.shadowColor = '#ff2bd6';
      ctx.shadowBlur = 10;
      ctx.fillText('ENDING TRACK AKTIV', w / 2, panelY + 38);
      ctx.shadowBlur = 0;
    }
  }

  function drawScanlines(w, h, t) {
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#000';
    const offset = Math.floor((t * 18) % 4);
    for (let y = offset; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1);
    }
    ctx.globalAlpha = 1;
  }

  function roundRect(x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  requestAnimationFrame(renderLoop);
})();
