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

const TOP_DOOR_VISUAL_DROP = 26;
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
  const sideY = cy - DOOR_PX / 2;

  if (room.doors.up) {
    coverOriginalTopDoor(ctx, topX);
    drawDoorPortal(ctx, 'up', topX, TOP_DOOR_VISUAL_DROP, DOOR_PX, WALL, time);
  }

  if (room.doors.down) {
    drawDoorPortal(ctx, 'down', topX, ROOM_HEIGHT - WALL, DOOR_PX, WALL, time);
  }

  if (room.doors.left) {
    coverOriginalSideDoor(ctx, 'left', 0, sideY);
    drawDoorPortal(ctx, 'left', 0, sideY, WALL, DOOR_PX, time);
  }

  if (room.doors.right) {
    coverOriginalSideDoor(ctx, 'right', ROOM_WIDTH - WALL, sideY);
    drawDoorPortal(ctx, 'right', ROOM_WIDTH - WALL, sideY, WALL, DOOR_PX, time);
  }
}

function coverOriginalTopDoor(ctx, x) {
  // Hide the old top-door marker and its glow. This intentionally masks wider
  // than the original 64px door because shadowBlur bleeds outside the stroke.
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(2, 3, 10, 1)';
  ctx.fillRect(x - 72, 0, DOOR_PX + 144, WALL + 34);

  const grad = ctx.createLinearGradient(0, 0, 0, WALL + 34);
  grad.addColorStop(0, 'rgba(2, 3, 10, 1)');
  grad.addColorStop(0.55, 'rgba(4, 6, 14, 1)');
  grad.addColorStop(1, 'rgba(7, 10, 18, 0.98)');
  ctx.fillStyle = grad;
  ctx.fillRect(x - 72, 0, DOOR_PX + 144, WALL + 34);

  ctx.restore();
}

function coverOriginalSideDoor(ctx, dir, x, y) {
  // Hide the old side-door marker/glow that leaks as a thin vertical line above
  // or below the animated portal. The mask is deliberately tight on the room
  // edge but taller than the door because the original stroke uses shadowBlur.
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  const padY = 42;
  const padX = 18;
  const maskX = dir === 'right' ? x - padX : x;
  const maskW = WALL + padX;
  const maskY = y - padY;
  const maskH = DOOR_PX + padY * 2;

  const grad = ctx.createLinearGradient(maskX, 0, maskX + maskW, 0);
  if (dir === 'right') {
    grad.addColorStop(0, 'rgba(6, 9, 18, 0.95)');
    grad.addColorStop(0.45, 'rgba(3, 5, 12, 1)');
    grad.addColorStop(1, 'rgba(2, 3, 10, 1)');
  } else {
    grad.addColorStop(0, 'rgba(2, 3, 10, 1)');
    grad.addColorStop(0.55, 'rgba(3, 5, 12, 1)');
    grad.addColorStop(1, 'rgba(6, 9, 18, 0.95)');
  }

  ctx.fillStyle = grad;
  ctx.fillRect(maskX, maskY, maskW, maskH);
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
