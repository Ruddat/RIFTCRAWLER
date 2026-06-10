// ============================================================
// RIFT CRAWLER – Powerup System
// ============================================================

import {
  NEON_GREEN, NEON_YELLOW, NEON_RED, NEON_BLUE, NEON_PURPLE, NEON_ORANGE,
  ROOM_WIDTH, ROOM_HEIGHT,
} from './config.js';
import { state } from './state.js';
import { weightedPick, randRange } from './utils.js';

const POWERUP_TYPES = [
  { item: 'health',     weight: 30, color: NEON_GREEN,  label: '+HP' },
  { item: 'maxHealth',  weight: 10, color: NEON_RED,    label: '+MAX' },
  { item: 'speed',      weight: 15, color: NEON_YELLOW, label: '+SPD' },
  { item: 'bomb',       weight: 20, color: NEON_ORANGE, label: '+BOMB' },
  { item: 'damage',     weight: 15, color: NEON_PURPLE, label: '+DMG' },
  { item: 'gold',       weight: 25, color: NEON_YELLOW, label: '+GOLD', value: 10 },
];

/**
 * Spawn a powerup at (x, y).
 */
export function spawnPowerup(type, x, y) {
  if (type === 'random') {
    const pick = weightedPick(POWERUP_TYPES);
    return createPowerup(pick, x, y);
  }
  if (type === 'gold') {
    return createPowerup({ item: 'gold', color: NEON_YELLOW, label: '+GOLD', value: 10 }, x, y);
  }
  if (type === 'health') {
    return createPowerup({ item: 'health', color: NEON_GREEN, label: '+HP' }, x, y);
  }
  return createPowerup(POWERUP_TYPES[0], x, y);
}

function createPowerup(def, x, y) {
  return {
    x, y,
    effect: def.item,
    color: def.color,
    label: def.label,
    value: def.value || 0,
    size: 12,
    animTimer: Math.random() * Math.PI * 2,
    magnetRange: 60,
    magnetSpeed: 200,
  };
}

/**
 * Update powerups (magnetic attraction to player, animation).
 */
export function updatePowerups(dt) {
  const p = state.player;

  for (const pw of state.powerups) {
    pw.animTimer += dt * 3;

    const dx = p.x - pw.x;
    const dy = p.y - pw.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d < pw.magnetRange && d > 1) {
      const pull = pw.magnetSpeed * (1 - d / pw.magnetRange) * dt;
      pw.x += (dx / d) * pull;
      pw.y += (dy / d) * pull;
    }
  }
}

// ============================================================
// Rendering
// ============================================================

export function drawPowerups(ctx) {
  for (const pw of state.powerups) {
    ctx.save();
    ctx.translate(pw.x, pw.y);

    const bob = Math.sin(pw.animTimer) * 4;
    ctx.translate(0, bob);

    ctx.shadowColor = pw.color;
    ctx.shadowBlur = 12;

    ctx.fillStyle = pw.color;
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-pw.size * 0.6, -pw.size * 0.6, pw.size * 1.2, pw.size * 1.2);
    ctx.rotate(-Math.PI / 4);

    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, pw.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(pw.label, 0, pw.size + 10);

    ctx.restore();
  }
}
