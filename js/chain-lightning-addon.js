// ============================================================
// RIFT CRAWLER – Active Chain Lightning Addon
// ============================================================
// Makes the chain-lightning pickup an active R-key weapon while the timed buff
// is running. Draws persistent electric orbs around the player and visible arcs
// for each fired chain.

import { ROOM_OFFSET_X, ROOM_OFFSET_Y } from './config.js';
import { state } from './state.js';
import { dist } from './utils.js';
import { spawnParticles, spawnDamageNumber } from './effects.js';
import { shakeCamera } from './camera.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas?.getContext('2d');

const MAX_TARGET_RANGE = 430;
const CHAIN_RANGE = 190;
const MAX_CHAINS = 5;
const SHOT_COOLDOWN = 0.38;

let lastTime = performance.now();

window.addEventListener('keydown', (event) => {
  if (event.repeat || event.code !== 'KeyR') return;

  const p = state.player;
  if (!p?.chainLightning) return;
  if (state.screen !== 'playing' || state.paused || state.floorTransition) return;

  // If another explicit special weapon is equipped, let the existing weapon
  // system own R. Chain lightning fires when it is the active buff weapon.
  if (p.specialWeapon && p.specialWeapon !== 'chainLightning') return;

  event.preventDefault();
  fireActiveChainLightning();
});

function fireActiveChainLightning() {
  const p = state.player;
  if (!p.chainLightning || (p.chainShotCooldown || 0) > 0) return;

  const first = findNearestEnemy(p.x, p.y, state.enemies, MAX_TARGET_RANGE, new Set());
  if (!first) {
    drySpark(p);
    p.chainShotCooldown = SHOT_COOLDOWN * 0.7;
    return;
  }

  const hit = new Set();
  const arcs = [];
  let currentX = p.x;
  let currentY = p.y;
  let current = first;
  let damage = 4 + (p.weaponLevel || 1);

  for (let i = 0; i < MAX_CHAINS && current; i++) {
    hit.add(current);

    current.hp -= Math.max(1, Math.round(damage));
    current.hitFlash = 1;
    current.zapTimer = 0.42;
    current.zapSeed = Math.random() * 9999;

    const pushAngle = Math.atan2(current.y - currentY, current.x - currentX);
    current.knockbackX = Math.cos(pushAngle) * 55;
    current.knockbackY = Math.sin(pushAngle) * 55;
    current.knockbackTimer = Math.max(current.knockbackTimer || 0, 0.08);

    spawnDamageNumber(current.x, current.y - 12, Math.max(1, Math.round(damage)), '#66ffff');
    spawnParticles(current.x, current.y, '#66ffff', 10, 75, 0.35);

    arcs.push({
      x1: currentX,
      y1: currentY,
      x2: current.x,
      y2: current.y,
      life: 0.22,
      maxLife: 0.22,
      seed: Math.random() * 1000,
    });

    currentX = current.x;
    currentY = current.y;
    damage *= 0.68;

    current = findNearestEnemy(currentX, currentY, state.enemies, CHAIN_RANGE, hit);
  }

  p.lightningArcs = arcs;
  p.chainShotCooldown = SHOT_COOLDOWN;

  shakeCamera(7);
  state.screenFlash = 0.12;
  state.flashColor = '#66ffff';

  if (window.__audio?.playSfx) window.__audio.playSfx('lightning');
}

function drySpark(p) {
  const x = p.x + Math.cos(p.facing || 0) * 36;
  const y = p.y + Math.sin(p.facing || 0) * 36;
  spawnParticles(x, y, '#66ffff', 8, 50, 0.25);
}

function findNearestEnemy(x, y, enemies, range, ignored) {
  let best = null;
  let bestDist = range;

  for (const e of enemies) {
    if (!e || e.hp <= 0 || ignored.has(e)) continue;
    const d = dist(x, y, e.x, e.y);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }

  return best;
}

function updateAddon(dt) {
  const p = state.player;

  if (p) {
    if (p.chainShotCooldown > 0) p.chainShotCooldown = Math.max(0, p.chainShotCooldown - dt);

    if (p.lightningArcs?.length) {
      for (const arc of p.lightningArcs) arc.life -= dt;
      p.lightningArcs = p.lightningArcs.filter(arc => arc.life > 0);
    }
  }

  for (const e of state.enemies) {
    if (e.zapTimer > 0) e.zapTimer = Math.max(0, e.zapTimer - dt);
  }
}

function drawAddonOverlay() {
  const p = state.player;
  if (!ctx || !p || state.screen !== 'playing' || state.paused || state.floorTransition) return;

  ctx.save();
  ctx.translate(ROOM_OFFSET_X + state.camera.shakeX, ROOM_OFFSET_Y + state.camera.shakeY);

  drawChainOrbs(ctx, p, state.time);
  drawActiveArcs(ctx, p.lightningArcs || [], state.time);

  ctx.restore();
}

function drawChainOrbs(ctx, p, time) {
  if (!p.chainLightning) return;

  const count = 4;
  const baseRadius = 38;
  const cooldown = p.chainShotCooldown || 0;

  ctx.save();
  ctx.translate(p.x, p.y);

  for (let i = 0; i < count; i++) {
    const a = -time * 4.6 + i * Math.PI * 2 / count;
    const r = baseRadius + Math.sin(time * 5 + i) * 4;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    const size = 4 + Math.sin(time * 9 + i) * 1.2;

    ctx.globalAlpha = cooldown > 0 ? 0.45 : 0.85;
    ctx.fillStyle = '#66ffff';
    ctx.shadowColor = '#66ffff';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(x, y, size + 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.5, size * 0.45), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#66ffff';
  ctx.shadowColor = '#66ffff';
  ctx.shadowBlur = 12;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius + Math.sin(time * 6) * 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawActiveArcs(ctx, arcs, time) {
  for (const arc of arcs) {
    const alpha = Math.max(0, arc.life / arc.maxLife);
    drawJaggedBolt(ctx, arc.x1, arc.y1, arc.x2, arc.y2, alpha, arc.seed, time);
  }
}

function drawJaggedBolt(ctx, x1, y1, x2, y2, alpha, seed, time) {
  const segments = 7;
  const points = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    const jitter = i === 0 || i === segments ? 0 : 13;
    points.push({
      x: x + Math.sin(seed + time * 55 + i * 4.1) * jitter,
      y: y + Math.cos(seed + time * 49 + i * 3.7) * jitter,
    });
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#66ffff';
  ctx.shadowColor = '#66ffff';
  ctx.shadowBlur = 24;
  ctx.lineWidth = 6;
  strokePoints(ctx, points);

  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 2;
  strokePoints(ctx, points);
  ctx.restore();
}

function strokePoints(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  updateAddon(dt);
  drawAddonOverlay();
}

requestAnimationFrame(loop);
