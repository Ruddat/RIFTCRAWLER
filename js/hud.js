// ============================================================
// RIFT CRAWLER – HUD Overlay (Health, Minimap, Score, etc.)
// ============================================================

import {
  CANVAS_WIDTH, CANVAS_HEIGHT, DUNGEON_GRID,
  NEON_BLUE, NEON_GREEN, NEON_RED, NEON_YELLOW, NEON_PURPLE, NEON_ORANGE,
  DARK_BG,
} from './config.js';
import { state } from './state.js';

// ============================================================
// Drawing
// ============================================================

export function drawHud(ctx) {
  const p = state.player;

  // --- Top bar background ---
  ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 48);
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 48);
  ctx.lineTo(CANVAS_WIDTH, 48);
  ctx.stroke();

  // --- Health hearts ---
  const heartStartX = 16;
  const heartY = 14;
  for (let i = 0; i < p.maxHp; i++) {
    const hx = heartStartX + i * 22;
    if (i < p.hp) {
      drawHeart(ctx, hx, heartY, 8, NEON_RED);
    } else {
      drawHeart(ctx, hx, heartY, 8, 'rgba(255,255,255,0.15)');
    }
  }

  // --- Floor & Room info ---
  ctx.fillStyle = NEON_BLUE;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = NEON_BLUE;
  ctx.shadowBlur = 6;
  const room = window.__room_getCurrentRoom ? window.__room_getCurrentRoom() : null;
  const roomType = room ? room.type : '';
  const floorName = room ? room.theme.name : '';
  ctx.fillText(`ETAGE ${state.floor} – ${floorName}`, CANVAS_WIDTH / 2, 20);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '10px monospace';
  ctx.fillText(roomType.toUpperCase(), CANVAS_WIDTH / 2, 36);

  // --- Score ---
  ctx.textAlign = 'right';
  ctx.fillStyle = NEON_YELLOW;
  ctx.font = 'bold 14px monospace';
  ctx.shadowColor = NEON_YELLOW;
  ctx.shadowBlur = 4;
  ctx.fillText(`${state.score}`, CANVAS_WIDTH - 120, 20);
  ctx.shadowBlur = 0;

  // --- Bombs ---
  ctx.fillStyle = NEON_ORANGE;
  ctx.font = '12px monospace';
  ctx.fillText(`💣 ${p.bombs}`, CANVAS_WIDTH - 120, 38);

  // --- Gold ---
  ctx.fillStyle = NEON_YELLOW;
  ctx.fillText(`💰 ${p.gold}`, CANVAS_WIDTH - 60, 38);

  // --- Combo ---
  if (state.combo > 1) {
    ctx.textAlign = 'center';
    const comboScale = 1 + Math.sin(state.time * 8) * 0.1;
    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);
    ctx.scale(comboScale, comboScale);
    ctx.fillStyle = NEON_YELLOW;
    ctx.shadowColor = NEON_YELLOW;
    ctx.shadowBlur = 10;
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`x${state.combo} COMBO`, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // --- Room cleared notification ---
  if (state.roomCleared && state.doorsOpen) {
    const room2 = window.__room_getCurrentRoom ? window.__room_getCurrentRoom() : null;
    if (room2 && room2.type === 'combat') {
      ctx.textAlign = 'center';
      ctx.fillStyle = NEON_GREEN;
      ctx.shadowColor = NEON_GREEN;
      ctx.shadowBlur = 8;
      ctx.font = 'bold 18px monospace';
      ctx.fillText('RAUM GELÖST!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
      ctx.shadowBlur = 0;
    }
  }

  // --- Minimap ---
  drawMinimap(ctx);

  ctx.textAlign = 'left';
}

// ============================================================
// Minimap
// ============================================================

function drawMinimap(ctx) {
  const mmSize = 5;          // pixel size per room
  const mmPad = 2;
  const mmOffX = CANVAS_WIDTH - 16 - DUNGEON_GRID * (mmSize + mmPad);
  const mmOffY = CANVAS_HEIGHT - 16 - DUNGEON_GRID * (mmSize + mmPad);

  // Background
  ctx.fillStyle = 'rgba(10, 10, 20, 0.7)';
  ctx.fillRect(mmOffX - 4, mmOffY - 4,
    DUNGEON_GRID * (mmSize + mmPad) + 4,
    DUNGEON_GRID * (mmSize + mmPad) + 4);

  if (!state.dungeon) return;

  for (let gy = 0; gy < DUNGEON_GRID; gy++) {
    for (let gx = 0; gx < DUNGEON_GRID; gx++) {
      const room = state.dungeon.grid[gy][gx];
      if (!room) continue;

      const key = `${gx},${gy}`;
      const visited = state.visitedRooms.has(key);
      const isCurrent = state.currentRoom.x === gx && state.currentRoom.y === gy;

      const rx = mmOffX + gx * (mmSize + mmPad);
      const ry = mmOffY + gy * (mmSize + mmPad);

      if (!visited && !isCurrent) {
        // Undiscovered – dim
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(rx, ry, mmSize, mmSize);
        continue;
      }

      // Color by room type
      let color = '#333';
      switch (room.type) {
        case 'start':    color = NEON_BLUE; break;
        case 'combat':   color = '#666'; break;
        case 'treasure': color = NEON_YELLOW; break;
        case 'boss':     color = NEON_RED; break;
        case 'shop':     color = NEON_GREEN; break;
        case 'rest':     color = NEON_PURPLE; break;
      }

      ctx.fillStyle = color;
      ctx.fillRect(rx, ry, mmSize, mmSize);

      // Current room highlight
      if (isCurrent) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx - 1, ry - 1, mmSize + 2, mmSize + 2);
      }

      // Draw connections (doors)
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      if (room.doors.right && gx + 1 < DUNGEON_GRID) {
        ctx.beginPath();
        ctx.moveTo(rx + mmSize, ry + mmSize / 2);
        ctx.lineTo(rx + mmSize + mmPad, ry + mmSize / 2);
        ctx.stroke();
      }
      if (room.doors.down && gy + 1 < DUNGEON_GRID) {
        ctx.beginPath();
        ctx.moveTo(rx + mmSize / 2, ry + mmSize);
        ctx.lineTo(rx + mmSize / 2, ry + mmSize + mmPad);
        ctx.stroke();
      }
    }
  }
}

// ============================================================
// Heart helper
// ============================================================

function drawHeart(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.3);
  ctx.bezierCurveTo(x, y - size * 0.3, x - size, y - size * 0.3, x - size, y + size * 0.1);
  ctx.bezierCurveTo(x - size, y + size * 0.6, x, y + size, x, y + size);
  ctx.bezierCurveTo(x, y + size, x + size, y + size * 0.6, x + size, y + size * 0.1);
  ctx.bezierCurveTo(x + size, y - size * 0.3, x, y - size * 0.3, x, y + size * 0.3);
  ctx.fill();
  ctx.shadowBlur = 0;
}
