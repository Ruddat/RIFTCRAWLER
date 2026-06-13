// ============================================================
// RIFT CRAWLER – Ending Test Addon
// ============================================================
// Isolated finale prototype. Press O to preview the ending screen.
// Enter / Escape returns to the title screen.

import { stopMusic } from './audio.js';

(function () {
  const TEST_KEY = 'KeyO';
  const ENDING_SCREEN = 'ending-test';
  const BG_URL = 'assets/images/ending-rift-nexus.svg';
  const MUSIC_URL = 'assets/audio/ending.mp3';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  const endingBg = new Image();
  endingBg.src = BG_URL;

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
    if (!state) return;

    stopMusic();
    state.screen = ENDING_SCREEN;
    state.running = false;
    state.paused = false;
    state.floorTransition = false;
    state.screenFlash = 0;
    endingStartedAt = performance.now();
    endingTime = 0;

    window.__audio?.playSfx?.('clear');
    startEndingMusic();
  }

  function leaveEndingTest() {
    const state = getState();
    if (!state || state.screen !== ENDING_SCREEN) return;

    stopEndingMusic();
    state.screen = 'title';
    state.running = false;
    state.paused = false;
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

  window.addEventListener('keydown', event => {
    const state = getState();
    if (!state) return;

    if (event.code === TEST_KEY) {
      event.preventDefault();
      enterEndingTest();
      return;
    }

    if (state.screen === ENDING_SCREEN && (event.code === 'Enter' || event.code === 'Escape')) {
      event.preventDefault();
      leaveEndingTest();
    }
  });

  function renderLoop(now) {
    requestAnimationFrame(renderLoop);
    const state = getState();
    if (!state || state.screen !== ENDING_SCREEN) return;

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
      ctx.drawImage(endingBg, 0, 0, w, h);
    } else {
      drawProceduralNexus(w, h, t);
    }

    const pulse = 0.18 + Math.sin(t * 1.2) * 0.04;
    ctx.fillStyle = `rgba(0, 0, 0, ${pulse})`;
    ctx.fillRect(0, 0, w, h);

    drawRiftCore(w / 2, h / 2 - 38, 96 + Math.sin(t * 2.0) * 8, t);
    drawFinalText(w, h, t);
    drawScanlines(w, h, t);

    ctx.restore();
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

  function drawRiftCore(cx, cy, radius, t) {
    const colors = ['#21e6ff', '#b44dff', '#ff2bd6', '#fff3a3'];

    for (let ring = 0; ring < 5; ring++) {
      ctx.beginPath();
      const rr = radius + ring * 22 + Math.sin(t * 2 + ring) * 5;
      for (let i = 0; i <= 80; i++) {
        const a = (Math.PI * 2 * i) / 80;
        const wobble = Math.sin(a * 7 + t * (2.4 + ring * 0.2)) * 8;
        const x = cx + Math.cos(a) * (rr + wobble);
        const y = cy + Math.sin(a) * (rr * 0.62 + wobble * 0.35);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = colors[ring % colors.length];
      ctx.globalAlpha = 0.55 - ring * 0.07;
      ctx.lineWidth = ring === 0 ? 3 : 1.4;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 22;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    const core = ctx.createRadialGradient(cx, cy, 8, cx, cy, radius * 0.95);
    core.addColorStop(0, 'rgba(255,255,255,0.95)');
    core.addColorStop(0.18, 'rgba(33,230,255,0.65)');
    core.addColorStop(0.55, 'rgba(180,77,255,0.22)');
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.fillRect(cx - radius * 1.4, cy - radius, radius * 2.8, radius * 2);
  }

  function drawFinalText(w, h, t) {
    ctx.textAlign = 'center';

    const titleY = h * 0.22;
    ctx.font = 'bold 52px monospace';
    ctx.fillStyle = '#fff3a3';
    ctx.shadowColor = '#fff3a3';
    ctx.shadowBlur = 24;
    ctx.fillText('DER RIFT SCHLIESST SICH', w / 2, titleY);

    ctx.shadowBlur = 12;
    ctx.shadowColor = '#21e6ff';
    ctx.fillStyle = '#21e6ff';
    ctx.font = '18px monospace';
    ctx.fillText('Die letzte Kammer verstummt. Nur dein Echo bleibt.', w / 2, titleY + 42);

    const panelY = h * 0.68;
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(2, 6, 18, 0.68)';
    roundRect(w / 2 - 290, panelY - 72, 580, 132, 18, true, false);
    ctx.strokeStyle = 'rgba(33,230,255,0.45)';
    ctx.lineWidth = 1.5;
    roundRect(w / 2 - 290, panelY - 72, 580, 132, 18, false, true);

    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.font = '16px monospace';
    ctx.fillText('FINAL PROTOTYPE  //  TESTTASTE: O', w / 2, panelY - 28);
    ctx.fillStyle = 'rgba(255,255,255,0.58)';
    ctx.fillText('ENTER / ESC – Zurueck zum Titel', w / 2, panelY + 6);

    const blink = Math.sin(t * 3) > 0;
    if (blink) {
      ctx.fillStyle = '#ff2bd6';
      ctx.shadowColor = '#ff2bd6';
      ctx.shadowBlur = 10;
      ctx.fillText('MUSIK: assets/audio/ending.mp3', w / 2, panelY + 40);
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
