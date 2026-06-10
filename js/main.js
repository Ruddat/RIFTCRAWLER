// ============================================================
// RIFT CRAWLER – Main Game Loop & Entry Point
// ============================================================

import {
  CANVAS_WIDTH, CANVAS_HEIGHT, DARK_BG, NEON_BLUE, NEON_GREEN, NEON_RED,
  NEON_YELLOW, NEON_PURPLE, ROOM_WIDTH, ROOM_HEIGHT, FLOORS_PER_RUN,
  ROOM_OFFSET_X, ROOM_OFFSET_Y,
} from './config.js';
import { state, resetState } from './state.js';
import { initInput, getMovement, consumePause, consumeFullscreen, consumeStart, isKeyDown } from './input.js';
import { generateDungeon, getRoomAt, advanceFloor } from './dungeon.js';
import { drawRoom, getCurrentRoom, getDoorEntryPoint, oppositeDir } from './room.js';
import { updateCamera, applyCamera, shakeCamera } from './camera.js';
import { updatePlayer, drawPlayer, drawBullets, damagePlayer, healPlayer } from './player.js';
import { spawnEnemy, updateEnemies, drawEnemies } from './enemies.js';
import { updateCombat } from './combat.js';
import { updateEffects, drawEffects, spawnParticles, spawnDamageNumber, spawnRing } from './effects.js';
import { spawnPowerup, updatePowerups, drawPowerups } from './powerups.js';
import { drawHud } from './hud.js';
import { initAudio, playSfx, startMusic, stopMusic } from './audio.js';
import { clamp, randRange } from './utils.js';

// --- Expose modules for circular-dependency workarounds ---
window.__effects = { spawnParticles, spawnDamageNumber, spawnRing };
window.__player = { damagePlayer, healPlayer };
window.__powerups = { spawnPowerup };
window.__camera = { shakeCamera };
window.__state = state;
window.__room_getCurrentRoom = getCurrentRoom;
window.__enemies_spawnEnemy = spawnEnemy;
window.__powerups_spawnPowerup = spawnPowerup;

// ============================================================
// Canvas Setup
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// ============================================================
// Init
// ============================================================

initInput();
initAudio();

let lastTime = 0;
let titleAnimTimer = 0;

// ============================================================
// Game Loop
// ============================================================

function loop(time) {
  requestAnimationFrame(loop);

  // Delta time (capped at 33ms to avoid spiral of death)
  const dt = Math.min((time - lastTime) / 1000, 0.033);
  lastTime = time;
  state.dt = dt;
  state.time += dt;

  // --- Fullscreen ---
  if (consumeFullscreen()) toggleFullscreen();

  // --- Screen routing ---
  switch (state.screen) {
    case 'title':
      updateTitle(dt);
      renderTitle();
      break;
    case 'playing':
      updateGame(dt);
      renderGame();
      break;
    case 'gameover':
      updateGameOver(dt);
      renderGameOver();
      break;
    case 'victory':
      updateVictory(dt);
      renderVictory();
      break;
  }
}

// ============================================================
// Title Screen
// ============================================================

function updateTitle(dt) {
  titleAnimTimer += dt;
  if (consumeStart()) {
    startNewGame();
  }
}

function renderTitle() {
  // Background
  ctx.fillStyle = DARK_BG;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Animated stars
  drawTitleStars();

  // Title text
  ctx.save();
  ctx.textAlign = 'center';

  // "RIFT" – large
  ctx.fillStyle = NEON_BLUE;
  ctx.shadowColor = NEON_BLUE;
  ctx.shadowBlur = 30;
  ctx.font = 'bold 72px monospace';
  ctx.fillText('RIFT', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

  // "CRAWLER" – accent
  ctx.fillStyle = NEON_RED;
  ctx.shadowColor = NEON_RED;
  ctx.shadowBlur = 30;
  ctx.font = 'bold 56px monospace';
  ctx.fillText('CRAWLER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);

  ctx.shadowBlur = 0;

  // Subtitle
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '14px monospace';
  ctx.fillText('Ein Roguelike Dungeon Crawler', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);

  // Start prompt
  const blink = Math.sin(titleAnimTimer * 3) > 0;
  if (blink) {
    ctx.fillStyle = NEON_GREEN;
    ctx.shadowColor = NEON_GREEN;
    ctx.shadowBlur = 8;
    ctx.font = 'bold 18px monospace';
    ctx.fillText('ENTER / LEERTASTE – SPIEL STARTEN', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 120);
    ctx.shadowBlur = 0;
  }

  // Controls
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '12px monospace';
  const y = CANVAS_HEIGHT / 2 + 170;
  ctx.fillText('WASD / Pfeiltasten – Bewegen', CANVAS_WIDTH / 2, y);
  ctx.fillText('LEERTASTE – Schwertangriff', CANVAS_WIDTH / 2, y + 18);
  ctx.fillText('E – Schießen    Q – Bombe    SHIFT – Dash', CANVAS_WIDTH / 2, y + 36);
  ctx.fillText('P – Pause    F – Vollbild', CANVAS_WIDTH / 2, y + 54);

  ctx.restore();
}

function drawTitleStars() {
  // Simple animated starfield
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 80; i++) {
    const seed = i * 137.5;
    const x = (seed * 7.3 + titleAnimTimer * (5 + i * 0.3)) % CANVAS_WIDTH;
    const y = (seed * 3.7) % CANVAS_HEIGHT;
    const size = (i % 3 === 0) ? 2 : 1;
    const alpha = 0.3 + Math.sin(titleAnimTimer * 2 + i) * 0.2;
    ctx.globalAlpha = alpha;
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
}

// ============================================================
// Start New Game
// ============================================================

function startNewGame() {
  resetState();

  // Generate first floor dungeon
  state.dungeon = generateDungeon(state.floor);

  // Start at center room
  const start = state.dungeon.startRoom;
  state.currentRoom = { x: start.gridX, y: start.gridY };
  state.visitedRooms.add(`${start.gridX},${start.gridY}`);

  // Place player in center of start room
  state.player.x = ROOM_WIDTH / 2;
  state.player.y = ROOM_HEIGHT / 2;

  // Start room is safe – doors open
  state.doorsOpen = true;
  state.roomCleared = true;
  start.cleared = true;

  // No enemies in start room
  state.enemies = [];

  state.screen = 'playing';
  state.running = true;

  playSfx('powerup');
  startMusic();
}

// ============================================================
// Game Update
// ============================================================

function updateGame(dt) {
  if (consumePause()) {
    state.paused = !state.paused;
  }

  if (state.paused) return;

  // Slow motion
  const effectiveDt = dt * state.slowMotion;

  // Floor transition
  if (state.floorTransition) {
    state.floorTransitionTimer -= dt;
    if (state.floorTransitionTimer <= 0) {
      state.floorTransition = false;
      enterNextFloor();
    }
    return;
  }

  // Update systems
  updatePlayer(effectiveDt);
  updateEnemies(effectiveDt);
  updateCombat();
  updateEffects(effectiveDt);
  updatePowerups(effectiveDt);
  updateCamera(effectiveDt);

  // Check if boss was killed → advance floor
  checkFloorAdvance();
}

function checkFloorAdvance() {
  const room = getCurrentRoom();
  if (!room) return;

  if (room.type === 'boss' && room.cleared && state.enemies.length === 0 && !state.floorTransition) {
    if (state.floor < FLOORS_PER_RUN) {
      state.floorTransition = true;
      state.floorTransitionTimer = 2.0;
      playSfx('clear');
    }
  }
}

function enterNextFloor() {
  state.floor++;
  state.dungeon = generateDungeon(state.floor);

  const start = state.dungeon.startRoom;
  state.currentRoom = { x: start.gridX, y: start.gridY };
  state.visitedRooms = new Set();
  state.visitedRooms.add(`${start.gridX},${start.gridY}`);

  state.player.x = ROOM_WIDTH / 2;
  state.player.y = ROOM_HEIGHT / 2;

  state.doorsOpen = true;
  state.roomCleared = true;
  start.cleared = true;

  state.enemies = [];
  state.bullets = [];
  state.enemyBullets = [];
  state.particles = [];
  state.powerups = [];

  // Heal a bit on floor change
  state.player.hp = Math.min(state.player.hp + 1, state.player.maxHp);

  playSfx('powerup');
}

// ============================================================
// Game Render
// ============================================================

function renderGame() {
  // Clear
  ctx.fillStyle = DARK_BG;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (state.paused) {
    renderPauseScreen();
    return;
  }

  // Floor transition overlay
  if (state.floorTransition) {
    renderFloorTransition();
    return;
  }

  // Room (floor, walls, doors)
  drawRoom(ctx);

  // Game entities (within room coordinate space)
  ctx.save();
  applyCamera(ctx);

  drawPowerups(ctx);
  drawBullets(ctx);
  drawEnemies(ctx);
  drawPlayer(ctx);
  drawEffects(ctx);

  ctx.restore();

  // Screen flash
  if (state.screenFlash > 0) {
    ctx.globalAlpha = state.screenFlash;
    ctx.fillStyle = state.flashColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.globalAlpha = 1;
  }

  // HUD (screen-space)
  drawHud(ctx);

  // Dash cooldown indicator
  drawDashIndicator(ctx);
}

function drawDashIndicator(ctx) {
  const p = state.player;
  const x = 16;
  const y = CANVAS_HEIGHT - 30;

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(x, y, 60, 8);

  const cd = p.dashCooldown;
  const maxCd = 0.8; // DASH_COOLDOWN
  const ready = cd <= 0;

  ctx.fillStyle = ready ? NEON_BLUE : 'rgba(0, 212, 255, 0.3)';
  ctx.fillRect(x, y, 60 * (ready ? 1 : 1 - cd / maxCd), 8);

  ctx.fillStyle = '#fff';
  ctx.font = '8px monospace';
  ctx.fillText('DASH', x + 2, y + 7);
}

// ============================================================
// Pause Screen
// ============================================================

function renderPauseScreen() {
  // Still render the game underneath
  drawRoom(ctx);
  ctx.save();
  applyCamera(ctx);
  drawPowerups(ctx);
  drawBullets(ctx);
  drawEnemies(ctx);
  drawPlayer(ctx);
  drawEffects(ctx);
  ctx.restore();
  drawHud(ctx);

  // Overlay
  ctx.fillStyle = 'rgba(10, 10, 20, 0.7)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.textAlign = 'center';
  ctx.fillStyle = NEON_BLUE;
  ctx.shadowColor = NEON_BLUE;
  ctx.shadowBlur = 20;
  ctx.font = 'bold 48px monospace';
  ctx.fillText('PAUSE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '16px monospace';
  ctx.fillText('P – Fortsetzen    Q – Beenden', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
  ctx.textAlign = 'left';

  // Quit on Q while paused
  if (isKeyDown('KeyQ')) {
    state.screen = 'title';
    state.paused = false;
    stopMusic();
  }
}

// ============================================================
// Floor Transition
// ============================================================

function renderFloorTransition() {
  const t = state.floorTransitionTimer;
  const maxT = 2.0;
  const progress = 1 - (t / maxT);

  ctx.fillStyle = DARK_BG;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.textAlign = 'center';

  if (progress < 0.5) {
    // Fade out
    ctx.globalAlpha = progress * 2;
    ctx.fillStyle = NEON_GREEN;
    ctx.shadowColor = NEON_GREEN;
    ctx.shadowBlur = 15;
    ctx.font = 'bold 36px monospace';
    ctx.fillText(`ETAGE ${state.floor} GELÖST!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    ctx.shadowBlur = 0;
  } else {
    // Fade in next floor
    ctx.globalAlpha = (progress - 0.5) * 2;
    ctx.fillStyle = NEON_BLUE;
    ctx.shadowColor = NEON_BLUE;
    ctx.shadowBlur = 15;
    ctx.font = 'bold 36px monospace';
    ctx.fillText(`ETAGE ${state.floor + 1}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

    const themes = ['Krypta', 'Abgrund', 'Giftwald', 'Höllentor', 'Nexus'];
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '18px monospace';
    ctx.fillText(themes[state.floor % themes.length], CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    ctx.shadowBlur = 0;
  }

  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

// ============================================================
// Game Over Screen
// ============================================================

function updateGameOver(dt) {
  if (consumeStart()) {
    state.screen = 'title';
  }
}

function renderGameOver() {
  ctx.fillStyle = DARK_BG;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Death particles still rendering
  updateEffects(state.dt);
  ctx.save();
  drawEffects(ctx);
  ctx.restore();

  ctx.textAlign = 'center';

  ctx.fillStyle = NEON_RED;
  ctx.shadowColor = NEON_RED;
  ctx.shadowBlur = 25;
  ctx.font = 'bold 56px monospace';
  ctx.fillText('GEFALLEN', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#fff';
  ctx.font = '20px monospace';
  ctx.fillText(`Score: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  ctx.fillText(`Etage: ${state.floor}    Kills: ${state.kills}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
  ctx.fillText(`Max Combo: x${state.maxCombo}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);

  const blink = Math.sin(state.time * 3) > 0;
  if (blink) {
    ctx.fillStyle = NEON_YELLOW;
    ctx.font = '16px monospace';
    ctx.fillText('ENTER – Nochmal spielen', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 120);
  }

  ctx.textAlign = 'left';
}

// ============================================================
// Victory Screen
// ============================================================

function updateVictory(dt) {
  if (consumeStart()) {
    state.screen = 'title';
  }
}

function renderVictory() {
  ctx.fillStyle = DARK_BG;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Celebration particles
  if (Math.random() < 0.3) {
    const colors = [NEON_BLUE, NEON_GREEN, NEON_YELLOW, NEON_PURPLE];
    spawnParticles(
      randRange(100, CANVAS_WIDTH - 100),
      randRange(100, CANVAS_HEIGHT - 100),
      colors[Math.floor(Math.random() * colors.length)],
      3, 60, 0.5
    );
  }
  updateEffects(state.dt);
  drawEffects(ctx);

  ctx.textAlign = 'center';

  ctx.fillStyle = NEON_YELLOW;
  ctx.shadowColor = NEON_YELLOW;
  ctx.shadowBlur = 30;
  ctx.font = 'bold 52px monospace';
  ctx.fillText('SIEG!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);
  ctx.shadowBlur = 0;

  ctx.fillStyle = NEON_BLUE;
  ctx.font = '24px monospace';
  ctx.fillText('Der Rift wurde bezwungen!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

  ctx.fillStyle = '#fff';
  ctx.font = '20px monospace';
  ctx.fillText(`Endscore: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
  ctx.fillText(`Kills: ${state.kills}    Max Combo: x${state.maxCombo}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);

  const blink = Math.sin(state.time * 3) > 0;
  if (blink) {
    ctx.fillStyle = NEON_GREEN;
    ctx.font = '16px monospace';
    ctx.fillText('ENTER – Nochmal spielen', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 120);
  }

  ctx.textAlign = 'left';
}

// ============================================================
// Fullscreen
// ============================================================

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// ============================================================
// Start
// ============================================================

requestAnimationFrame(loop);
