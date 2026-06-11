// ============================================================
// RIFT CRAWLER – Powerup System (Extended)
// ============================================================

import {
  NEON_GREEN, NEON_YELLOW, NEON_RED, NEON_BLUE, NEON_PURPLE, NEON_ORANGE,
  ROOM_WIDTH, ROOM_HEIGHT,
} from './config.js';
import { state } from './state.js';
import { weightedPick, randRange } from './utils.js';

// ============================================================
// Powerup Type Definitions
// ============================================================

const POWERUP_TYPES = [
  // --- Common ---
  { item: 'health',      weight: 20, color: NEON_RED,    label: '+HP',   desc: 'Heilt 2 HP' },
  { item: 'gold',        weight: 16, color: NEON_YELLOW, label: 'GOLD',  desc: '+10-25 Gold' },

  // --- Uncommon ---
  { item: 'shield',      weight: 8, color: NEON_BLUE,   label: 'SHLD',  desc: 'Schild fuer 8 Sek' },
  { item: 'speedBoost',  weight: 8, color: NEON_YELLOW, label: 'SPD',   desc: 'Schneller fuer 10s' },
  { item: 'bomb',        weight: 12, color: NEON_ORANGE, label: 'BMB',   desc: '+1 Bombe' },
  { item: 'orbital',     weight: 8, color: '#00ccff',   label: 'ORB',   desc: 'Orbitalkugel!' },
  { item: 'berserk',     weight: 6,  color: '#ff4444',   label: 'BSRK',  desc: 'Berserker!' },

  // --- Weapons (R key) ---
  { item: 'laser',       weight: 5,  color: '#ff0066',   label: 'LASER', desc: 'Laser Lanze x5' },
  { item: 'rocket',      weight: 5,  color: '#ff8800',   label: 'RAKET', desc: 'Raketenwerfer x3' },
  { item: 'flamethrower', weight: 5,  color: '#ff4400',  label: 'FEUER', desc: 'Flammenwerfer x8' },
  { item: 'lightningBolt', weight: 4, color: '#ffff00',  label: 'BLITZ', desc: 'Blitzschlag x4' },

  // --- Rare ---
  { item: 'extraLife',   weight: 3,  color: '#ff66aa',   label: '1UP',   desc: 'Extra Leben!' },
  { item: 'weaponUp',    weight: 6,  color: NEON_PURPLE, label: 'WPN+',  desc: 'Waffen-Upgrade' },
  { item: 'maxHealth',   weight: 4,  color: '#ff4488',   label: '+MAX',  desc: '+1 Max HP' },
  { item: 'timeSlow',    weight: 4,  color: '#aaaaff',   label: 'SLOW',  desc: 'Zeitlupe 8s' },
  { item: 'chainLightning', weight: 3, color: '#44ffff', label: 'CHN',   desc: 'Kettenblitz!' },
  { item: 'magnet',      weight: 6,  color: '#88ffcc',   label: 'MAG',   desc: 'Magnet fuer 15s' },

  // --- Legendary ---
  { item: 'nuke',        weight: 2,  color: '#ffffff',   label: 'NUKE',  desc: 'Alles explodiert!' },
];

/**
 * Spawn a powerup at (x, y).
 * @param {string} type – 'random' for weighted random, or specific type
 */
export function spawnPowerup(type, x, y) {
  if (type === 'random') {
    const itemName = weightedPick(POWERUP_TYPES);   // returns string like 'orbital'
    const def = POWERUP_TYPES.find(p => p.item === itemName);
    return createPowerup(def || POWERUP_TYPES[0], x, y);
  }
  // Find specific type definition
  const def = POWERUP_TYPES.find(p => p.item === type);
  if (def) return createPowerup(def, x, y);
  // Fallbacks
  if (type === 'gold') return createPowerup({ item: 'gold', color: NEON_YELLOW, label: 'GOLD', desc: '+Gold' }, x, y);
  if (type === 'health') return createPowerup({ item: 'health', color: NEON_RED, label: '+HP', desc: '+HP' }, x, y);
  return createPowerup(POWERUP_TYPES[0], x, y);
}

function createPowerup(def, x, y) {
  const isRare = ['nuke', 'extraLife', 'weaponUp', 'chainLightning', 'timeSlow', 'laser', 'rocket', 'flamethrower', 'lightningBolt'].includes(def.item);
  return {
    x, y,
    effect: def.item,
    color: def.color,
    label: def.label,
    desc: def.desc || '',
    value: def.item === 'gold' ? 10 + Math.floor(Math.random() * 16) : 0,
    size: isRare ? 15 : 12,
    animTimer: Math.random() * Math.PI * 2,
    magnetRange: 0,           // will use player magnet range
    magnetSpeed: 250,
    isRare,
    sparkTimer: 0,
  };
}

// ============================================================
// Update
// ============================================================

export function updatePowerups(dt) {
  const p = state.player;
  const magnetRange = p.magnetRange || 60;

  for (const pw of state.powerups) {
    pw.animTimer += dt * 3;
    pw.sparkTimer += dt;

    // Magnetic pull toward player
    const dx = p.x - pw.x;
    const dy = p.y - pw.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d < magnetRange && d > 1) {
      const pull = pw.magnetSpeed * (1 - d / magnetRange) * dt;
      pw.x += (dx / d) * pull;
      pw.y += (dy / d) * pull;
    }

    // Rare powerup sparkle
    if (pw.isRare && Math.random() < 0.1) {
      window.__effects.spawnParticles(pw.x, pw.y, pw.color, 1, 20, 0.3);
    }
  }
}

// ============================================================
// Apply powerup effects
// ============================================================

export function applyPowerupEffect(pw) {
  const p = state.player;

  window.__effects.spawnParticles(pw.x, pw.y, pw.color, 12, 60, 0.5);

  switch (pw.effect) {
    case 'health':
      p.hp = Math.min(p.hp + 2, p.maxHp);
      window.__effects.spawnDamageNumber(p.x, p.y - 20, '+2 HP', NEON_RED);
      break;

    case 'maxHealth':
      p.maxHp += 1;
      p.hp = Math.min(p.hp + 2, p.maxHp);
      window.__effects.spawnDamageNumber(p.x, p.y - 20, '+MAX HP!', '#ff4488');
      p.powerupGlow = 1.0;
      break;

    case 'shield':
      p.shield = true;
      p.shieldTimer = p.shieldMaxTime;
      p.shieldHits = 0;
      window.__effects.spawnDamageNumber(p.x, p.y - 20, 'SHIELD!', NEON_BLUE);
      p.powerupGlow = 1.0;
      break;

    case 'speedBoost':
      p.speedBoost = true;
      p.speedBoostTimer = 10;
      p.speed = 260; // boosted speed
      window.__effects.spawnDamageNumber(p.x, p.y - 20, 'SPEED!', NEON_YELLOW);
      break;

    case 'bomb':
      p.bombs += 1;
      window.__effects.spawnDamageNumber(p.x, p.y - 20, '+BOMBE', NEON_ORANGE);
      break;

    case 'extraLife':
      p.lives += 1;
      window.__effects.spawnDamageNumber(p.x, p.y - 20, '+1 UP!', '#ff66aa');
      p.powerupGlow = 1.5;
      window.__camera.shakeCamera(5);
      state.screenFlash = 0.2;
      state.flashColor = '#ff66aa';
      break;

    case 'weaponUp':
      if (p.weaponLevel < 5) {
        p.weaponLevel++;
        applyWeaponLevel(p);
        window.__effects.spawnDamageNumber(p.x, p.y - 20, 'WPN Lv' + p.weaponLevel + '!', NEON_PURPLE);
        p.levelUpFlash = 1.5;
        p.powerupGlow = 1.0;
        window.__camera.shakeCamera(6);
      } else {
        // Max level – give gold instead
        p.gold += 25;
        window.__effects.spawnDamageNumber(p.x, p.y - 20, '+25G', NEON_YELLOW);
      }
      break;

    case 'magnet':
      p.magnetRange = 200;
      // Auto-deactivate after 15s (handled in player update)
      window.__effects.spawnDamageNumber(p.x, p.y - 20, 'MAGNET!', '#88ffcc');
      break;

    case 'orbital':
      p.orbitals = Math.min(p.orbitals + 1, 5);  // max 5 orbitals
      p.orbitalAngle = 0;
      window.__effects.spawnDamageNumber(p.x, p.y - 20, 'ORBITAL!', '#00ccff');
      p.powerupGlow = 1.0;
      break;

    case 'timeSlow':
      p.timeSlow = true;
      p.timeSlowTimer = p.timeSlowMaxTime;
      state.slowMotion = 0.4;  // slow enemies to 40% speed
      window.__effects.spawnDamageNumber(p.x, p.y - 20, 'ZEITLUPEN!', '#aaaaff');
      p.powerupGlow = 1.0;
      window.__camera.shakeCamera(5);
      break;

    case 'berserk':
      p.berserk = true;
      p.berserkTimer = p.berserkMaxTime;
      p.meleeDamage *= 2;
      p.bulletDamage *= 2;
      window.__effects.spawnDamageNumber(p.x, p.y - 20, 'BERSERKER!', '#ff4444');
      p.powerupGlow = 1.5;
      window.__camera.shakeCamera(8);
      state.screenFlash = 0.3;
      state.flashColor = '#ff4444';
      break;

    case 'chainLightning':
      p.chainLightning = true;
      p.chainLightningTimer = p.chainLightningMaxTime;
      window.__effects.spawnDamageNumber(p.x, p.y - 20, 'KETTENBLITZ!', '#44ffff');
      p.powerupGlow = 1.0;
      window.__camera.shakeCamera(5);
      break;

    // --- Special Weapons (R key) ---
    case 'laser':
      p.specialWeapon = 'laser';
      p.specialAmmo += 5;
      window.__effects.spawnDamageNumber(p.x, p.y - 20, 'LASER LANZE!', '#ff0066');
      p.powerupGlow = 1.5;
      window.__camera.shakeCamera(6);
      state.screenFlash = 0.2;
      state.flashColor = '#ff0066';
      break;

    case 'rocket':
      p.specialWeapon = 'rocket';
      p.specialAmmo += 3;
      window.__effects.spawnDamageNumber(p.x, p.y - 20, 'RAKETENWERFER!', '#ff8800');
      p.powerupGlow = 1.5;
      window.__camera.shakeCamera(6);
      break;

    case 'flamethrower':
      p.specialWeapon = 'flamethrower';
      p.specialAmmo += 8;
      window.__effects.spawnDamageNumber(p.x, p.y - 20, 'FLAMMENWERFER!', '#ff4400');
      p.powerupGlow = 1.5;
      window.__camera.shakeCamera(4);
      state.screenFlash = 0.15;
      state.flashColor = '#ff4400';
      break;

    case 'lightningBolt':
      p.specialWeapon = 'lightningBolt';
      p.specialAmmo += 4;
      window.__effects.spawnDamageNumber(p.x, p.y - 20, 'BLITZSCHLAG!', '#ffff00');
      p.powerupGlow = 1.5;
      window.__camera.shakeCamera(8);
      state.screenFlash = 0.2;
      state.flashColor = '#ffff00';
      break;

    case 'nuke':
      // KILL EVERYTHING in the room
      window.__camera.shakeCamera(20);
      state.screenFlash = 0.6;
      state.flashColor = '#ffffff';
      for (const e of state.enemies) {
        e.hp = 0;
        e.alive = false;
        window.__effects.spawnParticles(e.x, e.y, '#ffffff', 15, 100, 0.6);
      }
      state.enemyBullets = [];
      window.__effects.spawnParticles(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, '#ffffff', 40, 200, 1.0);
      window.__effects.spawnDamageNumber(p.x, p.y - 30, 'NUKE!', '#ffffff');
      break;

    case 'gold':
      const amount = pw.value || 10;
      p.gold += amount;
      state.score += amount;
      window.__effects.spawnDamageNumber(p.x, p.y - 20, '+' + amount + 'G', NEON_YELLOW);
      break;
  }
}

/** Apply weapon level bonuses */
function applyWeaponLevel(p) {
  switch (p.weaponLevel) {
    case 1:
      p.meleeDamage = 2; p.bulletDamage = 1; p.bulletCount = 1; p.bulletPiercing = false; p.meleeRange = 1.0;
      break;
    case 2:
      p.meleeDamage = 3; p.bulletDamage = 1; p.bulletCount = 2; p.bulletPiercing = false; p.meleeRange = 1.1;
      break;
    case 3:
      p.meleeDamage = 3; p.bulletDamage = 2; p.bulletCount = 2; p.bulletPiercing = false; p.meleeRange = 1.2;
      break;
    case 4:
      p.meleeDamage = 4; p.bulletDamage = 2; p.bulletCount = 3; p.bulletPiercing = false; p.meleeRange = 1.3;
      break;
    case 5:
      p.meleeDamage = 5; p.bulletDamage = 3; p.bulletCount = 3; p.bulletPiercing = true; p.meleeRange = 1.5;
      break;
  }
}

// ============================================================
// Rendering
// ============================================================

export function drawPowerups(ctx) {
  for (const pw of state.powerups) {
    ctx.save();
    ctx.translate(pw.x, pw.y);

    const bob = Math.sin(pw.animTimer) * 5;
    ctx.translate(0, bob);

    // Outer glow pulse for rare items
    if (pw.isRare) {
      const pulse = 0.3 + Math.sin(pw.animTimer * 2) * 0.15;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = pw.color;
      ctx.beginPath();
      ctx.arc(0, 0, pw.size + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Diamond shape
    ctx.shadowColor = pw.color;
    ctx.shadowBlur = pw.isRare ? 18 : 10;
    ctx.fillStyle = pw.color;
    ctx.rotate(Math.PI / 4);
    const s = pw.size * (pw.isRare ? 0.8 : 0.6);
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.rotate(-Math.PI / 4);

    // Inner highlight
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, pw.size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Label
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = pw.isRare ? 'bold 10px monospace' : 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(pw.label, 0, pw.size + 12);

    ctx.restore();
  }
}
