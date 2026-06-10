// ============================================================
// RIFT CRAWLER – Particle Effects & Damage Numbers
// ============================================================

import { NEON_BLUE, NEON_GREEN, NEON_RED, NEON_YELLOW, NEON_PURPLE } from './config.js';
import { state } from './state.js';
import { randRange } from './utils.js';

// ============================================================
// Spawn helpers
// ============================================================

/**
 * Spawn particles at (x, y).
 * @param {number} x
 * @param {number} y
 * @param {string} color
 * @param {number} count
 * @param {number} speed – max speed
 * @param {number} life – seconds
 */
export function spawnParticles(x, y, color, count, speed, life) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = randRange(speed * 0.3, speed);
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life,
      maxLife: life,
      color,
      size: randRange(2, 5),
      friction: 0.95,
    });
  }
}

/**
 * Spawn a directional burst of particles (e.g., explosion ring).
 */
export function spawnRing(x, y, color, count, radius, life) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i;
    state.particles.push({
      x: x + Math.cos(angle) * radius * 0.3,
      y: y + Math.sin(angle) * radius * 0.3,
      vx: Math.cos(angle) * radius * 2,
      vy: Math.sin(angle) * radius * 2,
      life,
      maxLife: life,
      color,
      size: randRange(3, 6),
      friction: 0.92,
    });
  }
}

/**
 * Spawn a damage number floating upward.
 */
export function spawnDamageNumber(x, y, text, color) {
  state.damageNumbers.push({
    x: x + randRange(-10, 10),
    y,
    text: String(text),
    color,
    life: 1.0,
    maxLife: 1.0,
    vy: -50,
  });
}

// ============================================================
// Update
// ============================================================

export function updateEffects(dt) {
  // Particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= p.friction;
    p.vy *= p.friction;
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }

  // Damage numbers
  for (let i = state.damageNumbers.length - 1; i >= 0; i--) {
    const d = state.damageNumbers[i];
    d.y += d.vy * dt;
    d.vy *= 0.97;
    d.life -= dt;
    if (d.life <= 0) {
      state.damageNumbers.splice(i, 1);
    }
  }

  // Screen flash decay
  if (state.screenFlash > 0) {
    state.screenFlash -= dt * 4;
    if (state.screenFlash < 0) state.screenFlash = 0;
  }
}

// ============================================================
// Rendering
// ============================================================

export function drawEffects(ctx) {
  // Particles
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 4;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Damage numbers
  for (const d of state.damageNumbers) {
    const alpha = d.life / d.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = d.color;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = d.color;
    ctx.shadowBlur = 6;
    ctx.fillText(d.text, d.x, d.y);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
}
