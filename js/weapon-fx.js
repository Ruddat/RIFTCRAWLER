// ============================================================
// RIFT CRAWLER – Weapon Visual Effects System
// ============================================================
// Enhanced weapon rendering: slash trails, muzzle flash, bullet
// trails, shockwaves, fire patches, lightning bolts, and more.
// This module hooks into the game loop and renders VFX on top
// of the existing weapon visuals.

import {
  ROOM_WIDTH, ROOM_HEIGHT, ROOM_OFFSET_X, ROOM_OFFSET_Y,
  NEON_BLUE, NEON_GREEN, NEON_RED, NEON_YELLOW, NEON_PURPLE, NEON_ORANGE,
  ATTACK_DURATION, ATTACK_ARC, ATTACK_RANGE,
} from './config.js';
import { state } from './state.js';
import { randRange, dist } from './utils.js';
import { spawnParticles, spawnDamageNumber, spawnRing } from './effects.js';
import { shakeCamera } from './camera.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas?.getContext('2d');

// ============================================================
// VFX State — persistent visual effects (trails, shockwaves, fire patches)
// ============================================================

const vfx = {
  // Slash ghost trails
  slashTrails: [],

  // Muzzle flash effects
  muzzleFlashes: [],

  // Bullet trail points
  bulletTrails: [],

  // Shockwave rings (bomb, rocket)
  shockwaves: [],

  // Ground fire patches (flamethrower, rocket)
  firePatches: [],

  // Lightning bolt segments
  lightningBolts: [],

  // Impact bursts
  impactBursts: [],

  // Screen flicker
  flickerTimer: 0,
};

// Expose for player.js to call
window.__weaponfx = vfx;
window.__weaponfx_spawnSlashTrail = spawnSlashTrail;
window.__weaponfx_spawnMuzzleFlash = spawnMuzzleFlash;
window.__weaponfx_spawnShockwave = spawnShockwave;
window.__weaponfx_spawnFirePatch = spawnFirePatch;
window.__weaponfx_spawnLightningBolt = spawnLightningBolt;
window.__weaponfx_spawnImpactBurst = spawnImpactBurst;
window.__weaponfx_triggerFlicker = triggerFlicker;

// ============================================================
// Slash Trail (melee ghost afterimage)
// ============================================================

export function spawnSlashTrail(x, y, facing, weaponLevel) {
  const colors = [
    NEON_YELLOW,      // Lv1
    NEON_BLUE,        // Lv2
    NEON_GREEN,       // Lv3
    NEON_ORANGE,      // Lv4
    NEON_PURPLE,      // Lv5
  ];
  const color = colors[Math.min(weaponLevel - 1, 4)];

  vfx.slashTrails.push({
    x, y,
    facing,
    weaponLevel,
    color,
    life: 0.35,
    maxLife: 0.35,
    arc: ATTACK_ARC * (1 + weaponLevel * 0.1),
    range: ATTACK_RANGE * (1 + (weaponLevel - 1) * 0.15),
  });
}

function drawSlashTrails(ctx) {
  for (let i = vfx.slashTrails.length - 1; i >= 0; i--) {
    const s = vfx.slashTrails[i];
    s.life -= state.dt;
    if (s.life <= 0) {
      vfx.slashTrails.splice(i, 1);
      continue;
    }

    const alpha = (s.life / s.maxLife) * 0.6;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.globalAlpha = alpha;

    // Ghost arc trail
    ctx.strokeStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 4 + s.weaponLevel;

    ctx.beginPath();
    ctx.arc(0, 0, s.range, s.facing - s.arc / 2, s.facing + s.arc / 2);
    ctx.stroke();

    // Secondary inner arc for depth
    ctx.globalAlpha = alpha * 0.4;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(0, 0, s.range * 0.7, s.facing - s.arc / 2.5, s.facing + s.arc / 2.5);
    ctx.stroke();

    // Sparkle dots along the arc
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 6;
    const sparkCount = 3 + s.weaponLevel;
    for (let si = 0; si < sparkCount; si++) {
      const t = si / sparkCount;
      const angle = s.facing - s.arc / 2 + s.arc * t;
      const r = s.range * (0.6 + Math.random() * 0.4);
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 1.5 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ============================================================
// Muzzle Flash (shooting)
// ============================================================

export function spawnMuzzleFlash(x, y, angle, color) {
  vfx.muzzleFlashes.push({
    x, y, angle, color,
    life: 0.1,
    maxLife: 0.1,
  });
}

function drawMuzzleFlashes(ctx) {
  for (let i = vfx.muzzleFlashes.length - 1; i >= 0; i--) {
    const m = vfx.muzzleFlashes[i];
    m.life -= state.dt;
    if (m.life <= 0) {
      vfx.muzzleFlashes.splice(i, 1);
      continue;
    }

    const alpha = m.life / m.maxLife;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.globalAlpha = alpha;

    // Starburst flash
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 25);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, m.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.shadowColor = m.color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();

    // Directional streaks
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 8;
    for (let si = 0; si < 4; si++) {
      const spread = (si - 1.5) * 0.15;
      const a = m.angle + spread;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ============================================================
// Bullet Trails (energy streaks behind bullets)
// ============================================================

export function trackBulletTrail(bullet) {
  if (!bullet._trailPoints) bullet._trailPoints = [];
  bullet._trailPoints.push({ x: bullet.x, y: bullet.y, life: 0.12 });
  // Keep last 6 points
  if (bullet._trailPoints.length > 6) bullet._trailPoints.shift();
}

export function drawBulletTrail(ctx, bullet) {
  if (!bullet._trailPoints || bullet._trailPoints.length < 2) return;

  const color = bullet.color || NEON_BLUE;
  ctx.save();

  for (let i = 0; i < bullet._trailPoints.length; i++) {
    const pt = bullet._trailPoints[i];
    pt.life -= state.dt;
    const alpha = Math.max(0, pt.life / 0.12) * (i / bullet._trailPoints.length) * 0.5;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    const size = bullet.size * (0.3 + 0.7 * (i / bullet._trailPoints.length));
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Trail line
  if (bullet._trailPoints.length >= 2) {
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.lineWidth = bullet.size * 0.8;
    ctx.beginPath();
    ctx.moveTo(bullet._trailPoints[0].x, bullet._trailPoints[0].y);
    for (let i = 1; i < bullet._trailPoints.length; i++) {
      ctx.lineTo(bullet._trailPoints[i].x, bullet._trailPoints[i].y);
    }
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ============================================================
// Shockwave Ring (bomb, rocket)
// ============================================================

export function spawnShockwave(x, y, maxRadius, color, duration) {
  vfx.shockwaves.push({
    x, y,
    maxRadius: maxRadius || 120,
    color: color || NEON_RED,
    life: duration || 0.5,
    maxLife: duration || 0.5,
  });
}

function drawShockwaves(ctx) {
  for (let i = vfx.shockwaves.length - 1; i >= 0; i--) {
    const sw = vfx.shockwaves[i];
    sw.life -= state.dt;
    if (sw.life <= 0) {
      vfx.shockwaves.splice(i, 1);
      continue;
    }

    const progress = 1 - (sw.life / sw.maxLife);
    const radius = sw.maxRadius * progress;
    const alpha = (1 - progress) * 0.7;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Outer ring
    ctx.strokeStyle = sw.color;
    ctx.shadowColor = sw.color;
    ctx.shadowBlur = 20 * (1 - progress);
    ctx.lineWidth = 4 * (1 - progress) + 1;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner flash ring
    ctx.globalAlpha = alpha * 0.4;
    ctx.lineWidth = 8 * (1 - progress);
    ctx.strokeStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, radius * 0.8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ============================================================
// Fire Patches (flamethrower, burning ground)
// ============================================================

export function spawnFirePatch(x, y, radius, duration) {
  vfx.firePatches.push({
    x, y,
    radius: radius || 15,
    life: duration || 1.5,
    maxLife: duration || 1.5,
    flickerPhase: Math.random() * Math.PI * 2,
  });
}

function drawFirePatches(ctx) {
  for (let i = vfx.firePatches.length - 1; i >= 0; i--) {
    const fp = vfx.firePatches[i];
    fp.life -= state.dt;
    if (fp.life <= 0) {
      vfx.firePatches.splice(i, 1);
      continue;
    }

    const alpha = (fp.life / fp.maxLife) * 0.5;
    const flicker = 0.7 + Math.sin(state.time * 12 + fp.flickerPhase) * 0.3;
    const radius = fp.radius * (0.8 + flicker * 0.2);

    ctx.save();
    ctx.globalAlpha = alpha * flicker;

    // Fire glow
    const grad = ctx.createRadialGradient(fp.x, fp.y, 0, fp.x, fp.y, radius);
    grad.addColorStop(0, 'rgba(255,200,50,0.6)');
    grad.addColorStop(0.4, 'rgba(255,100,20,0.3)');
    grad.addColorStop(1, 'rgba(200,30,0,0)');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(fp.x, fp.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ============================================================
// Lightning Bolts (jagged electric arcs)
// ============================================================

export function spawnLightningBolt(x1, y1, x2, y2, color, duration) {
  const segments = 8;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push({
      x: x1 + (x2 - x1) * t + (i === 0 || i === segments ? 0 : randRange(-14, 14)),
      y: y1 + (y2 - y1) * t + (i === 0 || i === segments ? 0 : randRange(-14, 14)),
    });
  }

  vfx.lightningBolts.push({
    points,
    color: color || '#ffff00',
    life: duration || 0.25,
    maxLife: duration || 0.25,
    seed: Math.random() * 1000,
  });
}

function drawLightningBolts(ctx) {
  for (let i = vfx.lightningBolts.length - 1; i >= 0; i--) {
    const bolt = vfx.lightningBolts[i];
    bolt.life -= state.dt;
    if (bolt.life <= 0) {
      vfx.lightningBolts.splice(i, 1);
      continue;
    }

    const alpha = bolt.life / bolt.maxLife;

    // Re-jitter points each frame for electric look
    for (let j = 1; j < bolt.points.length - 1; j++) {
      const t = j / (bolt.points.length - 1);
      const baseX = bolt.points[0].x + (bolt.points[bolt.points.length - 1].x - bolt.points[0].x) * t;
      const baseY = bolt.points[0].y + (bolt.points[bolt.points.length - 1].y - bolt.points[0].y) * t;
      bolt.points[j].x = baseX + Math.sin(state.time * 60 + bolt.seed + j * 3) * 12;
      bolt.points[j].y = baseY + Math.cos(state.time * 55 + bolt.seed + j * 2.7) * 12;
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    // Wide outer glow
    ctx.strokeStyle = bolt.color;
    ctx.shadowColor = bolt.color;
    ctx.shadowBlur = 25;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
    for (let j = 1; j < bolt.points.length; j++) {
      ctx.lineTo(bolt.points[j].x, bolt.points[j].y);
    }
    ctx.stroke();

    // Core bright line
    ctx.strokeStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
    for (let j = 1; j < bolt.points.length; j++) {
      ctx.lineTo(bolt.points[j].x, bolt.points[j].y);
    }
    ctx.stroke();

    // Branch arcs (2-3 random branches)
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = bolt.color;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 1.5;
    for (let b = 0; b < 2; b++) {
      const startIdx = 1 + Math.floor(Math.random() * (bolt.points.length - 2));
      const start = bolt.points[startIdx];
      const endX = start.x + randRange(-30, 30);
      const endY = start.y + randRange(-30, 30);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo((start.x + endX) / 2 + randRange(-10, 10), (start.y + endY) / 2 + randRange(-10, 10));
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ============================================================
// Impact Burst (hit effects on enemy/wall)
// ============================================================

export function spawnImpactBurst(x, y, color, size) {
  vfx.impactBursts.push({
    x, y,
    color: color || NEON_YELLOW,
    size: size || 20,
    life: 0.2,
    maxLife: 0.2,
  });
}

function drawImpactBursts(ctx) {
  for (let i = vfx.impactBursts.length - 1; i >= 0; i--) {
    const ib = vfx.impactBursts[i];
    ib.life -= state.dt;
    if (ib.life <= 0) {
      vfx.impactBursts.splice(i, 1);
      continue;
    }

    const progress = 1 - (ib.life / ib.maxLife);
    const alpha = (1 - progress) * 0.8;
    const radius = ib.size * (0.5 + progress * 0.5);

    ctx.save();
    ctx.globalAlpha = alpha;

    // Starburst
    ctx.fillStyle = ib.color;
    ctx.shadowColor = ib.color;
    ctx.shadowBlur = 15;
    for (let r = 0; r < 6; r++) {
      const angle = (Math.PI * 2 / 6) * r + progress * 0.5;
      const len = radius * (0.5 + progress * 0.5);
      ctx.beginPath();
      ctx.moveTo(ib.x, ib.y);
      ctx.lineTo(
        ib.x + Math.cos(angle - 0.15) * len,
        ib.y + Math.sin(angle - 0.15) * len
      );
      ctx.lineTo(
        ib.x + Math.cos(angle) * (len * 1.3),
        ib.y + Math.sin(angle) * (len * 1.3)
      );
      ctx.lineTo(
        ib.x + Math.cos(angle + 0.15) * len,
        ib.y + Math.sin(angle + 0.15) * len
      );
      ctx.closePath();
      ctx.fill();
    }

    // White center flash
    ctx.globalAlpha = alpha * (1 - progress);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(ib.x, ib.y, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ============================================================
// Enhanced Laser Beam
// ============================================================

function drawEnhancedLaser(ctx, p) {
  if (!p.laserActive) return;

  const beamLen = 600;
  const endX = p.x + Math.cos(p.laserAngle) * beamLen;
  const endY = p.y + Math.sin(p.laserAngle) * beamLen;
  const pulse = 0.8 + Math.sin(state.time * 30) * 0.2;

  ctx.save();

  // Heat shimmer (subtle distortion line around beam)
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#ff88aa';
  ctx.lineWidth = 30 * pulse;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Wide outer glow
  ctx.globalAlpha = 0.2 * pulse;
  ctx.strokeStyle = '#ff0066';
  ctx.shadowColor = '#ff0066';
  ctx.shadowBlur = 35;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Core beam
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#ff3388';
  ctx.shadowBlur = 15;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // White hot center
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#fff';
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Impact point glow at far end
  ctx.globalAlpha = 0.5 * pulse;
  const endGrad = ctx.createRadialGradient(endX, endY, 0, endX, endY, 40);
  endGrad.addColorStop(0, '#ff0066');
  endGrad.addColorStop(0.5, 'rgba(255,0,100,0.3)');
  endGrad.addColorStop(1, 'rgba(255,0,100,0)');
  ctx.fillStyle = endGrad;
  ctx.fillRect(endX - 40, endY - 40, 80, 80);

  // Muzzle glow at player
  ctx.globalAlpha = 0.6;
  const muzzGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 30);
  muzzGrad.addColorStop(0, '#ff88aa');
  muzzGrad.addColorStop(0.5, 'rgba(255,0,100,0.2)');
  muzzGrad.addColorStop(1, 'rgba(255,0,100,0)');
  ctx.fillStyle = muzzGrad;
  ctx.fillRect(p.x - 30, p.y - 30, 60, 60);

  ctx.shadowBlur = 0;
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ============================================================
// Enhanced Melee Slash (with weapon level progression)
// ============================================================

function drawEnhancedMelee(ctx, p) {
  if (!p.attacking) return;

  const progress = 1 - Math.max(0, Math.min(1, p.attackTimer / ATTACK_DURATION));
  const meleeRange = ATTACK_RANGE * (p.meleeRange || 1.0);
  const wl = p.weaponLevel || 1;
  const swingAngle = p.facing - ATTACK_ARC / 2 + ATTACK_ARC * progress;

  const colors = [NEON_YELLOW, NEON_BLUE, NEON_GREEN, NEON_ORANGE, NEON_PURPLE];
  const color = colors[Math.min(wl - 1, 4)];

  ctx.save();
  ctx.translate(p.x, p.y);

  // Wide glow arc
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20 + wl * 5;
  ctx.lineWidth = 8 + wl * 2;
  ctx.beginPath();
  ctx.arc(0, 0, meleeRange, p.facing - ATTACK_ARC / 2, swingAngle);
  ctx.stroke();

  // Sharp inner arc
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 3 + wl;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(0, 0, meleeRange, p.facing - ATTACK_ARC / 2, swingAngle);
  ctx.stroke();

  // Sword tip with trail
  const tipX = Math.cos(swingAngle) * meleeRange;
  const tipY = Math.sin(swingAngle) * meleeRange;
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 10;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(tipX, tipY, 4 + wl, 0, Math.PI * 2);
  ctx.fill();

  // Level 3+: spin sparks around tip
  if (wl >= 3) {
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = color;
    for (let si = 0; si < 3 + wl; si++) {
      const sa = state.time * 15 + si * Math.PI * 2 / (3 + wl);
      const sr = 6 + wl;
      ctx.beginPath();
      ctx.arc(tipX + Math.cos(sa) * sr, tipY + Math.sin(sa) * sr, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Level 5: energy crescent
  if (wl >= 5) {
    ctx.globalAlpha = 0.4 * (1 - progress);
    ctx.strokeStyle = NEON_PURPLE;
    ctx.shadowColor = NEON_PURPLE;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, meleeRange + 8, p.facing - ATTACK_ARC / 2 - 0.1, swingAngle + 0.1);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ============================================================
// Screen Flicker (lightning weapons)
// ============================================================

export function triggerFlicker(duration) {
  vfx.flickerTimer = duration || 0.08;
}

function drawFlicker(ctx) {
  if (vfx.flickerTimer <= 0) return;
  vfx.flickerTimer -= state.dt;

  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#aaffff';
  ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ============================================================
// Enhanced Bullets (rocket smoke, piercing glow)
// ============================================================

function drawEnhancedBullets(ctx) {
  for (const b of state.bullets) {
    // Track trail
    trackBulletTrail(b);
    drawBulletTrail(ctx, b);

    // Bullet body (enhanced)
    ctx.save();
    ctx.fillStyle = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fill();

    // White core
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Rocket smoke trail
    if (b.isRocket && Math.random() < 0.6) {
      spawnParticles(
        b.x - b.vx * 0.02 + randRange(-3, 3),
        b.y - b.vy * 0.02 + randRange(-3, 3),
        Math.random() < 0.5 ? '#666666' : '#888888',
        1, 15, 0.4
      );
    }

    // Piercing bullet energy ring
    if (b.piercing) {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Enemy bullets (unchanged, but with slight enhancement)
  for (const b of state.enemyBullets) {
    const color = b.color || NEON_RED;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

// ============================================================
// Main Render Loop
// ============================================================

let lastTime = performance.now();

function loop(now) {
  requestAnimationFrame(loop);

  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  if (!ctx || !window.__state) return;
  const s = window.__state;
  if (s.screen !== 'playing' || s.paused || s.floorTransition) return;

  // Update dt for sub-module use
  if (s.dt !== dt) s.dt = dt;

  const p = s.player;
  if (!p) return;

  ctx.save();
  ctx.translate(ROOM_OFFSET_X + s.camera.shakeX, ROOM_OFFSET_Y + s.camera.shakeY);

  // 1. Fire patches (below everything)
  drawFirePatches(ctx);

  // 2. Slash ghost trails
  drawSlashTrails(ctx);

  // 3. Shockwave rings
  drawShockwaves(ctx);

  // 4. Lightning bolts
  drawLightningBolts(ctx);

  // 5. Muzzle flashes
  drawMuzzleFlashes(ctx);

  // 6. Impact bursts
  drawImpactBursts(ctx);

  // 7. Enhanced melee (on top of sprite)
  drawEnhancedMelee(ctx, p);

  // 8. Enhanced laser beam
  drawEnhancedLaser(ctx, p);

  // 9. Enhanced bullets with trails
  drawEnhancedBullets(ctx);

  // 10. Screen flicker
  drawFlicker(ctx);

  ctx.restore();
}

requestAnimationFrame(loop);
