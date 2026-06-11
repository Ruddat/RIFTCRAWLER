// ============================================================
// RIFT CRAWLER – Player Movement, Combat & Rendering
// ============================================================

import {
  PLAYER_SIZE, PLAYER_SPEED, ATTACK_DURATION, ATTACK_COOLDOWN,
  ATTACK_RANGE, ATTACK_ARC, DASH_SPEED, DASH_DURATION, DASH_COOLDOWN,
  INVINCIBLE_TIME, SHOOT_COOLDOWN, BULLET_SPEED, BULLET_SIZE,
  ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS, NEON_BLUE, NEON_GREEN, NEON_RED, NEON_YELLOW,
} from './config.js';
import { state } from './state.js';
import { getMovement, consumeAttack, consumeDash, consumeShoot, consumeBomb, getMousePos } from './input.js';
import { isWallAt, resolveWallCollision, checkDoorTransition, getDoorEntryPoint, oppositeDir, getCurrentRoom } from './room.js';
import { clamp, angleBetween, dist, randRange } from './utils.js';
import { spawnParticles, spawnDamageNumber } from './effects.js';
import { shakeCamera } from './camera.js';

// ============================================================
// Update
// ============================================================

export function updatePlayer(dt) {
  const p = state.player;

  // --- Invincibility timer ---
  if (p.invincible) {
    p.invincibleTimer -= dt;
    if (p.invincibleTimer <= 0) {
      p.invincible = false;
      p.invincibleTimer = 0;
    }
  }

  // --- Damage flash ---
  if (p.damageFlash > 0) p.damageFlash -= dt * 4;

  // --- Powerup glow ---
  if (p.powerupGlow > 0) p.powerupGlow -= dt * 2;
  if (p.levelUpFlash > 0) p.levelUpFlash -= dt * 1.5;

  // --- Shield timer ---
  if (p.shield) {
    p.shieldTimer -= dt;
    if (p.shieldTimer <= 0) {
      p.shield = false;
      p.shieldTimer = 0;
      spawnParticles(p.x, p.y, NEON_BLUE, 8, 50, 0.4);
    }
  }

  // --- Speed boost timer ---
  if (p.speedBoost) {
    p.speedBoostTimer -= dt;
    if (p.speedBoostTimer <= 0) {
      p.speedBoost = false;
      p.speedBoostTimer = 0;
      p.speed = PLAYER_SPEED;
    }
  }

  // --- Orbital rotation ---
  if (p.orbitals > 0) {
    p.orbitalAngle += dt * 4;  // rotation speed
    // Check orbital collision with enemies
    for (let oi = 0; oi < p.orbitals; oi++) {
      const oAngle = p.orbitalAngle + (Math.PI * 2 / p.orbitals) * oi;
      const ox = p.x + Math.cos(oAngle) * p.orbitalRadius;
      const oy = p.y + Math.sin(oAngle) * p.orbitalRadius;
      for (const e of state.enemies) {
        if (dist(ox, oy, e.x, e.y) < 12 + e.size) {
          if (!e._orbitalHit) {
            e._orbitalHit = true;
            e.hp -= p.orbitalDamage;
            e.hitFlash = 1;
            const pushAngle = angleBetween(p.x, p.y, e.x, e.y);
            e.knockbackX = Math.cos(pushAngle) * KNOCKBACK_FORCE * 0.5;
            e.knockbackY = Math.sin(pushAngle) * KNOCKBACK_FORCE * 0.5;
            e.knockbackTimer = KNOCKBACK_DURATION;
            spawnParticles(ox, oy, '#00ccff', 4, 40, 0.3);
            spawnDamageNumber(e.x, e.y - 10, p.orbitalDamage, '#00ccff');
          }
        }
      }
    }
    // Reset orbital hit flags
    for (const e of state.enemies) e._orbitalHit = false;
  }

  // --- Time Slow timer ---
  if (p.timeSlow) {
    p.timeSlowTimer -= dt;
    if (p.timeSlowTimer <= 0) {
      p.timeSlow = false;
      p.timeSlowTimer = 0;
      state.slowMotion = 1.0;
      spawnParticles(p.x, p.y, '#aaaaff', 8, 50, 0.4);
    }
  }

  // --- Berserk timer ---
  if (p.berserk) {
    p.berserkTimer -= dt;
    if (p.berserkTimer <= 0) {
      p.berserk = false;
      p.berserkTimer = 0;
      // Restore base damage (reverse the 2x)
      p.meleeDamage = Math.max(1, Math.floor(p.meleeDamage / 2));
      p.bulletDamage = Math.max(1, Math.floor(p.bulletDamage / 2));
      spawnParticles(p.x, p.y, '#ff4444', 8, 50, 0.4);
    }
  }

  // --- Chain Lightning timer ---
  if (p.chainLightning) {
    p.chainLightningTimer -= dt;
    if (p.chainLightningTimer <= 0) {
      p.chainLightning = false;
      p.chainLightningTimer = 0;
      spawnParticles(p.x, p.y, '#44ffff', 8, 50, 0.4);
    }
  }

  // --- Magnet timer (simple countdown) ---
  if (p.magnetRange > 0) {
    p.magnetRange -= dt * 13;  // 200 / 15s ≈ 13.3 per second
    if (p.magnetRange <= 0) {
      p.magnetRange = 0;
    }
  }

  // --- Dash ---
  if (p.dashing) {
    p.dashTimer -= dt;
    if (p.dashTimer <= 0) {
      p.dashing = false;
      p.dashTimer = 0;
    } else {
      p.x += p.dashDirX * DASH_SPEED * dt;
      p.y += p.dashDirY * DASH_SPEED * dt;
      p.x = clamp(p.x, PLAYER_SIZE, ROOM_WIDTH - PLAYER_SIZE);
      p.y = clamp(p.y, PLAYER_SIZE, ROOM_HEIGHT - PLAYER_SIZE);

      if (Math.random() < 0.5) {
        spawnParticles(p.x, p.y, NEON_BLUE, 1, 30, 0.3);
      }
      return;
    }
  }

  // --- Dash input ---
  if (consumeDash() && p.dashCooldown <= 0 && !p.attacking) {
    const move = getMovement();
    if (move.x !== 0 || move.y !== 0) {
      const len = Math.sqrt(move.x * move.x + move.y * move.y);
      p.dashDirX = move.x / len;
      p.dashDirY = move.y / len;
      p.dashing = true;
      p.dashTimer = DASH_DURATION;
      p.dashCooldown = DASH_COOLDOWN;
      p.invincible = true;
      p.invincibleTimer = DASH_DURATION + 0.05;
      spawnParticles(p.x, p.y, NEON_BLUE, 8, 80, 0.4);
    }
  }

  if (p.dashCooldown > 0) p.dashCooldown -= dt;

  // --- Movement ---
  const move = getMovement();
  p.vx = move.x * p.speed;
  p.vy = move.y * p.speed;

  const newX = p.x + p.vx * dt;
  const newY = p.y + p.vy * dt;

  const resolved = resolveWallCollision(newX, newY, PLAYER_SIZE);
  p.x = clamp(resolved.x, PLAYER_SIZE, ROOM_WIDTH - PLAYER_SIZE);
  p.y = clamp(resolved.y, PLAYER_SIZE, ROOM_HEIGHT - PLAYER_SIZE);

  // --- Facing direction ---
  if (move.x !== 0 || move.y !== 0) {
    p.facing = Math.atan2(move.y, move.x);
  }

  // --- Trail ---
  if (move.x !== 0 || move.y !== 0) {
    p.trail.push({ x: p.x, y: p.y, alpha: 1 });
    if (p.trail.length > 12) p.trail.shift();
  }
  for (let i = p.trail.length - 1; i >= 0; i--) {
    p.trail[i].alpha -= dt * 4;
    if (p.trail[i].alpha <= 0) p.trail.splice(i, 1);
  }

  // --- Melee attack ---
  if (p.attacking) {
    p.attackTimer -= dt;
    if (p.attackTimer <= 0) {
      p.attacking = false;
      p.attackTimer = 0;
    }
  }

  if (consumeAttack() && !p.attacking && p.attackCooldown <= 0) {
    p.attacking = true;
    p.attackTimer = ATTACK_DURATION;
    p.attackCooldown = ATTACK_COOLDOWN;
    spawnParticles(
      p.x + Math.cos(p.facing) * 24,
      p.y + Math.sin(p.facing) * 24,
      NEON_YELLOW, 5, 60, 0.3
    );
  }

  if (p.attackCooldown > 0) p.attackCooldown -= dt;

  // --- Ranged attack (multi-shot based on weapon level) ---
  if (consumeShoot() && p.shootCooldown <= 0) {
    const aimAngle = p.facing;
    const count = p.bulletCount || 1;
    const spread = 0.15;  // radians between bullets
    const startAngle = aimAngle - spread * (count - 1) / 2;

    for (let i = 0; i < count; i++) {
      const a = startAngle + spread * i;
      state.bullets.push({
        x: p.x + Math.cos(a) * 16,
        y: p.y + Math.sin(a) * 16,
        vx: Math.cos(a) * BULLET_SPEED,
        vy: Math.sin(a) * BULLET_SPEED,
        size: BULLET_SIZE + (p.weaponLevel > 3 ? 1 : 0),
        damage: p.bulletDamage || 1,
        life: 2.0,
        piercing: p.bulletPiercing || false,
        color: p.weaponLevel >= 4 ? NEON_PURPLE : NEON_BLUE,
      });
    }
    p.shootCooldown = SHOOT_COOLDOWN;
    spawnParticles(
      p.x + Math.cos(aimAngle) * 20,
      p.y + Math.sin(aimAngle) * 20,
      NEON_BLUE, 3, 40, 0.2
    );
  }

  if (p.shootCooldown > 0) p.shootCooldown -= dt;

  // --- Bomb ---
  if (consumeBomb() && p.bombs > 0) {
    p.bombs--;
    spawnBomb(p.x, p.y);
  }

  // --- Check door transition ---
  if (!state.transitioning && state.doorsOpen) {
    const doorDir = checkDoorTransition(p.x, p.y);
    if (doorDir) {
      enterRoom(doorDir);
    }
  }

  // --- Update bullets ---
  updateBullets(dt);
}

/** Spawn a bomb explosion */
function spawnBomb(bx, by) {
  const RADIUS = 120;
  const DAMAGE = 3;

  spawnParticles(bx, by, NEON_RED, 30, 150, 0.8);
  spawnParticles(bx, by, NEON_YELLOW, 20, 100, 0.6);
  shakeCamera(12);
  state.screenFlash = 0.3;
  state.flashColor = NEON_RED;

  for (const e of state.enemies) {
    const d = dist(bx, by, e.x, e.y);
    if (d < RADIUS) {
      e.hp -= DAMAGE;
      e.hitFlash = 0.3;
      spawnDamageNumber(e.x, e.y - 10, DAMAGE, NEON_RED);
      spawnParticles(e.x, e.y, NEON_RED, 5, 60, 0.3);
    }
  }

  state.enemyBullets = [];
}

/** Transition to a new room */
function enterRoom(dir) {
  const room = getCurrentRoom();
  if (!room || !room.neighbors[dir]) return;

  const neighbor = room.neighbors[dir];
  state.currentRoom = { x: neighbor.gridX, y: neighbor.gridY };

  state.visitedRooms.add(`${neighbor.gridX},${neighbor.gridY}`);

  const entry = getDoorEntryPoint(oppositeDir(dir));
  state.player.x = entry.x;
  state.player.y = entry.y;

  if (!neighbor.cleared) {
    state.doorsOpen = false;
    state.roomCleared = false;
  } else {
    state.doorsOpen = true;
    state.roomCleared = true;
  }

  state.bullets = [];
  state.enemyBullets = [];
  state.particles = [];

  // Spawn room content via main.js bridge (avoids circular imports)
  if (!neighbor.spawned && neighbor.type === 'combat') {
    neighbor.spawned = true;
    state.enemies = [];
    const count = neighbor.enemyCount || 3;
    for (let i = 0; i < count; i++) {
      const type = neighbor.enemyTypes[Math.floor(Math.random() * neighbor.enemyTypes.length)];
      const pos = getSpawnPosition();
      state.enemies.push(window.__enemies_spawnEnemy(type, pos.x, pos.y, state.floor));
    }
  } else if (neighbor.type === 'boss' && !neighbor.spawned) {
    neighbor.spawned = true;
    state.enemies = [window.__enemies_spawnEnemy('boss', ROOM_WIDTH / 2, ROOM_HEIGHT / 3, state.floor)];
  } else if (neighbor.type === 'treasure' && !neighbor.powerupsSpawned) {
    neighbor.powerupsSpawned = true;
    state.enemies = [];
    state.powerups = [];
    state.powerups.push(window.__powerups_spawnPowerup('random', ROOM_WIDTH / 2, ROOM_HEIGHT / 2));
    state.powerups.push(window.__powerups_spawnPowerup('gold', ROOM_WIDTH / 2 - 40, ROOM_HEIGHT / 2));
  } else if (neighbor.type === 'rest' && !neighbor.powerupsSpawned) {
    neighbor.powerupsSpawned = true;
    state.enemies = [];
    state.powerups = [];
    state.powerups.push(window.__powerups_spawnPowerup('health', ROOM_WIDTH / 2, ROOM_HEIGHT / 2));
    spawnParticles(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, NEON_GREEN, 10, 40, 0.5);
  } else {
    state.enemies = [];
    state.powerups = [];
  }
}

/** Get a random spawn position within the room (not in walls, not near player) */
function getSpawnPosition() {
  const pad = 64;  // stay away from walls
  const wallPad = WALL_THICKNESS * 32 + 20;  // TILE_SIZE=32, WALL_THICKNESS=1
  let x, y;
  let attempts = 0;
  do {
    x = wallPad + Math.random() * (ROOM_WIDTH - wallPad * 2);
    y = wallPad + Math.random() * (ROOM_HEIGHT - wallPad * 2);
    attempts++;
    // Also check not too close to player
    const distToPlayer = dist(x, y, state.player.x, state.player.y);
    if (!isWallAt(x, y, 20) && distToPlayer > 80) break;
  } while (attempts < 30);
  return { x, y };
}

// ============================================================
// Bullets
// ============================================================

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (b.life <= 0 || isWallAt(b.x, b.y, b.size)) {
      spawnParticles(b.x, b.y, b.color, 3, 30, 0.2);
      state.bullets.splice(i, 1);
    }
  }

  for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
    const b = state.enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (b.life <= 0 || isWallAt(b.x, b.y, b.size)) {
      spawnParticles(b.x, b.y, b.color || NEON_RED, 3, 30, 0.2);
      state.enemyBullets.splice(i, 1);
    }
  }
}

// ============================================================
// Rendering
// ============================================================

export function drawPlayer(ctx) {
  const p = state.player;

  // --- Trail ---
  for (const t of p.trail) {
    ctx.globalAlpha = t.alpha * 0.3;
    ctx.fillStyle = NEON_BLUE;
    ctx.beginPath();
    ctx.arc(t.x, t.y, PLAYER_SIZE * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // --- Invincibility blink ---
  if (p.invincible && Math.floor(state.time * 15) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  // --- Player body ---
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.facing);

  // Weapon level affects player color
  const playerColor = p.weaponLevel >= 5 ? NEON_PURPLE :
                      p.weaponLevel >= 3 ? NEON_GREEN : NEON_BLUE;
  ctx.shadowColor = playerColor;
  ctx.shadowBlur = 15 + p.weaponLevel * 3;

  ctx.fillStyle = p.damageFlash > 0 ? NEON_RED : playerColor;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-10, -10);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Weapon level indicator (small dots)
  if (p.weaponLevel > 1) {
    ctx.fillStyle = NEON_YELLOW;
    ctx.shadowBlur = 0;
    for (let i = 0; i < p.weaponLevel - 1; i++) {
      ctx.beginPath();
      ctx.arc(-4 - i * 4, -14, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.shadowBlur = 0;
  ctx.restore();
  ctx.globalAlpha = 1;

  // --- Shield orb ---
  if (p.shield) {
    ctx.save();
    ctx.translate(p.x, p.y);
    const shieldPulse = 1 + Math.sin(state.time * 5) * 0.05;
    ctx.scale(shieldPulse, shieldPulse);

    const shieldAlpha = Math.min(p.shieldTimer / 2, 0.35);
    ctx.globalAlpha = shieldAlpha;
    ctx.fillStyle = NEON_BLUE;
    ctx.shadowColor = NEON_BLUE;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_SIZE + 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = shieldAlpha + 0.3;
    ctx.strokeStyle = NEON_BLUE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_SIZE + 10, 0, Math.PI * 2);
    ctx.stroke();

    // Shield timer ring
    const shieldFrac = p.shieldTimer / p.shieldMaxTime;
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = NEON_BLUE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_SIZE + 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * shieldFrac);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // --- Powerup glow aura ---
  if (p.powerupGlow > 0) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = p.powerupGlow * 0.4;
    ctx.fillStyle = NEON_YELLOW;
    ctx.shadowColor = NEON_YELLOW;
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_SIZE + 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // --- Weapon level-up flash ---
  if (p.levelUpFlash > 0) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = p.levelUpFlash * 0.5;
    ctx.strokeStyle = NEON_PURPLE;
    ctx.lineWidth = 3;
    ctx.shadowColor = NEON_PURPLE;
    ctx.shadowBlur = 15;
    const ring = PLAYER_SIZE + 25 + (1.5 - p.levelUpFlash) * 30;
    ctx.beginPath();
    ctx.arc(0, 0, ring, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // --- Speed boost particles ---
  if (p.speedBoost && Math.random() < 0.3) {
    spawnParticles(p.x, p.y, NEON_YELLOW, 1, 20, 0.2);
  }

  // --- Berserk aura ---
  if (p.berserk) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = 0.15 + Math.sin(state.time * 8) * 0.1;
    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_SIZE + 22 + Math.sin(state.time * 6) * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.globalAlpha = 1;

    // Berserk particles
    if (Math.random() < 0.4) {
      spawnParticles(p.x + randRange(-15, 15), p.y + randRange(-15, 15), '#ff4444', 1, 30, 0.3);
    }
  }

  // --- Orbitals ---
  if (p.orbitals > 0) {
    for (let oi = 0; oi < p.orbitals; oi++) {
      const oAngle = p.orbitalAngle + (Math.PI * 2 / p.orbitals) * oi;
      const ox = p.x + Math.cos(oAngle) * p.orbitalRadius;
      const oy = p.y + Math.sin(oAngle) * p.orbitalRadius;

      // Orbital trail
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#00ccff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.orbitalRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Orbital orb
      ctx.save();
      ctx.translate(ox, oy);
      ctx.fillStyle = '#00ccff';
      ctx.shadowColor = '#00ccff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      // Inner glow
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  // --- Time Slow visual effect ---
  if (p.timeSlow) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = 0.1 + Math.sin(state.time * 3) * 0.05;
    ctx.strokeStyle = '#aaaaff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#aaaaff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_SIZE + 30 + Math.sin(state.time * 2) * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // --- Chain Lightning indicator ---
  if (p.chainLightning) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = 0.3 + Math.sin(state.time * 10) * 0.2;
    ctx.strokeStyle = '#44ffff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#44ffff';
    ctx.shadowBlur = 10;
    // Small lightning bolts around player
    for (let li = 0; li < 4; li++) {
      const la = state.time * 3 + li * Math.PI / 2;
      const lr = PLAYER_SIZE + 6;
      const lx = Math.cos(la) * lr;
      const ly = Math.sin(la) * lr;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + randRange(-4, 4), ly + randRange(-4, 4));
      ctx.lineTo(lx + randRange(-6, 6), ly + randRange(-6, 6));
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // --- Melee attack arc (scaled by weapon level) ---
  if (p.attacking) {
    const progress = 1 - (p.attackTimer / ATTACK_DURATION);
    const swingAngle = p.facing - ATTACK_ARC / 2 + ATTACK_ARC * progress;
    const meleeRange = ATTACK_RANGE * (p.meleeRange || 1.0);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.strokeStyle = p.weaponLevel >= 4 ? NEON_PURPLE : NEON_YELLOW;
    ctx.lineWidth = 2 + p.weaponLevel;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10 + p.weaponLevel * 3;

    ctx.beginPath();
    ctx.arc(0, 0, meleeRange, p.facing - ATTACK_ARC / 2, swingAngle);
    ctx.stroke();

    // Sword tip
    const tipX = Math.cos(swingAngle) * meleeRange;
    const tipY = Math.sin(swingAngle) * meleeRange;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(tipX, tipY, 3 + p.weaponLevel, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // --- Readability ring ---
  ctx.strokeStyle = `rgba(0, 212, 255, 0.15)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER_SIZE + 4 + Math.sin(state.time * 3) * 2, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawBullets(ctx) {
  for (const b of state.bullets) {
    ctx.fillStyle = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(b.x - b.vx * 0.01, b.y - b.vy * 0.01, b.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const b of state.enemyBullets) {
    const color = b.color || NEON_RED;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.shadowBlur = 0;
}

/** Deal damage to the player – shield absorbs first */
export function damagePlayer(amount) {
  const p = state.player;
  if (p.invincible || p.dashing) return;

  // Shield absorbs damage
  if (p.shield) {
    p.shieldHits++;
    p.shieldTimer -= 2;  // each hit shortens shield by 2s
    spawnParticles(p.x, p.y, NEON_BLUE, 10, 60, 0.4);
    window.__effects.spawnDamageNumber(p.x, p.y - 20, 'BLOCKED!', NEON_BLUE);
    shakeCamera(3);
    // If shield is still up, absorb the hit
    if (p.shieldTimer > 0 && p.shieldHits < 3) return;
    // Shield breaks
    p.shield = false;
    p.shieldTimer = 0;
    spawnParticles(p.x, p.y, NEON_BLUE, 15, 80, 0.5);
    window.__effects.spawnDamageNumber(p.x, p.y - 30, 'SHIELD BROKEN!', NEON_RED);
  }

  p.hp -= amount;
  p.invincible = true;
  p.invincibleTimer = INVINCIBLE_TIME;
  p.damageFlash = 1;
  shakeCamera(8);
  state.screenFlash = 0.15;
  state.flashColor = NEON_RED;

  spawnParticles(p.x, p.y, NEON_RED, 12, 80, 0.5);

  if (p.hp <= 0) {
    // Extra life?
    if (p.lives > 0) {
      p.lives--;
      p.hp = p.maxHp;
      p.invincible = true;
      p.invincibleTimer = 2.0;
      state.screenFlash = 0.5;
      state.flashColor = '#ff66aa';
      spawnParticles(p.x, p.y, '#ff66aa', 30, 120, 0.8);
      window.__effects.spawnDamageNumber(p.x, p.y - 30, 'EXTRA LEBEN!', '#ff66aa');
      shakeCamera(10);
      // Clear enemy bullets on revive
      state.enemyBullets = [];
    } else {
      p.hp = 0;
      state.screen = 'gameover';
      state.running = false;
      spawnParticles(p.x, p.y, NEON_RED, 40, 120, 1.0);
    }
  }
}

/** Heal the player */
export function healPlayer(amount) {
  const p = state.player;
  p.hp = Math.min(p.hp + amount, p.maxHp);
  spawnParticles(p.x, p.y, NEON_GREEN, 10, 50, 0.5);
  spawnDamageNumber(p.x, p.y - 20, '+' + amount, NEON_GREEN);
}
