// ============================================================
// RIFT CRAWLER – Room Logic & Rendering
// ============================================================

import {
  TILE_SIZE, ROOM_TILES_X, ROOM_TILES_Y, ROOM_WIDTH, ROOM_HEIGHT,
  WALL_THICKNESS, DOOR_WIDTH, PLAYER_SIZE,
  DARK_BG, DARK_WALL, DARK_FLOOR, NEON_BLUE, NEON_RED, NEON_GREEN, NEON_YELLOW, NEON_PURPLE,
} from './config.js';
import { state } from './state.js';

// Door positions in tile coords (where the opening is)
const DOOR_POSITIONS = {
  up:    { x: Math.floor(ROOM_TILES_X / 2) - 1, y: 0, w: DOOR_WIDTH, h: WALL_THICKNESS },
  down:  { x: Math.floor(ROOM_TILES_X / 2) - 1, y: ROOM_TILES_Y - WALL_THICKNESS, w: DOOR_WIDTH, h: WALL_THICKNESS },
  left:  { x: 0, y: Math.floor(ROOM_TILES_Y / 2) - 1, w: WALL_THICKNESS, h: DOOR_WIDTH },
  right: { x: ROOM_TILES_X - WALL_THICKNESS, y: Math.floor(ROOM_TILES_Y / 2) - 1, w: WALL_THICKNESS, h: DOOR_WIDTH },
};

/** Get pixel position of door entrance (where player appears when entering from opposite side) */
export function getDoorEntryPoint(dir) {
  const cx = ROOM_WIDTH / 2;
  const cy = ROOM_HEIGHT / 2;
  const pad = 52;
  switch (dir) {
    case 'up':    return { x: cx, y: pad };
    case 'down':  return { x: cx, y: ROOM_HEIGHT - pad };
    case 'left':  return { x: pad, y: cy };
    case 'right': return { x: ROOM_WIDTH - pad, y: cy };
  }
}

/** Opposite direction */
export function oppositeDir(dir) {
  return { up: 'down', down: 'up', left: 'right', right: 'left' }[dir];
}

/**
 * Check if player is in the door zone to trigger a room transition.
 * Player coordinates are in ROOM-LOCAL space (0 to ROOM_WIDTH, 0 to ROOM_HEIGHT).
 * Door positions are also calculated in room-local space (NO ROOM_OFFSET).
 */
export function checkDoorTransition(px, py) {
  const room = getCurrentRoom();
  if (!room || !state.doorsOpen) return null;

  for (const dir of ['up', 'down', 'left', 'right']) {
    if (!room.doors[dir]) continue;

    const door = DOOR_POSITIONS[dir];
    // Room-local pixel coordinates (no ROOM_OFFSET!)
    const dx = door.x * TILE_SIZE;
    const dy = door.y * TILE_SIZE;
    const dw = door.w * TILE_SIZE;
    const dh = door.h * TILE_SIZE;

    // Expanded detection zone: pad outward from the door opening
    const padInward = 12;  // how far into the room to detect
    const padOutward = 8;  // how far into the wall to detect (player entering)

    switch (dir) {
      case 'up':
        if (px > dx - 4 && px < dx + dw + 4 && py < dy + dh + padInward && py > dy - padOutward) return dir;
        break;
      case 'down':
        if (px > dx - 4 && px < dx + dw + 4 && py > dy - padInward && py < dy + dh + padOutward) return dir;
        break;
      case 'left':
        if (py > dy - 4 && py < dy + dh + 4 && px < dx + dw + padInward && px > dx - padOutward) return dir;
        break;
      case 'right':
        if (py > dy - 4 && py < dy + dh + 4 && px > dx - padInward && px < dx + dw + padOutward) return dir;
        break;
    }
  }
  return null;
}

/** Get the current room object */
export function getCurrentRoom() {
  if (!state.dungeon) return null;
  return state.dungeon.grid[state.currentRoom.y]?.[state.currentRoom.x] || null;
}

/** Check wall collision for an entity at (px, py) with given radius */
export function isWallAt(px, py, radius = 0) {
  const tx = Math.floor(px / TILE_SIZE);
  const ty = Math.floor(py / TILE_SIZE);

  // Out of room bounds = wall (but allow door edges for transitions)
  if (tx < 0 || tx >= ROOM_TILES_X || ty < 0 || ty >= ROOM_TILES_Y) return true;

  if (isWallTile(tx, ty)) return true;

  // Check surrounding tiles for radius collision
  if (radius > 0) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const checkX = tx + dx;
        const checkY = ty + dy;
        if (checkX < 0 || checkX >= ROOM_TILES_X || checkY < 0 || checkY >= ROOM_TILES_Y) continue;
        if (isWallTile(checkX, checkY)) {
          const wallLeft = checkX * TILE_SIZE;
          const wallTop = checkY * TILE_SIZE;
          const nearX = Math.max(wallLeft, Math.min(px, wallLeft + TILE_SIZE));
          const nearY = Math.max(wallTop, Math.min(py, wallTop + TILE_SIZE));
          const distX = px - nearX;
          const distY = py - nearY;
          if (distX * distX + distY * distY < radius * radius) return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check if a tile position is a wall.
 * Border tiles are walls, EXCEPT where there's an open door.
 */
function isWallTile(tx, ty) {
  const room = getCurrentRoom();
  if (!room) return true;

  // Top wall row
  if (ty < WALL_THICKNESS) {
    if (room.doors.up && isDoorTile(tx, DOOR_POSITIONS.up) && state.doorsOpen) return false;
    return true;
  }
  // Bottom wall row
  if (ty >= ROOM_TILES_Y - WALL_THICKNESS) {
    if (room.doors.down && isDoorTile(tx, DOOR_POSITIONS.down) && state.doorsOpen) return false;
    return true;
  }
  // Left wall column
  if (tx < WALL_THICKNESS) {
    if (room.doors.left && isDoorTile(ty, DOOR_POSITIONS.left, true) && state.doorsOpen) return false;
    return true;
  }
  // Right wall column
  if (tx >= ROOM_TILES_X - WALL_THICKNESS) {
    if (room.doors.right && isDoorTile(ty, DOOR_POSITIONS.right, true) && state.doorsOpen) return false;
    return true;
  }

  return false;
}

/** Check if a tile index falls within a door opening */
function isDoorTile(idx, door, vertical = false) {
  if (vertical) {
    return idx >= door.y && idx < door.y + door.h;
  }
  return idx >= door.x && idx < door.x + door.w;
}

/**
 * Get wall collision resolution – push entity out of walls.
 * Also clamps to room bounds so entities can't leave the room.
 */
export function resolveWallCollision(px, py, radius) {
  let nx = px;
  let ny = py;

  const tx = Math.floor(px / TILE_SIZE);
  const ty = Math.floor(py / TILE_SIZE);

  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      const cx = tx + dx;
      const cy = ty + dy;
      if (cx < 0 || cx >= ROOM_TILES_X || cy < 0 || cy >= ROOM_TILES_Y) continue;
      if (!isWallTile(cx, cy)) continue;

      const wallLeft = cx * TILE_SIZE;
      const wallTop = cy * TILE_SIZE;
      const nearX = Math.max(wallLeft, Math.min(nx, wallLeft + TILE_SIZE));
      const nearY = Math.max(wallTop, Math.min(ny, wallTop + TILE_SIZE));

      const distX = nx - nearX;
      const distY = ny - nearY;
      const d = Math.sqrt(distX * distX + distY * distY);

      if (d < radius && d > 0.001) {
        const push = (radius - d) / d;
        nx += distX * push;
        ny += distY * push;
      }
    }
  }

  // Clamp to room bounds (with margin for player size)
  nx = Math.max(radius, Math.min(nx, ROOM_WIDTH - radius));
  ny = Math.max(radius, Math.min(ny, ROOM_HEIGHT - radius));

  return { x: nx, y: ny };
}

// ============================================================
// Room Rendering
// ============================================================

/** Draw the current room (floor, walls, doors, decorations) */
export function drawRoom(ctx) {
  const room = getCurrentRoom();
  if (!room) return;

  const theme = room.theme;

  // Floor (full canvas background for the room area)
  ctx.fillStyle = theme.floor;
  ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

  // Subtle grid pattern
  ctx.strokeStyle = `rgba(255,255,255,0.03)`;
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= ROOM_TILES_X; x++) {
    ctx.beginPath();
    ctx.moveTo(x * TILE_SIZE, 0);
    ctx.lineTo(x * TILE_SIZE, ROOM_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= ROOM_TILES_Y; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * TILE_SIZE);
    ctx.lineTo(ROOM_WIDTH, y * TILE_SIZE);
    ctx.stroke();
  }

  // Floor decorations
  for (const d of room.decorations) {
    ctx.globalAlpha = d.alpha;
    ctx.fillStyle = theme.accent;
    if (d.shape === 0) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.shape === 1) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-d.size, -d.size, d.size * 2, d.size * 2);
      ctx.restore();
    } else {
      ctx.fillRect(d.x - 1, d.y - d.size, 2, d.size * 2);
      ctx.fillRect(d.x - d.size, d.y - 1, d.size * 2, 2);
    }
  }
  ctx.globalAlpha = 1;

  // --- Walls ---
  drawWalls(ctx, room, theme);

  // --- Doors ---
  drawDoors(ctx, room, theme);

  // --- Room type indicator ---
  drawRoomTypeIndicator(ctx, room, theme);
}

function drawWalls(ctx, room, theme) {
  ctx.fillStyle = theme.wall;

  // Top wall
  ctx.fillRect(0, 0, ROOM_WIDTH, WALL_THICKNESS * TILE_SIZE);
  // Bottom wall
  ctx.fillRect(0, ROOM_HEIGHT - WALL_THICKNESS * TILE_SIZE, ROOM_WIDTH, WALL_THICKNESS * TILE_SIZE);
  // Left wall
  ctx.fillRect(0, 0, WALL_THICKNESS * TILE_SIZE, ROOM_HEIGHT);
  // Right wall
  ctx.fillRect(ROOM_WIDTH - WALL_THICKNESS * TILE_SIZE, 0, WALL_THICKNESS * TILE_SIZE, ROOM_HEIGHT);

  // Neon border on inner wall edge
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 8;

  const inset = WALL_THICKNESS * TILE_SIZE;
  ctx.strokeRect(inset, inset, ROOM_WIDTH - inset * 2, ROOM_HEIGHT - inset * 2);
  ctx.shadowBlur = 0;
}

function drawDoors(ctx, room, theme) {
  for (const dir of ['up', 'down', 'left', 'right']) {
    if (!room.doors[dir]) continue;

    const door = DOOR_POSITIONS[dir];
    const dx = door.x * TILE_SIZE;
    const dy = door.y * TILE_SIZE;
    const dw = door.w * TILE_SIZE;
    const dh = door.h * TILE_SIZE;

    if (state.doorsOpen) {
      // Open door – dark opening with green glow
      ctx.fillStyle = '#050510';
      ctx.fillRect(dx, dy, dw, dh);

      ctx.strokeStyle = NEON_GREEN;
      ctx.lineWidth = 2;
      ctx.shadowColor = NEON_GREEN;
      ctx.shadowBlur = 12;
      ctx.strokeRect(dx, dy, dw, dh);
      ctx.shadowBlur = 0;

      // Direction arrow inside the door
      ctx.fillStyle = NEON_GREEN;
      ctx.globalAlpha = 0.4 + Math.sin(state.time * 3) * 0.2;
      const cx = dx + dw / 2;
      const cy = dy + dh / 2;
      ctx.beginPath();
      switch (dir) {
        case 'up':    ctx.moveTo(cx, cy - 6); ctx.lineTo(cx - 5, cy + 4); ctx.lineTo(cx + 5, cy + 4); break;
        case 'down':  ctx.moveTo(cx, cy + 6); ctx.lineTo(cx - 5, cy - 4); ctx.lineTo(cx + 5, cy - 4); break;
        case 'left':  ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 4, cy - 5); ctx.lineTo(cx + 4, cy + 5); break;
        case 'right': ctx.moveTo(cx + 6, cy); ctx.lineTo(cx - 4, cy - 5); ctx.lineTo(cx - 4, cy + 5); break;
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      // Locked door – red glow
      ctx.fillStyle = theme.wall;
      ctx.fillRect(dx, dy, dw, dh);

      ctx.strokeStyle = NEON_RED;
      ctx.lineWidth = 2;
      ctx.shadowColor = NEON_RED;
      ctx.shadowBlur = 10;
      ctx.strokeRect(dx, dy, dw, dh);

      // Lock icon (small X)
      const cx = dx + dw / 2;
      const cy = dy + dh / 2;
      const s = 6;
      ctx.beginPath();
      ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s);
      ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s);
      ctx.stroke();

      ctx.shadowBlur = 0;
    }
  }
}

function drawRoomTypeIndicator(ctx, room, theme) {
  const iconX = ROOM_WIDTH - 30;
  const iconY = 30;
  ctx.globalAlpha = 0.3;

  switch (room.type) {
    case 'treasure':
      ctx.fillStyle = NEON_YELLOW;
      ctx.font = '16px monospace';
      ctx.fillText('*', iconX - 4, iconY + 5);
      break;
    case 'shop':
      ctx.fillStyle = NEON_GREEN;
      ctx.font = 'bold 16px monospace';
      ctx.fillText('$', iconX - 4, iconY + 5);
      break;
    case 'boss':
      ctx.fillStyle = NEON_RED;
      ctx.font = 'bold 16px monospace';
      ctx.fillText('X', iconX - 5, iconY + 5);
      break;
    case 'rest':
      ctx.fillStyle = NEON_PURPLE;
      ctx.font = 'bold 16px monospace';
      ctx.fillText('+', iconX - 4, iconY + 5);
      break;
  }
  ctx.globalAlpha = 1;
}
