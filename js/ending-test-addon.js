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

  const ENDING_STORY = [
    'TIEF UNTER DEN ZERBROCHENEN HALLEN',
    'verstummte der letzte Waechter des Rifts.',
    '',
    'Was einst als Riss im Stein begann,',
    'wuchs zu einem Hunger zwischen den Welten.',
    '',
    'Etage um Etage fraß sich die Dunkelheit',
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

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  const endingBg = new Image();
  endingBg.src = BG_URL;

  let active = false;
  let endingTime = 0;
  let endingStartedAt = 0;
  let endingMusic = null;
  let fallbackAudioCtx = null;
  let fallbackNodes = [];

  function getState() {
    return window.__state || null;
  }

  function enterEndingTest() {
    const state = getState();

    active = true;
    endingStartedAt = performance.now();
    endingTime = 0;

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
    drawEndingScreen();
  }

  function leaveEndingTest() {
    if (!active) return;

    active = false;
    stopEndingMusic();

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

    endingTime = (now - endingStartedAt) / 1000;
    drawEndingScreen();
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

    drawHeader(w, h, t);
    drawStoryScroller(w, h, t);
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
    const panelY = h * 0.24;
    const panelW = 780;
    const panelH = h * 0.46;
    const lineHeight = 28;
    const startY = panelY + panelH + 40;
    const scrollY = startY - t * SCROLL_SPEED;

    ctx.save();

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
      const y = scrollY + index * lineHeight;
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
