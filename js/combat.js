// ============================================================
// RIFT CRAWLER – Combat & Collision System
// ============================================================

import {
  PLAYER_SIZE, ATTACK_RANGE, ATTACK_ARC,
  KNOCKBACK_FORCE, KNOCKBACK_DURATION,
  NEON_RED, NEON_YELLOW, NEON_PURPLE,
} from './config.js';
import { state } from './state.js';
import { dist, pointInArc } from './utils.js';
import { spawnParticles, spawnDamageNumber } from './effects.js';
import { shakeCamera } from './camera.js';
import { damagePlayer } from './player.js';

/**
 * Process all combat collisions each frame.
 */
export function updateCombat() {
  const p = state.player;
  const meleeRange = ATTACK_RANGE * (p.meleeRange || 1.0);

  // --- Player melee attack vs enemies ---
  if (p.attacking) {
    for (const e of state.enemies) {
      const d = dist(p.x, p.y, e.x, e.y);
      if (d > meleeRange + e.size) continue;
      if (!pointInArc(e.x, e.y, p.x, p.y, meleeRange + e.size, p.facing, ATTACK_ARC)) continue;
      if (e._meleeHit) continue;
      e._meleeHit = true;

      const dmg = p.meleeDamage || 2;
      e.hp -= dmg;
      e.hitFlash = 1;
      applyKnockback(e, p.facing, KNOCKBACK_FORCE);
      spawnParticles(e.x, e.y, NEON_YELLOW, 6 + p.weaponLevel, 60, 0.3);
      spawnDamageNumber(e.x, e.y - 10, dmg, NEON_YELLOW);
      shakeCamera(2 + p.weaponLevel);

      // Weapon level 3+ = cleave (hit multiple enemies)
      // Weapon level 5 = chance to crit
      if (p.weaponLevel >= 5 && Math.random() < 0.25) {
        const critDmg = Math.floor(dmg * 1.5);
        e.hp -= critDmg;
        spawnDamageNumber(e.x + 15, e.y - 20, 'CRIT! ' + critDmg, NEON_PURPLE);
        spawnParticles(e.x, e.y, NEON_PURPLE, 8, 80, 0.4);
        shakeCamera(5);
      }

      // Chain Lightning - hits jump to nearby enemies
      if (p.chainLightning) {
        chainLightningHit(e, dmg, p.chainRange, p.chainDamage);
      }
    }
  } else {
    for (const e of state.enemies) e._meleeHit = false;
  }

  // --- Player bullets vs enemies ---
  for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
    const b = state.bullets[bi];
    let hitSomething = false;
    for (const e of state.enemies) {
      if (dist(b.x, b.y, e.x, e.y) < b.size + e.size) {
        // Rocket explosion!
        if (b.isRocket) {
          const rDmg = b.rocketDamage || 5;
          const rRadius = b.rocketRadius || 100;
          spawnParticles(b.x, b.y, '#ff8800', 25, 120, 0.7);
          spawnParticles(b.x, b.y, NEON_RED, 15, 80, 0.5);
          spawnParticles(b.x, b.y, NEON_YELLOW, 10, 60, 0.4);
          shakeCamera(10);
          state.screenFlash = 0.3;
          state.flashColor = '#ff8800';
          spawnDamageNumber(b.x, b.y - 10, 'BOOM!', '#ff8800');
          // Area damage
          for (const ae of state.enemies) {
            const d = dist(b.x, b.y, ae.x, ae.y);
            if (d < rRadius) {
              const dmgScale = 1 - (d / rRadius) * 0.5;  // less damage at edge
              const finalDmg = Math.max(1, Math.floor(rDmg * dmgScale));
              ae.hp -= finalDmg;
              ae.hitFlash = 1;
              applyKnockback(ae, Math.atan2(ae.y - b.y, ae.x - b.x), KNOCKBACK_FORCE * 2);
              spawnDamageNumber(ae.x, ae.y - 10, finalDmg, '#ff8800');
            }
          }
          state.enemyBullets = state.enemyBullets.filter(eb => dist(b.x, b.y, eb.x, eb.y) > rRadius);
          hitSomething = true;
          break;
        }

        e.hp -= b.damage;
        e.hitFlash = 1;
        applyKnockback(e, Math.atan2(b.vy, b.vx), KNOCKBACK_FORCE * 0.6);
        spawnParticles(e.x, e.y, b.color, 4, 40, 0.25);
        spawnDamageNumber(e.x, e.y - 10, b.damage, b.color);
        shakeCamera(2);

        if (!b.piercing) {
          hitSomething = true;
          break;
        }
      }
    }
    if (hitSomething) state.bullets.splice(bi, 1);
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
      if (e.knockbackTimer > 0) continue;
      if (dist(e.x, e.y, p.x, p.y) < e.size + PLAYER_SIZE + 2) {
        damagePlayer(e.damage);
        break;
      }
    }
  }

  // --- Player vs powerups ---
  const pickupRange = PLAYER_SIZE + 20;  // larger pickup range
  for (let i = state.powerups.length - 1; i >= 0; i--) {
    const pw = state.powerups[i];
    if (dist(p.x, p.y, pw.x, pw.y) < pickupRange + pw.size) {
      // Use the new powerup system from powerups.js
      window.__powerups_applyEffect(pw);
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

  // --- Blood stains on enemy death ---
  for (const e of state.enemies) {
    if (e.hp <= 0 && !e._bloodStained) {
      e._bloodStained = true;
      if (window.__room_addBloodStain) {
        window.__room_addBloodStain(e.x, e.y);
      }
    }
  }
}

/** Apply knockback to an enemy */
function applyKnockback(e, angle, force) {
  e.knockbackX = Math.cos(angle) * force;
  e.knockbackY = Math.sin(angle) * force;
  e.knockbackTimer = KNOCKBACK_DURATION;
}

/** Chain Lightning - damage jumps from hit enemy to nearby enemies */
function chainLightningHit(sourceEnemy, baseDmg, range, dmgFraction) {
  const hit = new Set();
  hit.add(sourceEnemy);
  let current = sourceEnemy;
  let chainDmg = Math.max(1, Math.floor(baseDmg * dmgFraction));

  for (let chain = 0; chain < 4; chain++) {
    let nearest = null;
    let nearDist = range;
    for (const e of state.enemies) {
      if (hit.has(e) || e.hp <= 0) continue;
      const d = dist(current.x, current.y, e.x, e.y);
      if (d < nearDist) {
        nearDist = d;
        nearest = e;
      }
    }
    if (!nearest) break;

    hit.add(nearest);
    nearest.hp -= chainDmg;
    nearest.hitFlash = 1;
    spawnParticles(nearest.x, nearest.y, '#44ffff', 6, 50, 0.3);
    spawnDamageNumber(nearest.x, nearest.y - 10, chainDmg, '#44ffff');

    // Visual lightning line between current and nearest
    window.__effects.spawnParticles(
      (current.x + nearest.x) / 2,
      (current.y + nearest.y) / 2,
      '#44ffff', 3, 30, 0.2
    );

    chainDmg = Math.max(1, Math.floor(chainDmg * 0.7));
    current = nearest;
  }
}
