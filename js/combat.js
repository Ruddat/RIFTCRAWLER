// ============================================================
// RIFT CRAWLER – Combat & Collision System
// ============================================================

import {
  PLAYER_SIZE, ATTACK_RANGE, ATTACK_ARC,
  KNOCKBACK_FORCE, KNOCKBACK_DURATION,
  NEON_RED, NEON_YELLOW,
} from './config.js';
import { state } from './state.js';
import { dist, pointInArc } from './utils.js';
import { spawnParticles, spawnDamageNumber } from './effects.js';
import { shakeCamera } from './camera.js';
import { damagePlayer } from './player.js';

/**
 * Process all combat collisions each frame:
 *  - Player melee vs enemies
 *  - Player bullets vs enemies
 *  - Enemy bullets vs player
 *  - Enemy contact vs player
 */
export function updateCombat() {
  const p = state.player;

  // --- Player melee attack vs enemies ---
  if (p.attacking) {
    for (const e of state.enemies) {
      const d = dist(p.x, p.y, e.x, e.y);
      if (d > ATTACK_RANGE + e.size) continue;
      if (!pointInArc(e.x, e.y, p.x, p.y, ATTACK_RANGE + e.size, p.facing, ATTACK_ARC)) continue;
      // Only hit once per swing – track via flag
      if (e._meleeHit) continue;
      e._meleeHit = true;

      const dmg = 2;
      e.hp -= dmg;
      e.hitFlash = 1;
      applyKnockback(e, p.facing, KNOCKBACK_FORCE);
      spawnParticles(e.x, e.y, NEON_YELLOW, 6, 60, 0.3);
      spawnDamageNumber(e.x, e.y - 10, dmg, NEON_YELLOW);
      shakeCamera(3);
    }
  } else {
    // Reset melee hit flags
    for (const e of state.enemies) e._meleeHit = false;
  }

  // --- Player bullets vs enemies ---
  for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
    const b = state.bullets[bi];
    for (const e of state.enemies) {
      if (dist(b.x, b.y, e.x, e.y) < b.size + e.size) {
        e.hp -= b.damage;
        e.hitFlash = 1;
        applyKnockback(e, Math.atan2(b.vy, b.vx), KNOCKBACK_FORCE * 0.6);
        spawnParticles(e.x, e.y, b.color, 4, 40, 0.25);
        spawnDamageNumber(e.x, e.y - 10, b.damage, NEON_YELLOW);
        shakeCamera(2);

        if (!b.piercing) {
          state.bullets.splice(bi, 1);
          break;
        }
      }
    }
  }

  // --- Enemy bullets vs player ---
  if (!p.invincible && !p.dashing) {
    for (let bi = state.enemyBullets.length - 1; bi >= 0; bi--) {
      const b = state.enemyBullets[bi];
      if (dist(b.x, b.y, p.x, p.y) < b.size + PLAYER_SIZE) {
        damagePlayer(b.damage);
        state.enemyBullets.splice(bi, 1);
      }
    }
  }

  // --- Enemy contact damage ---
  if (!p.invincible && !p.dashing) {
    for (const e of state.enemies) {
      if (e.knockbackTimer > 0) continue; // knocked-back enemies don't deal contact
      if (dist(e.x, e.y, p.x, p.y) < e.size + PLAYER_SIZE + 2) {
        damagePlayer(e.damage);
        break;
      }
    }
  }

  // --- Player vs powerups ---
  for (let i = state.powerups.length - 1; i >= 0; i--) {
    const pw = state.powerups[i];
    if (dist(p.x, p.y, pw.x, pw.y) < PLAYER_SIZE + pw.size + 4) {
      applyPowerup(pw);
      state.powerups.splice(i, 1);
    }
  }

  // --- Combo timer ---
  if (state.comboTimer > 0) {
    state.comboTimer -= state.dt;
    if (state.comboTimer <= 0) {
      state.combo = 0;
    }
  }
}

/** Apply knockback to an enemy */
function applyKnockback(e, angle, force) {
  e.knockbackX = Math.cos(angle) * force;
  e.knockbackY = Math.sin(angle) * force;
  e.knockbackTimer = KNOCKBACK_DURATION;
}

/** Apply a powerup to the player */
function applyPowerup(pw) {
  const p = state.player;
  spawnParticles(pw.x, pw.y, pw.color, 10, 50, 0.4);

  switch (pw.effect) {
    case 'health':
      p.hp = Math.min(p.hp + 2, p.maxHp);
      spawnDamageNumber(p.x, p.y - 20, '+2 HP', pw.color);
      break;
    case 'maxHealth':
      p.maxHp += 1;
      p.hp = Math.min(p.hp + 1, p.maxHp);
      spawnDamageNumber(p.x, p.y - 20, '+MAX HP', pw.color);
      break;
    case 'speed':
      p.speed += 20;
      spawnDamageNumber(p.x, p.y - 20, '+SPEED', pw.color);
      break;
    case 'bomb':
      p.bombs += 1;
      spawnDamageNumber(p.x, p.y - 20, '+BOMB', pw.color);
      break;
    case 'damage':
      // Boost bullet damage
      spawnDamageNumber(p.x, p.y - 20, '+DMG', pw.color);
      break;
    case 'gold':
      const amount = pw.value || 10;
      p.gold += amount;
      spawnDamageNumber(p.x, p.y - 20, `+${amount}G`, pw.color);
      state.score += amount;
      break;
  }
}
