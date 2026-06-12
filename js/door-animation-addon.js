// ============================================================
// RIFT CRAWLER – Animated Door Overlay Addon
// ============================================================
// Visual-only bridge: lowers the top open door away from the HUD and gives
// open doors an animated portal/scanline treatment.

import {
  ROOM_WIDTH,
  ROOM_HEIGHT,
  ROOM_OFFSET_X,
  ROOM_OFFSET_Y,
  TILE_SIZE,
  DOOR_WIDTH,
  NEON_BLUE,
  NEON_GREEN,
} from './config.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas?.getContext('2d');

const TOP_DOOR_VISUAL_DROP = 42;
const WALL = TILE_SIZE;
const DOOR_PX = DOOR_WIDTH * TILE_SIZE;

function loop() {
  requestAnimationFrame(loop);

  const state = window.__state;
  if (!ctx || !state || state.screen !== 'playing' || state.paused || state.floorTransition) return;

  const room = window.__room_getCurrentRoom?.();
  if (!room || !state.doorsOpen) return;

  ctx.save();
  ctx.translate(ROOM_OFFSET_X + state.camera.shakeX, ROOM_OFFSET_Y + state.camera.shakeY);
  drawAnimatedOpenDoors(ctx, room, state.time);
  ctx.restore();
}

function drawAnimatedOpenDoors(ctx, room, time) {
  const cx = ROOM_WIDTH / 2;
  const cy = ROOM_HEIGHT / 2;
  const topX = cx - DOOR_PX / 2;

  if (room.doors.up) {
    coverOriginalTopDoor(ctx, topX);
    drawDoorPortal(ctx, 'up', topX, TOP_DOOR_VISUAL_DROP, DOOR_PX, WALL, time);
  }

  if (room.doors.down) {
    drawDoorPortal(ctx, 'down', topX, ROOM_HEIGHT - WALL, DOOR_PX, WALL, time);
  }

  if (room.doors.left) {
    drawDoorPortal(ctx, 'left', 0, cy - DOOR_PX / 2, WALL, DOOR_PX, time);
  }

  if (room.doors.right) {
    drawDoorPortal(ctx, 'right', ROOM_WIDTH - WALL, cy - DOOR_PX / 2, WALL, DOOR_PX, time);
  }
}

function coverOriginalTopDoor(ctx, x) {
  // Hide the old top-door mark that sits too close to the HUD.
  ctx.save();
  ctx.fillStyle = 'rgba(4, 6, 14, 0.92)';
  ctx.fillRect(x - 8, 0, DOOR_PX + 16, WALL + 10);
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 8, WALL + 9);
  ctx.lineTo(x + DOOR_PX + 8, WALL + 9);
  ctx.stroke();
  ctx.restore();
}

function drawDoorPortal(ctx, dir, x, y, w, h, time) {
  const pulse = 0.5 + Math.sin(time * 4.5) * 0.5;
  const scan = (time * 55) % (dir === 'up' || dir === 'down' ? w : h);
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const radius = Math.max(w, h) * (1.0 + pulse * 0.25);

  ctx.save();

  // Dark hole / portal depth
  ctx.fillStyle = 'rgba(2, 6, 14, 0.82)';
  roundRect(ctx, x - 2, y - 2, w + 4, h + 4, 4);
  ctx.fill();

  const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  grad.addColorStop(0, `rgba(0, 255, 190, ${0.23 + pulse * 0.1})`);
  grad.addColorStop(0.45, `rgba(0, 212, 255, ${0.12 + pulse * 0.08})`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x - radius / 2, y - radius / 2, w + radius, h + radius);

  // Portal frame
  ctx.strokeStyle = pulse > 0.55 ? NEON_GREEN : NEON_BLUE;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 18 + pulse * 10;
  ctx.lineWidth = 2;
  roundRect(ctx, x - 3, y - 3, w + 6, h + 6, 5);
  ctx.stroke();

  // Animated scanline across the opening
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (dir === 'up' || dir === 'down') {
    ctx.moveTo(x + scan, y + 2);
    ctx.lineTo(x + scan, y + h - 2);
  } else {
    ctx.moveTo(x + 2, y + scan);
    ctx.lineTo(x + w - 2, y + scan);
  }
  ctx.stroke();

  // Direction arrow / energy chevron
  ctx.globalAlpha = 0.45 + pulse * 0.3;
  ctx.fillStyle = ctx.strokeStyle = pulse > 0.5 ? NEON_GREEN : NEON_BLUE;
  drawChevron(ctx, dir, centerX, centerY, time);

  ctx.restore();
}

function drawChevron(ctx, dir, cx, cy, time) {
  const bob = Math.sin(time * 5) * 2;
  ctx.beginPath();
  switch (dir) {
    case 'up':
      ctx.moveTo(cx, cy - 7 + bob);
      ctx.lineTo(cx - 7, cy + 5 + bob);
      ctx.lineTo(cx + 7, cy + 5 + bob);
      break;
    case 'down':
      ctx.moveTo(cx, cy + 7 + bob);
      ctx.lineTo(cx - 7, cy - 5 + bob);
      ctx.lineTo(cx + 7, cy - 5 + bob);
      break;
    case 'left':
      ctx.moveTo(cx - 7 + bob, cy);
      ctx.lineTo(cx + 5 + bob, cy - 7);
      ctx.lineTo(cx + 5 + bob, cy + 7);
      break;
    case 'right':
      ctx.moveTo(cx + 7 + bob, cy);
      ctx.lineTo(cx - 5 + bob, cy - 7);
      ctx.lineTo(cx - 5 + bob, cy + 7);
      break;
  }
  ctx.closePath();
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
}

requestAnimationFrame(loop);
