// ============================================================
// RIFT CRAWLER – Room Logic & Rendering (Atmosphere Edition)
// ============================================================

import {
  TILE_SIZE, ROOM_TILES_X, ROOM_TILES_Y, ROOM_WIDTH, ROOM_HEIGHT,
  WALL_THICKNESS, DOOR_WIDTH, PLAYER_SIZE,
  DARK_BG, DARK_WALL, DARK_FLOOR, NEON_BLUE, NEON_RED, NEON_GREEN, NEON_YELLOW, NEON_PURPLE, NEON_ORANGE,
} from './config.js';
import { state } from './state.js';
import { randRange } from './utils.js';

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
// Room Rendering – ATMOSPHERE EDITION
// ============================================================

/** Draw the current room (floor, walls, doors, decorations, atmosphere) */
export function drawRoom(ctx) {
  const room = getCurrentRoom();
  if (!room) return;

  const theme = room.theme;

  // --- Floor ---
  drawFloor(ctx, room, theme);

  // --- Floor details (cracks, puddles, runes) ---
  drawFloorDetails(ctx, room, theme);

  // --- Blood stains ---
  drawBloodStains(ctx);

  // --- Floor decorations (old shapes) ---
  drawDecorations(ctx, room, theme);

  // --- Walls ---
  drawWalls(ctx, room, theme);

  // --- Wall torches with flickering light ---
  drawTorches(ctx, room, theme);

  // --- Player light halo (subtle illumination around player) ---
  drawPlayerLight(ctx, theme);

  // --- Doors ---
  drawDoors(ctx, room, theme);

  // --- Room type indicator ---
  drawRoomTypeIndicator(ctx, room, theme);

  // --- Room-type atmosphere overlays ---
  drawRoomAtmosphere(ctx, room, theme);

  // --- Ambient particles ---
  updateAndDrawAmbientParticles(ctx, room, theme);
}

/** Draw the floor with subtle grid and variation */
function drawFloor(ctx, room, theme) {
  // Base floor fill
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

  // Subtle floor gradient – darker at edges for depth
  const edgeGrad = ctx.createRadialGradient(
    ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 100,
    ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_WIDTH * 0.6
  );
  edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
  edgeGrad.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
}

/** Draw floor details: cracks, puddles, rune circles */
function drawFloorDetails(ctx, room, theme) {
  for (const d of room.floorDetails) {
    ctx.save();
    switch (d.type) {
      case 'crack':
        ctx.globalAlpha = d.alpha;
        ctx.strokeStyle = `rgba(0,0,0,0.6)`;
        ctx.lineWidth = 1.5;
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotation);
        // Main crack line
        ctx.beginPath();
        ctx.moveTo(-d.length / 2, 0);
        ctx.lineTo(d.length / 2, 0);
        ctx.stroke();
        // Branch crack
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(d.length * 0.25, d.length * 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-d.length * 0.1, 0);
        ctx.lineTo(-d.length * 0.3, -d.length * 0.15);
        ctx.stroke();
        // Lighter inner crack
        ctx.strokeStyle = theme.accent;
        ctx.globalAlpha = d.alpha * 0.3;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-d.length / 2 + 2, 0);
        ctx.lineTo(d.length / 2 - 2, 0);
        ctx.stroke();
        break;

      case 'puddle':
        ctx.globalAlpha = d.alpha;
        ctx.fillStyle = `rgba(100,140,200,0.4)`;
        // Elliptical puddle
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, d.size, d.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Subtle reflection/shine
        ctx.globalAlpha = d.alpha * 0.5;
        ctx.fillStyle = `rgba(150,180,255,0.3)`;
        ctx.beginPath();
        ctx.ellipse(d.x - d.size * 0.2, d.y - d.size * 0.1, d.size * 0.3, d.size * 0.15, -0.3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'rune':
        ctx.globalAlpha = d.alpha;
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotation);
        // Outer ring
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 1;
        ctx.shadowColor = theme.accent;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
        ctx.stroke();
        // Inner ring
        ctx.beginPath();
        ctx.arc(0, 0, d.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        // Rune marks (8 small lines around the circle)
        ctx.shadowBlur = 0;
        for (let ri = 0; ri < 8; ri++) {
          const ra = (Math.PI * 2 / 8) * ri;
          const innerR = d.radius * 0.6;
          const outerR = d.radius;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ra) * innerR, Math.sin(ra) * innerR);
          ctx.lineTo(Math.cos(ra) * outerR, Math.sin(ra) * outerR);
          ctx.stroke();
        }
        // Center dot
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        // Subtle pulsing animation
        const pulse = 0.5 + Math.sin(state.time * 1.5) * 0.5;
        ctx.globalAlpha = d.alpha * pulse * 0.5;
        ctx.strokeStyle = theme.accent;
        ctx.shadowColor = theme.accent;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, d.radius * (1 + pulse * 0.1), 0, Math.PI * 2);
        ctx.stroke();
        break;
    }
    ctx.restore();
  }
}

/** Draw blood stains from kills */
function drawBloodStains(ctx) {
  for (const b of state.bloodStains) {
    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.fillStyle = `rgba(120,10,10,0.5)`;
    // Main splatter
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.size, b.size * 0.7, b.rotation, 0, Math.PI * 2);
    ctx.fill();
    // Smaller drops around
    for (const drop of b.drops) {
      ctx.beginPath();
      ctx.arc(b.x + drop.dx, b.y + drop.dy, drop.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Add a blood stain at position (called from combat) */
export function addBloodStain(x, y) {
  const drops = [];
  const count = 2 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    drops.push({
      dx: randRange(-20, 20),
      dy: randRange(-15, 15),
      r: randRange(2, 6),
    });
  }
  state.bloodStains.push({
    x, y,
    size: randRange(8, 18),
    rotation: Math.random() * Math.PI * 2,
    alpha: randRange(0.15, 0.3),
    drops,
  });
  // Fade old blood stains
  if (state.bloodStains.length > 12) {
    state.bloodStains.shift();
  }
}

/** Draw old-style decorations */
function drawDecorations(ctx, room, theme) {
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
}

function drawWalls(ctx, room, theme) {
  // --- Wall base color ---
  ctx.fillStyle = theme.wall;

  // Top wall
  ctx.fillRect(0, 0, ROOM_WIDTH, WALL_THICKNESS * TILE_SIZE);
  // Bottom wall
  ctx.fillRect(0, ROOM_HEIGHT - WALL_THICKNESS * TILE_SIZE, ROOM_WIDTH, WALL_THICKNESS * TILE_SIZE);
  // Left wall
  ctx.fillRect(0, 0, WALL_THICKNESS * TILE_SIZE, ROOM_HEIGHT);
  // Right wall
  ctx.fillRect(ROOM_WIDTH - WALL_THICKNESS * TILE_SIZE, 0, WALL_THICKNESS * TILE_SIZE, ROOM_HEIGHT);

  // --- Wall texture pattern (subtle brick-like lines) ---
  ctx.strokeStyle = `rgba(0,0,0,0.15)`;
  ctx.lineWidth = 0.5;
  const wallH = WALL_THICKNESS * TILE_SIZE;

  // Top wall bricks
  for (let bx = 0; bx < ROOM_WIDTH; bx += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx, wallH);
    ctx.stroke();
  }
  // Bottom wall bricks
  for (let bx = 0; bx < ROOM_WIDTH; bx += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(bx, ROOM_HEIGHT - wallH);
    ctx.lineTo(bx, ROOM_HEIGHT);
    ctx.stroke();
  }
  // Left wall bricks
  for (let by = 0; by < ROOM_HEIGHT; by += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, by);
    ctx.lineTo(wallH, by);
    ctx.stroke();
  }
  // Right wall bricks
  for (let by = 0; by < ROOM_HEIGHT; by += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(ROOM_WIDTH - wallH, by);
    ctx.lineTo(ROOM_WIDTH, by);
    ctx.stroke();
  }

  // --- Inner wall shadow (3D depth effect) ---
  const inset = WALL_THICKNESS * TILE_SIZE;
  // Shadow on floor side of walls
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  // Top wall shadow
  ctx.fillRect(inset, inset, ROOM_WIDTH - inset * 2, 3);
  // Left wall shadow
  ctx.fillRect(inset, inset, 3, ROOM_HEIGHT - inset * 2);
  // Bottom wall highlight (lighter)
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fillRect(inset, ROOM_HEIGHT - inset - 2, ROOM_WIDTH - inset * 2, 2);
  // Right wall highlight
  ctx.fillRect(ROOM_WIDTH - inset - 2, inset, 2, ROOM_HEIGHT - inset * 2);

  // --- Neon border on inner wall edge ---
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 8;
  ctx.strokeRect(inset, inset, ROOM_WIDTH - inset * 2, ROOM_HEIGHT - inset * 2);
  ctx.shadowBlur = 0;

  // --- Corner accents (small neon dots at corners for detail) ---
  const cornerSize = 8;
  ctx.fillStyle = theme.accent;
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 6;
  // Top-left
  ctx.fillRect(inset, inset, cornerSize, 2);
  ctx.fillRect(inset, inset, 2, cornerSize);
  // Top-right
  ctx.fillRect(ROOM_WIDTH - inset - cornerSize, inset, cornerSize, 2);
  ctx.fillRect(ROOM_WIDTH - inset - 2, inset, 2, cornerSize);
  // Bottom-left
  ctx.fillRect(inset, ROOM_HEIGHT - inset - 2, cornerSize, 2);
  ctx.fillRect(inset, ROOM_HEIGHT - inset - cornerSize, 2, cornerSize);
  // Bottom-right
  ctx.fillRect(ROOM_WIDTH - inset - cornerSize, ROOM_HEIGHT - inset - 2, cornerSize, 2);
  ctx.fillRect(ROOM_WIDTH - inset - 2, ROOM_HEIGHT - inset - cornerSize, 2, cornerSize);
  ctx.shadowBlur = 0;
}

/** Draw wall torches/crystals with flickering light */
function drawTorches(ctx, room, theme) {
  for (const torch of room.torches) {
    const flicker = Math.sin(state.time * 8 + torch.flickerPhase) * 0.15
                  + Math.sin(state.time * 13 + torch.flickerPhase * 2) * 0.08;
    const brightness = torch.brightness * (1 + flicker);

    // --- Light halo on floor ---
    const lightRadius = 80 + flicker * 40;
    const grad = ctx.createRadialGradient(torch.x, torch.y, 0, torch.x, torch.y, lightRadius);
    const lightColor = getTorchColor(theme, room.type);
    grad.addColorStop(0, `rgba(${lightColor.r},${lightColor.g},${lightColor.b},${0.08 * brightness})`);
    grad.addColorStop(0.5, `rgba(${lightColor.r},${lightColor.g},${lightColor.b},${0.03 * brightness})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(torch.x - lightRadius, torch.y - lightRadius, lightRadius * 2, lightRadius * 2);

    // --- Torch body ---
    ctx.save();
    ctx.translate(torch.x, torch.y);

    // Crystal/torch shape based on floor
    const torchColor = getTorchBodyColor(theme);
    ctx.fillStyle = torchColor;
    ctx.shadowColor = torchColor;
    ctx.shadowBlur = 8 + flicker * 15;

    // Small diamond shape for crystal
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();

    // Bright center
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.6 + flicker;
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    // Flicker particles (occasional spark)
    if (Math.random() < 0.02 * brightness) {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = torchColor;
      const sparkX = randRange(-3, 3);
      const sparkY = randRange(-8, -3);
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

/** Get torch light color based on theme */
function getTorchColor(theme, roomType) {
  // Parse accent color to get RGB
  const accentRGB = hexToRGB(theme.accent);
  if (roomType === 'boss') return { r: 255, g: 80, b: 40 };
  if (roomType === 'treasure') return { r: 255, g: 220, b: 100 };
  if (roomType === 'rest') return { r: 100, g: 180, b: 255 };
  return accentRGB;
}

/** Get torch body color */
function getTorchBodyColor(theme) {
  return theme.accent;
}

/** Draw subtle player light that illuminates nearby floor */
function drawPlayerLight(ctx, theme) {
  const p = state.player;
  const lightRadius = 120;
  const accentRGB = hexToRGB(theme.accent);

  const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, lightRadius);
  grad.addColorStop(0, `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b},0.04)`);
  grad.addColorStop(0.6, `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b},0.015)`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(p.x - lightRadius, p.y - lightRadius, lightRadius * 2, lightRadius * 2);
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

      // Depth gradient in the door opening
      const doorCenterX = dx + dw / 2;
      const doorCenterY = dy + dh / 2;
      const depthGrad = ctx.createRadialGradient(doorCenterX, doorCenterY, 0, doorCenterX, doorCenterY, Math.max(dw, dh));
      depthGrad.addColorStop(0, 'rgba(0,50,20,0.3)');
      depthGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = depthGrad;
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
      // Locked door – red glow with pulsing
      const pulseIntensity = 0.8 + Math.sin(state.time * 2) * 0.2;
      ctx.fillStyle = theme.wall;
      ctx.fillRect(dx, dy, dw, dh);

      // Lock pattern on door
      ctx.fillStyle = `rgba(255,50,100,${0.1 * pulseIntensity})`;
      ctx.fillRect(dx + 4, dy + 4, dw - 8, dh - 8);

      ctx.strokeStyle = NEON_RED;
      ctx.lineWidth = 2;
      ctx.shadowColor = NEON_RED;
      ctx.shadowBlur = 10 * pulseIntensity;
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

/** Draw room-type specific atmosphere overlays */
function drawRoomAtmosphere(ctx, room, theme) {
  switch (room.type) {
    case 'boss': {
      // Pulsing red vignette for boss rooms
      const pulse = 0.5 + Math.sin(state.time * 2) * 0.3;
      const grad = ctx.createRadialGradient(
        ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_WIDTH * 0.2,
        ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_WIDTH * 0.6
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(80,0,0,${0.15 * pulse})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

      // Red tint at edges
      const edgeGrad = ctx.createRadialGradient(
        ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_HEIGHT * 0.3,
        ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_WIDTH * 0.65
      );
      edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
      edgeGrad.addColorStop(1, `rgba(100,0,0,${0.12 * pulse})`);
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
      break;
    }

    case 'treasure': {
      // Golden sparkle effect
      const sparkle = Math.sin(state.time * 4) * 0.5 + 0.5;
      const grad = ctx.createRadialGradient(
        ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0,
        ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_WIDTH * 0.4
      );
      grad.addColorStop(0, `rgba(255,220,80,${0.04 * sparkle})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
      break;
    }

    case 'rest': {
      // Calm blue mist
      const breathe = Math.sin(state.time * 1) * 0.5 + 0.5;
      const grad = ctx.createRadialGradient(
        ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0,
        ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_WIDTH * 0.5
      );
      grad.addColorStop(0, `rgba(80,120,255,${0.03 * breathe})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
      break;
    }
  }
}

// ============================================================
// Ambient Particles System
// ============================================================

/** Ambient particle configs per floor theme */
const AMBIENT_CONFIGS = [
  // Floor 1: Krypta – blue dust motes
  { color: '#4488cc', count: 15, speed: 12, life: 5, size: [1, 3], drift: 8, glow: 3 },
  // Floor 2: Abgrund – purple wisps
  { color: '#8844cc', count: 12, speed: 10, life: 6, size: [2, 4], drift: 12, glow: 5 },
  // Floor 3: Giftwald – green spores
  { color: '#44cc66', count: 18, speed: 8, life: 4, size: [1, 3], drift: 6, glow: 4 },
  // Floor 4: Höllentor – orange embers
  { color: '#ff6622', count: 20, speed: 15, life: 3, size: [1, 3], drift: 10, glow: 6 },
  // Floor 5: Nexus – red energy sparks
  { color: '#ff2244', count: 16, speed: 18, life: 3, size: [1, 2], drift: 14, glow: 5 },
];

function updateAndDrawAmbientParticles(ctx, room, theme) {
  const config = AMBIENT_CONFIGS[(room.floor - 1) % AMBIENT_CONFIGS.length];
  const dt = state.dt || 0.016;

  // Spawn new ambient particles
  state.ambientSpawnTimer -= dt;
  if (state.ambientSpawnTimer <= 0) {
    state.ambientSpawnTimer = 0.1 + Math.random() * 0.3;  // spawn every 0.1-0.4s
    if (state.ambientParticles.length < config.count) {
      const wallPad = 40;
      state.ambientParticles.push({
        x: wallPad + Math.random() * (ROOM_WIDTH - wallPad * 2),
        y: wallPad + Math.random() * (ROOM_HEIGHT - wallPad * 2),
        vx: (Math.random() - 0.5) * config.drift,
        vy: -config.speed * 0.3 + (Math.random() - 0.5) * config.drift,
        life: config.life * (0.7 + Math.random() * 0.6),
        maxLife: config.life,
        size: config.size[0] + Math.random() * (config.size[1] - config.size[0]),
        color: config.color,
        phase: Math.random() * Math.PI * 2,
        glow: config.glow,
      });
    }
  }

  // Update and draw
  for (let i = state.ambientParticles.length - 1; i >= 0; i--) {
    const p = state.ambientParticles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // Gentle sway
    p.x += Math.sin(state.time * 2 + p.phase) * 0.3;
    p.life -= dt;

    if (p.life <= 0) {
      state.ambientParticles.splice(i, 1);
      continue;
    }

    const alpha = Math.min(1, p.life / p.maxLife * 2) * (p.life < p.maxLife * 0.3 ? p.life / (p.maxLife * 0.3) : 1);
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

// ============================================================
// Vignette Effect (drawn in screen space, called from main.js)
// ============================================================

/** Draw vignette overlay on the entire room area */
export function drawVignette(ctx) {
  const cx = ROOM_WIDTH / 2;
  const cy = ROOM_HEIGHT / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);

  const grad = ctx.createRadialGradient(cx, cy, maxR * 0.4, cx, cy, maxR);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.7, 'rgba(0,0,0,0.1)');
  grad.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
}

// ============================================================
// Helpers
// ============================================================

/** Parse hex color to RGB object */
function hexToRGB(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 212, b: 255 };  // fallback to NEON_BLUE
}
