// ============================================================
// RIFT CRAWLER – Sprite Overlay Autoload
// ============================================================
// Temporary bridge while sprites are not yet integrated directly into
// drawPlayer() and drawEnemies(). The overlay is followed by a redraw of
// readability-critical layers so projectiles, drops and effects stay visible.

import { ROOM_OFFSET_X, ROOM_OFFSET_Y } from './config.js';
import { loadSprites, sprites } from './sprites.js';
import { drawSpriteOverlay } from './sprite-renderer.js';
import { drawBullets } from './player.js';
import { drawPowerups } from './powerups.js';
import { drawEffects } from './effects.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas?.getContext('2d');

let started = false;

loadSprites().then(() => {
  started = true;
});

function overlayLoop() {
  requestAnimationFrame(overlayLoop);

  if (!started || !sprites.ready || !ctx || !window.__state) return;

  const state = window.__state;
  if (state.screen !== 'playing' || state.paused || state.floorTransition) return;

  ctx.save();
  ctx.translate(ROOM_OFFSET_X + state.camera.shakeX, ROOM_OFFSET_Y + state.camera.shakeY);

  drawSpriteOverlay(ctx);

  // Keep small gameplay-critical objects above the temporary sprite overlay.
  drawPowerups(ctx);
  drawBullets(ctx);
  drawEffects(ctx);

  ctx.restore();
}

requestAnimationFrame(overlayLoop);
