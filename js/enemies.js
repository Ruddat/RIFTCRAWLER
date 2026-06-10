// ============================================================
// RIFT CRAWLER – Enemy Types, AI & Rendering
// ============================================================

import {
  ROOM_WIDTH, ROOM_HEIGHT, PLAYER_SIZE,
  NEON_RED, NEON_GREEN, NEON_YELLOW, NEON_PURPLE, NEON_ORANGE,
  KNOCKBACK_FORCE, KNOCKBACK_DURATION, ENEMY_SPAWN_PADDING,
} from './config.js';
import { state } from './state.js';
import { dist, angleBetween, clamp, randRange } from './utils.js';
import { isWallAt, resolveWallCollision, getCurrentRoom } from './room.js';

// ============================================================
// Enemy Factory
// ============================================================

/**
 * Create an enemy of the given type at (x, y).
 * Floor scales HP and speed.
 */
export function spawnEnemy(type, x, y, floor) {
  const scale = 1 + (floor - 1) * 0.2;

  const base = {
    x, y,
    vx: 0, vy: 0,
    type,
    hp: 3,
    maxHp: 3,
    speed: 80,
    size: 14,
    damage: 1,
    color: NEON_RED,
    facing: 0,
    attackCooldown: 0,
    attackRate: 2.0,
    hitFlash: 0,
    knockbackX: 0,
    knockbackY: 0,
    knockbackTimer: 0,
    ai: 'chase',
    aiTimer: 0,
    animTimer: 0,
    alive: true,
    _meleeHit: false,
  };

  switch (type) {
    case 'slime':
      return {
        ...base,
        hp: Math.ceil(2 * scale), maxHp: Math.ceil(2 * scale),
        speed: 60 + floor * 5,
        size: 12,
        color: NEON_GREEN,
        ai: 'chase',
        attackRate: 1.5,
        damage: 1,
      };

    case 'skeleton':
      return {
        ...base,
        hp: Math.ceil(3 * scale), maxHp: Math.ceil(3 * scale),
        speed: 40,
        size: 14,
        color: '#dddddd',
        ai: 'ranged',
        attackRate: 2.0,
        damage: 1,
        preferredDist: 200,
      };

    case 'knight':
      return {
        ...base,
        hp: Math.ceil(5 * scale), maxHp: Math.ceil(5 * scale),
        speed: 100 + floor * 5,
        size: 18,
        color: NEON_ORANGE,
        ai: 'charge',
        attackRate: 2.5,
        damage: 2,
        charging: false,
        chargeTimer: 0,
      };

    case 'swarm':
      return {
        ...base,
        hp: Math.ceil(1 * scale), maxHp: Math.ceil(1 * scale),
        speed: 120 + floor * 8,
        size: 8,
        color: NEON_PURPLE,
        ai: 'chase',
        attackRate: 0.8,
        damage: 1,
      };

    case 'mage':
      return {
        ...base,
        hp: Math.ceil(3 * scale), maxHp: Math.ceil(3 * scale),
        speed: 35,
        size: 14,
        color: NEON_PURPLE,
        ai: 'ranged',
        attackRate: 2.5,
        damage: 1,
        preferredDist: 250,
        teleportCooldown: 0,
      };

    case 'boss':
      return {
        ...base,
        hp: Math.ceil(30 * scale), maxHp: Math.ceil(30 * scale),
        speed: 50,
        size: 30,
        color: NEON_RED,
        ai: 'boss',
        attackRate: 1.2,
        damage: 2,
        phase: 1,
        phaseTimer: 0,
        patternIndex: 0,
      };

    default:
      return base;
  }
}

// ============================================================
// Enemy Update (AI + movement)
// ============================================================

export function updateEnemies(dt) {
  const p = state.player;

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];

    if (e.hitFlash > 0) e.hitFlash -= dt * 5;

    // Knockback
    if (e.knockbackTimer > 0) {
      e.knockbackTimer -= dt;
      e.x += e.knockbackX * dt;
      e.y += e.knockbackY * dt;
      e.x = clamp(e.x, e.size, ROOM_WIDTH - e.size);
      e.y = clamp(e.y, e.size, ROOM_HEIGHT - e.size);
      continue;
    }

    e.animTimer += dt;
    if (e.attackCooldown > 0) e.attackCooldown -= dt;
    e.aiTimer += dt;

    e.facing = angleBetween(e.x, e.y, p.x, p.y);

    const distToPlayer = dist(e.x, e.y, p.x, p.y);

    switch (e.ai) {
      case 'chase':   aiChase(e, dt, distToPlayer); break;
      case 'ranged':  aiRanged(e, dt, distToPlayer); break;
      case 'charge':  aiCharge(e, dt, distToPlayer); break;
      case 'boss':    aiBoss(e, dt, distToPlayer); break;
    }

    const resolved = resolveWallCollision(e.x, e.y, e.size);
    e.x = clamp(resolved.x, e.size, ROOM_WIDTH - e.size);
    e.y = clamp(resolved.y, e.size, ROOM_HEIGHT - e.size);

    if (e.hp <= 0) {
      e.alive = false;
      onEnemyKilled(e);
      state.enemies.splice(i, 1);
    }
  }

  // Check room clear
  if (!state.roomCleared && state.enemies.length === 0 && !state.doorsOpen) {
    state.roomCleared = true;
    state.doorsOpen = true;
    const room = getCurrentRoom();
    if (room) room.cleared = true;
    window.__effects.spawnParticles(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, NEON_GREEN, 20, 100, 0.6);
    if (Math.random() < 0.35) {
      state.powerups.push(window.__powerups.spawnPowerup('random', ROOM_WIDTH / 2, ROOM_HEIGHT / 2));
    }
  }
}

// --- AI Behaviors ---

function aiChase(e, dt, distToPlayer) {
  const p = state.player;
  const angle = angleBetween(e.x, e.y, p.x, p.y);

  if (distToPlayer > 20) {
    e.x += Math.cos(angle) * e.speed * dt;
    e.y += Math.sin(angle) * e.speed * dt;
  }

  if (distToPlayer < PLAYER_SIZE + e.size + 4 && e.attackCooldown <= 0) {
    window.__player.damagePlayer(e.damage);
    e.attackCooldown = e.attackRate;
  }
}

function aiRanged(e, dt, distToPlayer) {
  const p = state.player;
  const angle = angleBetween(e.x, e.y, p.x, p.y);
  const prefDist = e.preferredDist || 180;

  if (distToPlayer < prefDist - 30) {
    e.x -= Math.cos(angle) * e.speed * dt;
    e.y -= Math.sin(angle) * e.speed * dt;
  } else if (distToPlayer > prefDist + 30) {
    e.x += Math.cos(angle) * e.speed * dt;
    e.y += Math.sin(angle) * e.speed * dt;
  } else {
    const strafeAngle = angle + Math.PI / 2 * (Math.sin(e.aiTimer * 2) > 0 ? 1 : -1);
    e.x += Math.cos(strafeAngle) * e.speed * 0.5 * dt;
    e.y += Math.sin(strafeAngle) * e.speed * 0.5 * dt;
  }

  // Mage teleport
  if (e.type === 'mage' && e.teleportCooldown !== undefined) {
    e.teleportCooldown -= dt;
    if (distToPlayer < 80 && e.teleportCooldown <= 0) {
      const tAngle = Math.random() * Math.PI * 2;
      e.x = clamp(e.x + Math.cos(tAngle) * 150, 40, ROOM_WIDTH - 40);
      e.y = clamp(e.y + Math.sin(tAngle) * 150, 40, ROOM_HEIGHT - 40);
      e.teleportCooldown = 3;
      window.__effects.spawnParticles(e.x, e.y, NEON_PURPLE, 10, 60, 0.4);
    }
  }

  if (e.attackCooldown <= 0 && distToPlayer < 350) {
    const bulletSpeed = 180;
    state.enemyBullets.push({
      x: e.x + Math.cos(angle) * (e.size + 4),
      y: e.y + Math.sin(angle) * (e.size + 4),
      vx: Math.cos(angle) * bulletSpeed,
      vy: Math.sin(angle) * bulletSpeed,
      size: 4,
      damage: e.damage,
      life: 3.0,
      color: e.type === 'mage' ? NEON_PURPLE : '#dddddd',
    });
    e.attackCooldown = e.attackRate;
  }
}

function aiCharge(e, dt, distToPlayer) {
  const p = state.player;
  const angle = angleBetween(e.x, e.y, p.x, p.y);

  if (e.charging) {
    e.chargeTimer -= dt;
    if (e.chargeTimer <= 0) {
      e.charging = false;
    } else {
      e.x += Math.cos(e.facing) * e.speed * 3 * dt;
      e.y += Math.sin(e.facing) * e.speed * 3 * dt;
      if (Math.random() < 0.3) {
        window.__effects.spawnParticles(e.x, e.y, NEON_ORANGE, 1, 30, 0.2);
      }
    }

    if (distToPlayer < PLAYER_SIZE + e.size + 4) {
      window.__player.damagePlayer(e.damage);
      e.charging = false;
      e.attackCooldown = e.attackRate;
    }
  } else {
    if (distToPlayer > 60) {
      e.x += Math.cos(angle) * e.speed * 0.5 * dt;
      e.y += Math.sin(angle) * e.speed * 0.5 * dt;
    }

    if (distToPlayer < 250 && e.attackCooldown <= 0) {
      e.charging = true;
      e.chargeTimer = 0.5;
      e.facing = angle;
      e.attackCooldown = e.attackRate;
    }
  }
}

function aiBoss(e, dt, distToPlayer) {
  const p = state.player;
  const angle = angleBetween(e.x, e.y, p.x, p.y);

  const hpPercent = e.hp / e.maxHp;
  if (hpPercent < 0.33) e.phase = 3;
  else if (hpPercent < 0.66) e.phase = 2;

  e.phaseTimer += dt;

  if (distToPlayer > 80) {
    const speed = e.speed * (e.phase === 3 ? 1.5 : 1.0);
    e.x += Math.cos(angle) * speed * dt;
    e.y += Math.sin(angle) * speed * dt;
  }

  if (e.attackCooldown <= 0) {
    switch (e.phase) {
      case 1:
        bossFanShot(e, 5, 0.3);
        e.attackCooldown = 1.5;
        break;
      case 2:
        bossSpiralShot(e);
        e.attackCooldown = 1.0;
        break;
      case 3:
        if (e.patternIndex % 2 === 0) {
          bossRingShot(e, 12);
        } else {
          bossFanShot(e, 7, 0.2);
        }
        e.patternIndex++;
        e.attackCooldown = 0.8;
        break;
    }
  }
}

function bossFanShot(e, count, spread) {
  const angle = angleBetween(e.x, e.y, state.player.x, state.player.y);
  const speed = 160;
  for (let i = 0; i < count; i++) {
    const a = angle - spread * (count - 1) / 2 + spread * i;
    state.enemyBullets.push({
      x: e.x, y: e.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      size: 5, damage: 1, life: 3, color: NEON_RED,
    });
  }
}

function bossRingShot(e, count) {
  const speed = 130;
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 / count) * i + e.phaseTimer;
    state.enemyBullets.push({
      x: e.x, y: e.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      size: 5, damage: 1, life: 3, color: NEON_ORANGE,
    });
  }
}

function bossSpiralShot(e) {
  const speed = 150;
  for (let i = 0; i < 3; i++) {
    const a = e.phaseTimer * 3 + i * Math.PI * 2 / 3;
    state.enemyBullets.push({
      x: e.x, y: e.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      size: 4, damage: 1, life: 2.5, color: NEON_YELLOW,
    });
  }
}

function onEnemyKilled(e) {
  state.kills++;
  state.score += e.type === 'boss' ? 500 : (e.type === 'knight' ? 50 : 25);
  state.combo++;
  state.comboTimer = 2.0;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;

  window.__effects.spawnParticles(e.x, e.y, e.color, e.type === 'boss' ? 40 : 15, e.type === 'boss' ? 150 : 80, 0.6);
  window.__effects.spawnDamageNumber(e.x, e.y, state.combo > 1 ? `x${state.combo}` : '', NEON_YELLOW);
  window.__camera.shakeCamera(e.type === 'boss' ? 15 : 5);

  if (e.type === 'boss') {
    state.screenFlash = 0.5;
    state.flashColor = NEON_YELLOW;
    if (state.floor >= 5) {
      state.screen = 'victory';
      state.running = false;
    }
  }
}

// ============================================================
// Enemy Rendering
// ============================================================

export function drawEnemies(ctx) {
  for (const e of state.enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);

    const flashAlpha = e.hitFlash > 0 ? 0.6 : 0;

    switch (e.type) {
      case 'slime':    drawSlime(ctx, e, flashAlpha); break;
      case 'skeleton': drawSkeleton(ctx, e, flashAlpha); break;
      case 'knight':   drawKnight(ctx, e, flashAlpha); break;
      case 'swarm':    drawSwarm(ctx, e, flashAlpha); break;
      case 'mage':     drawMage(ctx, e, flashAlpha); break;
      case 'boss':     drawBoss(ctx, e, flashAlpha); break;
    }

    // HP bar (if damaged)
    if (e.hp < e.maxHp && e.maxHp > 2) {
      const barW = e.size * 2;
      const barH = 3;
      const barY = -e.size - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-barW / 2, barY, barW, barH);
      ctx.fillStyle = e.hp / e.maxHp > 0.3 ? NEON_GREEN : NEON_RED;
      ctx.fillRect(-barW / 2, barY, barW * (e.hp / e.maxHp), barH);
    }

    ctx.restore();
  }
}

function drawSlime(ctx, e, flash) {
  const squish = 1 + Math.sin(e.animTimer * 4) * 0.15;
  ctx.scale(1 / squish, squish);

  ctx.fillStyle = e.color;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(0, 0, e.size, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#000';
  const eyeOff = e.size * 0.3;
  ctx.beginPath();
  ctx.arc(-eyeOff, -2, 3, 0, Math.PI * 2);
  ctx.arc(eyeOff, -2, 3, 0, Math.PI * 2);
  ctx.fill();

  if (flash > 0) {
    ctx.globalAlpha = flash;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, e.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawSkeleton(ctx, e, flash) {
  ctx.fillStyle = e.color;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 8;

  ctx.beginPath();
  ctx.arc(0, -2, e.size * 0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillRect(-3, e.size * 0.4, 6, e.size * 0.8);

  ctx.strokeStyle = '#aa8855';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(Math.cos(e.facing) * 10, Math.sin(e.facing) * 10, 10, e.facing - 1, e.facing + 1);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = NEON_RED;
  ctx.beginPath();
  ctx.arc(-3, -4, 2, 0, Math.PI * 2);
  ctx.arc(3, -4, 2, 0, Math.PI * 2);
  ctx.fill();

  if (flash > 0) {
    ctx.globalAlpha = flash;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, e.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawKnight(ctx, e, flash) {
  ctx.rotate(e.facing);
  ctx.fillStyle = e.color;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.moveTo(e.size, 0);
  ctx.lineTo(-e.size * 0.6, -e.size);
  ctx.lineTo(-e.size, -e.size * 0.5);
  ctx.lineTo(-e.size, e.size * 0.5);
  ctx.lineTo(-e.size * 0.6, e.size);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (e.charging) {
    ctx.strokeStyle = NEON_YELLOW;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.size + 5, 0);
    ctx.lineTo(e.size + 15, 0);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  if (flash > 0) {
    ctx.globalAlpha = flash;
    ctx.fillStyle = '#fff';
    ctx.fillRect(-e.size, -e.size, e.size * 2, e.size * 2);
    ctx.globalAlpha = 1;
  }
}

function drawSwarm(ctx, e, flash) {
  ctx.fillStyle = e.color;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 6;

  const jitter = Math.sin(e.animTimer * 10) * 2;
  ctx.beginPath();
  ctx.arc(jitter, jitter * 0.5, e.size, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(jitter - 2, -1, 1.5, 0, Math.PI * 2);
  ctx.arc(jitter + 2, -1, 1.5, 0, Math.PI * 2);
  ctx.fill();

  if (flash > 0) {
    ctx.globalAlpha = flash;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, e.size + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawMage(ctx, e, flash) {
  ctx.fillStyle = e.color;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.moveTo(0, -e.size);
  ctx.lineTo(-e.size, e.size);
  ctx.lineTo(e.size, e.size);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, -e.size * 1.8);
  ctx.lineTo(-e.size * 0.5, -e.size);
  ctx.lineTo(e.size * 0.5, -e.size);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = NEON_YELLOW;
  ctx.shadowColor = NEON_YELLOW;
  ctx.shadowBlur = 8;
  const orbX = Math.cos(e.animTimer * 2) * 12;
  ctx.beginPath();
  ctx.arc(orbX, -e.size * 0.5, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  if (flash > 0) {
    ctx.globalAlpha = flash;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, e.size + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawBoss(ctx, e, flash) {
  const pulse = 1 + Math.sin(e.animTimer * 3) * 0.1;
  ctx.scale(pulse, pulse);

  ctx.fillStyle = e.color;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 25;

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + e.animTimer * 0.5;
    const r = e.size;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.3 + Math.sin(e.animTimer * 5) * 0.1;
  ctx.beginPath();
  ctx.arc(0, 0, e.size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-8, -5, 5, 0, Math.PI * 2);
  ctx.arc(8, -5, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(-8, -5, 2.5, 0, Math.PI * 2);
  ctx.arc(8, -5, 2.5, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < e.phase; i++) {
    const a = e.animTimer * 2 + (Math.PI * 2 / e.phase) * i;
    const ox = Math.cos(a) * (e.size + 12);
    const oy = Math.sin(a) * (e.size + 12);
    ctx.fillStyle = [NEON_RED, NEON_ORANGE, NEON_YELLOW][i] || NEON_RED;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(ox, oy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  if (flash > 0) {
    ctx.globalAlpha = flash;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, e.size + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
