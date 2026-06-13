// ============================================================
// RIFT CRAWLER – Sprite Overlay Autoload
// ============================================================
// Transitional sprite layer. It draws only character sprites over the primitive
// player/enemy fallback renderer. It must not redraw bullets, powerups or generic
// effects because those belong to the main.js render stack.

import { ROOM_OFFSET_X, ROOM_OFFSET_Y } from './config.js';
import { loadSprites, sprites } from './sprites.js';
import { drawSpriteOverlay } from './sprite-renderer.js';

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
  ctx.restore();
}

requestAnimationFrame(overlayLoop);
