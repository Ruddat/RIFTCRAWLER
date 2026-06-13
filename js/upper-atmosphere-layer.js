// ============================================================
// RIFT CRAWLER – Upper Atmosphere Layer
// ============================================================
// Draws a controlled room-clipped atmosphere pass after the character and door
// overlays. This intentionally sits one visual layer higher than the integrated
// weather pass in main.js, but it never touches HUD/screen-space UI.

import { ROOM_OFFSET_X, ROOM_OFFSET_Y, ROOM_WIDTH, ROOM_HEIGHT } from './config.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas?.getContext('2d');

const motes = [];
const wisps = [];
const rain = [];

const MAX_MOTES = 44;
const MAX_WISPS = 5;
const MAX_RAIN = 42;

let lastTime = performance.now();
let initialized = false;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function init() {
  if (initialized) return;
  initialized = true;

  for (let i = 0; i < MAX_MOTES; i++) motes.push(createMote(true));
  for (let i = 0; i < MAX_WISPS; i++) wisps.push(createWisp(true));
  for (let i = 0; i < MAX_RAIN; i++) rain.push(createRain(true));
}

function createMote(randomizeY = false) {
  return {
    x: rand(12, ROOM_WIDTH - 12),
    y: randomizeY ? rand(20, ROOM_HEIGHT - 20) : ROOM_HEIGHT + rand(5, 60),
    r: rand(0.9, 2.1),
    vy: rand(7, 20),
    vx: rand(-8, 8),
    alpha: rand(0.08, 0.22),
    phase: rand(0, Math.PI * 2),
  };
}

function createWisp(randomizeX = false) {
  return {
    x: randomizeX ? rand(-160, ROOM_WIDTH + 160) : ROOM_WIDTH + rand(40, 180),
    y: rand(ROOM_HEIGHT * 0.22, ROOM_HEIGHT * 0.74),
    w: rand(180, 360),
    h: rand(55, 130),
    vx: rand(5, 13),
    alpha: rand(0.035, 0.070),
    phase: rand(0, Math.PI * 2),
  };
}

function createRain(randomizeY = false) {
  return {
    x: rand(-80, ROOM_WIDTH + 80),
    y: randomizeY ? rand(-80, ROOM_HEIGHT + 80) : rand(-140, -20),
    len: rand(9, 21),
    vy: rand(300, 520),
    vx: rand(-58, -22),
    alpha: rand(0.08, 0.20),
  };
}

function getState() {
  return window.__state;
}

function loop(now) {
  requestAnimationFrame(loop);

  const state = getState();
  if (!ctx || !state || state.screen !== 'playing' || state.floorTransition) {
    lastTime = now;
    return;
  }

  init();

  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  if (!state.paused) update(dt, state.time || now / 1000);
  draw(state.time || now / 1000, state);
}

function update(dt, time) {
  for (const mote of motes) {
    mote.x += (mote.vx + Math.sin(time * 0.8 + mote.phase) * 5) * dt;
    mote.y -= mote.vy * dt;
    if (mote.y < -16 || mote.x < -24 || mote.x > ROOM_WIDTH + 24) Object.assign(mote, createMote(false));
  }

  for (const wisp of wisps) {
    wisp.x -= wisp.vx * dt;
    wisp.y += Math.sin(time * 0.35 + wisp.phase) * 0.08;
    if (wisp.x + wisp.w < -180) Object.assign(wisp, createWisp(false));
  }

  for (const drop of rain) {
    drop.x += drop.vx * dt;
    drop.y += drop.vy * dt;
    if (drop.y > ROOM_HEIGHT + 40 || drop.x < -100) {
      Object.assign(drop, createRain(false));
      drop.x = rand(-30, ROOM_WIDTH + 110);
    }
  }
}

function draw(time, state) {
  ctx.save();
  ctx.translate(ROOM_OFFSET_X + state.camera.shakeX, ROOM_OFFSET_Y + state.camera.shakeY);
  ctx.beginPath();
  ctx.rect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
  ctx.clip();

  drawWisps(time);
  drawMotes(time);
  drawFineRain();

  ctx.restore();
}

function drawWisps(time) {
  for (const wisp of wisps) {
    const pulse = 0.72 + Math.sin(time * 0.7 + wisp.phase) * 0.18;
    const grad = ctx.createRadialGradient(
      wisp.x + wisp.w * 0.5,
      wisp.y,
      0,
      wisp.x + wisp.w * 0.5,
      wisp.y,
      wisp.w * 0.58
    );
    grad.addColorStop(0, `rgba(105, 205, 255, ${wisp.alpha * pulse})`);
    grad.addColorStop(0.55, `rgba(150, 90, 255, ${wisp.alpha * 0.42 * pulse})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.fillRect(wisp.x - wisp.w * 0.35, wisp.y - wisp.h * 0.55, wisp.w * 1.7, wisp.h * 1.1);
  }
}

function drawMotes(time) {
  ctx.save();
  ctx.fillStyle = '#8bdcff';
  ctx.shadowColor = '#55cfff';
  ctx.shadowBlur = 5;

  for (const mote of motes) {
    const pulse = 0.65 + Math.sin(time * 2.2 + mote.phase) * 0.35;
    ctx.globalAlpha = mote.alpha * pulse;
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawFineRain() {
  ctx.save();
  ctx.strokeStyle = 'rgba(155, 225, 255, 0.20)';
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';

  for (const drop of rain) {
    ctx.globalAlpha = drop.alpha;
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x + drop.vx * 0.045, drop.y + drop.len);
    ctx.stroke();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

requestAnimationFrame(loop);
