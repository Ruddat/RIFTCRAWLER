// ============================================================
// RIFT CRAWLER – Global Mutable Game State
// ============================================================

import { PLAYER_SPEED, PLAYER_MAX_HP, CANVAS_WIDTH, CANVAS_HEIGHT, ROOM_WIDTH, ROOM_HEIGHT, ROOM_OFFSET_X, ROOM_OFFSET_Y, DUNGEON_GRID, FLOORS_PER_RUN } from './config.js';

export const state = {
  // --- Game flow ---
  screen: 'title',       // 'title' | 'playing' | 'gameover' | 'victory'
  running: false,
  paused: false,
  dt: 0,
  time: 0,

  // --- Dungeon ---
  dungeon: null,
  currentRoom: { x: 3, y: 3 },
  floor: 1,
  roomsCleared: 0,

  // --- Player ---
  player: {
    x: ROOM_WIDTH / 2,
    y: ROOM_HEIGHT / 2,
    vx: 0,
    vy: 0,
    speed: PLAYER_SPEED,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    lives: 2,                // Extra-Leben (2 = 3 Versuche total)
    facing: 0,
    attacking: false,
    attackTimer: 0,
    attackCooldown: 0,
    shootCooldown: 0,
    invincible: false,
    invincibleTimer: 0,
    dashing: false,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirX: 0,
    dashDirY: 0,
    bombs: 3,
    keys: 0,
    gold: 0,
    trail: [],
    damageFlash: 0,

    // --- Shield ---
    shield: false,
    shieldTimer: 0,
    shieldMaxTime: 8,       // seconds
    shieldHits: 0,          // absorbed hits

    // --- Weapon upgrades ---
    weaponLevel: 1,         // 1-5, affects damage, range, bullet count
    bulletDamage: 1,
    bulletCount: 1,         // projectiles per shot
    bulletPiercing: false,
    meleeDamage: 2,
    meleeRange: 1.0,        // multiplier

    // --- Active timed buffs ---
    speedBoost: false,
    speedBoostTimer: 0,
    magnetRange: 0,         // 0 = off, >0 = active range

    // --- Orbital ---
    orbitals: 0,            // number of orbiting orbs
    orbitalAngle: 0,        // current rotation angle
    orbitalDamage: 2,       // damage per hit
    orbitalRadius: 50,      // orbit radius

    // --- Time Slow ---
    timeSlow: false,
    timeSlowTimer: 0,
    timeSlowMaxTime: 8,     // seconds

    // --- Berserk ---
    berserk: false,
    berserkTimer: 0,
    berserkMaxTime: 10,     // seconds

    // --- Chain Lightning ---
    chainLightning: false,
    chainLightningTimer: 0,
    chainLightningMaxTime: 15,  // seconds
    chainRange: 100,            // chain range in pixels
    chainDamage: 0.5,           // fraction of original damage

    // --- Special Weapon (R key) ---
    specialWeapon: null,        // null | 'laser' | 'rocket' | 'flamethrower' | 'lightningBolt'
    specialAmmo: 0,             // uses left
    specialCooldown: 0,         // cooldown between shots

    // --- Laser beam (active while firing) ---
    laserActive: false,
    laserAngle: 0,
    laserTimer: 0,

    // --- Visual ---
    powerupGlow: 0,         // timer for glow effect on pickup
    levelUpFlash: 0,        // timer for weapon level-up flash
  },

  // --- Entities (current room only) ---
  enemies: [],
  bullets: [],
  enemyBullets: [],
  particles: [],
  powerups: [],
  damageNumbers: [],

  // --- Room state ---
  roomCleared: false,
  doorsOpen: true,
  transitioning: false,
  transitionDir: null,
  transitionTimer: 0,
  transitionOffset: { x: 0, y: 0 },

  // --- Camera ---
  camera: {
    x: 0,
    y: 0,
    shake: 0,
    shakeX: 0,
    shakeY: 0,
  },

  // --- Score & combo ---
  score: 0,
  combo: 0,
  comboTimer: 0,
  maxCombo: 0,
  kills: 0,

  // --- Visual effects ---
  screenFlash: 0,
  flashColor: '#fff',
  slowMotion: 1.0,

  // --- Visited rooms for minimap ---
  visitedRooms: new Set(),

  // --- Floor transition ---
  floorTransition: false,
  floorTransitionTimer: 0,

  // --- Ambient atmosphere ---
  ambientParticles: [],       // floating dust/embers/fog particles
  ambientSpawnTimer: 0,       // timer for spawning new ambient particles
  bloodStains: [],            // dynamically added blood stains from kills

  // --- Input ---
  lastInputMode: 'keyboard',
};

/** Reset the entire game state for a new run. */
export function resetState() {
  state.screen = 'playing';
  state.running = true;
  state.paused = false;
  state.dt = 0;
  state.time = 0;
  state.floor = 1;
  state.roomsCleared = 0;
  state.score = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.maxCombo = 0;
  state.kills = 0;
  state.screenFlash = 0;
  state.slowMotion = 1.0;
  state.visitedRooms = new Set();
  state.floorTransition = false;
  state.floorTransitionTimer = 0;

  // Ambient
  state.ambientParticles = [];
  state.ambientSpawnTimer = 0;
  state.bloodStains = [];

  // Reset player
  const p = state.player;
  p.x = ROOM_WIDTH / 2;
  p.y = ROOM_HEIGHT / 2;
  p.vx = 0;
  p.vy = 0;
  p.speed = PLAYER_SPEED;
  p.hp = PLAYER_MAX_HP;
  p.maxHp = PLAYER_MAX_HP;
  p.lives = 2;
  p.facing = 0;
  p.attacking = false;
  p.attackTimer = 0;
  p.attackCooldown = 0;
  p.shootCooldown = 0;
  p.invincible = false;
  p.invincibleTimer = 0;
  p.dashing = false;
  p.dashTimer = 0;
  p.dashCooldown = 0;
  p.bombs = 3;
  p.keys = 0;
  p.gold = 0;
  p.trail = [];
  p.damageFlash = 0;

  // Shield
  p.shield = false;
  p.shieldTimer = 0;
  p.shieldHits = 0;

  // Weapon
  p.weaponLevel = 1;
  p.bulletDamage = 1;
  p.bulletCount = 1;
  p.bulletPiercing = false;
  p.meleeDamage = 2;
  p.meleeRange = 1.0;

  // Buffs
  p.speedBoost = false;
  p.speedBoostTimer = 0;
  p.magnetRange = 0;

  // Orbital
  p.orbitals = 0;
  p.orbitalAngle = 0;
  p.orbitalDamage = 2;
  p.orbitalRadius = 50;

  // Time Slow
  p.timeSlow = false;
  p.timeSlowTimer = 0;

  // Berserk
  p.berserk = false;
  p.berserkTimer = 0;

  // Chain Lightning
  p.chainLightning = false;
  p.chainLightningTimer = 0;

  // Special Weapon
  p.specialWeapon = null;
  p.specialAmmo = 0;
  p.specialCooldown = 0;
  p.laserActive = false;
  p.laserAngle = 0;
  p.laserTimer = 0;

  // Visual
  p.powerupGlow = 0;
  p.levelUpFlash = 0;

  // Clear entities
  state.enemies = [];
  state.bullets = [];
  state.enemyBullets = [];
  state.particles = [];
  state.powerups = [];
  state.damageNumbers = [];

  // Room
  state.roomCleared = false;
  state.doorsOpen = true;
  state.transitioning = false;
  state.transitionDir = null;
  state.transitionTimer = 0;
  state.transitionOffset = { x: 0, y: 0 };

  // Camera
  state.camera.x = 0;
  state.camera.y = 0;
  state.camera.shake = 0;
  state.camera.shakeX = 0;
  state.camera.shakeY = 0;
}
