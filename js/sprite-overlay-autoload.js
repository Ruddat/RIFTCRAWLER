// ============================================================
// RIFT CRAWLER – Sprite Overlay Autoload
// ============================================================
// Transitional sprite layer. It draws only character sprites over the primitive
// player/enemy fallback renderer. Before drawing the sprites it masks the old
// primitive character fallback at the same positions so characters are not drawn
// twice.

import { ROOM_OFFSET_X, ROOM_OFFSET_Y, ROOM_WIDTH, ROOM_HEIGHT } from './config.js';
import { loadSprites, sprites } from './sprites.js';
import { drawSpriteOverlay } from './sprite-renderer.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas?.getContext('2d');

let started = false;

loadSprites().then(() => {
  started = true;
  window.__spriteOverlayReady = true;
});

function overlayLoop() {
  requestAnimationFrame(overlayLoop);

  if (!started || !sprites.ready || !ctx || !window.__state) return;

  const state = window.__state;
  if (state.screen !== 'playing' || state.paused || state.floorTransition) return;

  ctx.save();
  ctx.translate(ROOM_OFFSET_X + state.camera.shakeX, ROOM_OFFSET_Y + state.camera.shakeY);

  maskPrimitiveCharacters(ctx, state);
  drawSpriteOverlay(ctx);

  ctx.restore();
}

function maskPrimitiveCharacters(ctx, state) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;

  // Player primitive fallback mask.
  if (state.player) {
    maskCharacterSpot(ctx, state.player.x, state.player.y, 42, 52, 0.92);
  }

  // Enemy primitive fallback masks.
  for (const enemy of state.enemies || []) {
    if (!enemy || enemy.hp <= 0) continue;
    const radius = Math.max(28, (enemy.size || 18) * 2.1);
    maskCharacterSpot(ctx, enemy.x, enemy.y, radius, radius * 1.15, enemy.type === 'boss' ? 0.72 : 0.88);
  }

  ctx.restore();
}

function maskCharacterSpot(ctx, x, y, rx, ry, alpha) {
  // Keep the mask compact and inside the playable room.
  const left = Math.max(0, x - rx);
  const top = Math.max(0, y - ry);
  const right = Math.min(ROOM_WIDTH, x + rx);
  const bottom = Math.min(ROOM_HEIGHT, y + ry);

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, right - left, bottom - top);
  ctx.clip();

  const grad = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  grad.addColorStop(0, `rgba(5, 9, 22, ${alpha})`);
  grad.addColorStop(0.62, `rgba(5, 9, 22, ${alpha * 0.72})`);
  grad.addColorStop(1, 'rgba(5, 9, 22, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

requestAnimationFrame(overlayLoop);
