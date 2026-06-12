// ============================================================
// RIFT CRAWLER – Sprite Overlay Autoload
// ============================================================
// Temporary bridge while sprites are not yet integrated directly into
// drawPlayer() and drawEnemies(). The overlay is followed by a redraw of
// readability-critical layers so projectiles, drops and weapon FX stay visible.

import { ROOM_OFFSET_X, ROOM_OFFSET_Y } from './config.js';
import { loadSprites, sprites } from './sprites.js';
import { drawSpriteOverlay } from './sprite-renderer.js';
import { drawBullets } from './player.js';
import { drawPowerups } from './powerups.js';
import { drawEffects } from './effects.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas?.getContext('2d');

let started = false;

loadSprites().then(() => {
  started = true;
});

function overlayLoop() {
  requestAnimationFrame(overlayLoop);

  if (!started || !sprites.ready || !ctx || !window.__state) return;

  const state = window.__state;
  if (state.screen !== 'playing' || state.paused || state.floorTransition) return;

  ctx.save();
  ctx.translate(ROOM_OFFSET_X + state.camera.shakeX, ROOM_OFFSET_Y + state.camera.shakeY);

  drawSpriteOverlay(ctx);

  // Keep gameplay-critical objects above the temporary sprite overlay.
  drawPlayerWeaponFxAboveSprites(ctx, state);
  drawPowerups(ctx);
  drawBullets(ctx);
  drawEffects(ctx);

  ctx.restore();
}

function drawPlayerWeaponFxAboveSprites(ctx, state) {
  const p = state.player;
  if (!p) return;

  drawLaserFx(ctx, p);
  drawShieldFx(ctx, p, state.time);
  drawOrbitalFx(ctx, p);
  drawChainLightningFx(ctx, p, state.time);
  drawMeleeArcFx(ctx, p);
}

function drawLaserFx(ctx, p) {
  if (!p.laserActive) return;

  const beamLen = 620;
  const endX = p.x + Math.cos(p.laserAngle) * beamLen;
  const endY = p.y + Math.sin(p.laserAngle) * beamLen;

  ctx.save();
  ctx.strokeStyle = '#ff33aa';
  ctx.shadowColor = '#ff33aa';
  ctx.shadowBlur = 20;
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.restore();
}

function drawShieldFx(ctx, p, time) {
  if (!p.shield) return;

  const pulse = 1 + Math.sin(time * 5) * 0.05;
  const radius = (18 + 14) * pulse;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.strokeStyle = '#00d4ff';
  ctx.shadowColor = '#00d4ff';
  ctx.shadowBlur = 18;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawOrbitalFx(ctx, p) {
  if (!p.orbitals) return;

  ctx.save();
  ctx.strokeStyle = '#00ccff';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#00ccff';
  ctx.shadowBlur = 14;

  for (let i = 0; i < p.orbitals; i++) {
    const angle = p.orbitalAngle + (Math.PI * 2 / p.orbitals) * i;
    const ox = p.x + Math.cos(angle) * p.orbitalRadius;
    const oy = p.y + Math.sin(angle) * p.orbitalRadius;

    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.orbitalRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(ox, oy, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawChainLightningFx(ctx, p, time) {
  if (!p.chainLightning) return;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.strokeStyle = '#66ffff';
  ctx.shadowColor = '#66ffff';
  ctx.shadowBlur = 18;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.75 + Math.sin(time * 14) * 0.2;

  for (let i = 0; i < 8; i++) {
    const a = time * 4 + i * Math.PI / 4;
    const r1 = 26 + (i % 2) * 4;
    const r2 = r1 + 14;
    const x1 = Math.cos(a) * r1;
    const y1 = Math.sin(a) * r1;
    const x2 = Math.cos(a + 0.18) * r2;
    const y2 = Math.sin(a + 0.18) * r2;
    const midX = (x1 + x2) * 0.5 + Math.sin(time * 17 + i) * 7;
    const midY = (y1 + y2) * 0.5 + Math.cos(time * 19 + i) * 7;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(midX, midY);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(0, 0, 32 + Math.sin(time * 10) * 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawMeleeArcFx(ctx, p) {
  if (!p.attacking) return;

  const attackDuration = 0.18;
  const attackArc = Math.PI * 1.25;
  const attackRange = 54 * (p.meleeRange || 1.0);
  const progress = 1 - Math.max(0, Math.min(1, p.attackTimer / attackDuration));
  const swingAngle = p.facing - attackArc / 2 + attackArc * progress;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.strokeStyle = p.weaponLevel >= 4 ? '#b44dff' : '#ffdd55';
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 22;
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.arc(0, 0, attackRange, p.facing - attackArc / 2, swingAngle);
  ctx.stroke();
  ctx.restore();
}

requestAnimationFrame(overlayLoop);
