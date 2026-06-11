// ============================================================
// RIFT CRAWLER – Procedural Dungeon Generation
// ============================================================
// Generates a connected graph of rooms on a 7×7 grid.
// Uses random-walk from center, then tags rooms by type.

import { DUNGEON_GRID, MIN_ROOMS, MAX_ROOMS, ROOM_WIDTH, ROOM_HEIGHT } from './config.js';
import { randInt, randRange, dist } from './utils.js';

// Room types
export const ROOM_START = 'start';
export const ROOM_COMBAT = 'combat';
export const ROOM_TREASURE = 'treasure';
export const ROOM_SHOP = 'shop';
export const ROOM_BOSS = 'boss';
export const ROOM_REST = 'rest';

const DIRS = [
  { dx: 0, dy: -1, name: 'up' },
  { dx: 0, dy: 1, name: 'down' },
  { dx: -1, dy: 0, name: 'left' },
  { dx: 1, dy: 0, name: 'right' },
];

/**
 * Generate a new dungeon floor.
 * @param {number} floor – current floor (1-based, affects difficulty)
 * @returns {object} { grid, startRoom, bossRoom, rooms }
 */
export function generateDungeon(floor) {
  const grid = Array.from({ length: DUNGEON_GRID }, () =>
    Array.from({ length: DUNGEON_GRID }, () => null)
  );

  const rooms = [];
  const targetRooms = randInt(MIN_ROOMS, MAX_ROOMS);

  // Start at center
  const cx = Math.floor(DUNGEON_GRID / 2);
  const cy = Math.floor(DUNGEON_GRID / 2);

  const startRoom = createRoom(cx, cy, ROOM_START, floor);
  grid[cy][cx] = startRoom;
  rooms.push(startRoom);

  // Random walk to place rooms
  let frontier = [{ x: cx, y: cy }];
  let attempts = 0;

  while (rooms.length < targetRooms && attempts < 500) {
    attempts++;
    const base = frontier[randInt(0, frontier.length - 1)];

    // Pick a random direction
    const dir = DIRS[randInt(0, 3)];
    const nx = base.x + dir.dx;
    const ny = base.y + dir.dy;

    // Bounds check
    if (nx < 0 || nx >= DUNGEON_GRID || ny < 0 || ny >= DUNGEON_GRID) continue;
    // Already a room there
    if (grid[ny][nx]) continue;

    const room = createRoom(nx, ny, ROOM_COMBAT, floor);
    grid[ny][nx] = room;
    rooms.push(room);
    frontier.push({ x: nx, y: ny });
  }

  // Connect adjacent rooms (set doors)
  for (const room of rooms) {
    for (const dir of DIRS) {
      const nx = room.gridX + dir.dx;
      const ny = room.gridY + dir.dy;
      if (nx >= 0 && nx < DUNGEON_GRID && ny >= 0 && ny < DUNGEON_GRID && grid[ny][nx]) {
        room.doors[dir.name] = true;
        room.neighbors[dir.name] = grid[ny][nx];
      }
    }
  }

  // Find farthest room from start for boss
  let bossRoom = startRoom;
  let maxDist = 0;
  for (const room of rooms) {
    const d = dist(cx, cy, room.gridX, room.gridY);
    if (d > maxDist) {
      maxDist = d;
      bossRoom = room;
    }
  }
  bossRoom.type = ROOM_BOSS;

  // Place 1-2 treasure rooms (rooms with only 1-2 neighbors, not start/boss)
  const candidates = rooms.filter(r =>
    r.type === ROOM_COMBAT &&
    Object.values(r.neighbors).filter(Boolean).length <= 2 &&
    dist(cx, cy, r.gridX, r.gridY) > 1.5
  );
  shuffleArray(candidates);
  if (candidates.length > 0) candidates[0].type = ROOM_TREASURE;
  if (candidates.length > 2 && floor > 1) candidates[1].type = ROOM_REST;
  if (candidates.length > 3 && floor > 2) candidates[2].type = ROOM_SHOP;

  // Make sure at least 1 combat room remains
  const combatRooms = rooms.filter(r => r.type === ROOM_COMBAT);
  if (combatRooms.length < 3) {
    // Convert some treasure/rest back to combat
    for (const r of rooms) {
      if (combatRooms.length >= 3) break;
      if (r.type === ROOM_REST || r.type === ROOM_SHOP) {
        r.type = ROOM_COMBAT;
        combatRooms.push(r);
      }
    }
  }

  // Populate enemies in combat rooms
  for (const room of rooms) {
    if (room.type === ROOM_COMBAT) {
      room.enemyCount = randInt(3, 4 + floor);
      room.enemyTypes = pickEnemyTypes(floor);
      room.cleared = false;
    } else if (room.type === ROOM_BOSS) {
      room.cleared = false;
      // Boss rooms get extra torches for atmosphere
      room.torches.push(
        { side: 0, x: ROOM_WIDTH / 2 - 80, y: 16, flickerPhase: 0, brightness: 0.9 },
        { side: 0, x: ROOM_WIDTH / 2 + 80, y: 16, flickerPhase: 1.5, brightness: 0.9 },
        { side: 1, x: ROOM_WIDTH / 2 - 80, y: ROOM_HEIGHT - 16, flickerPhase: 3.0, brightness: 0.9 },
        { side: 1, x: ROOM_WIDTH / 2 + 80, y: ROOM_HEIGHT - 16, flickerPhase: 4.5, brightness: 0.9 },
      );
    } else {
      room.cleared = true;  // non-combat rooms start cleared
    }
  }

  return { grid, startRoom, bossRoom, rooms };
}

/**
 * Create a room object.
 */
function createRoom(gx, gy, type, floor) {
  // Color themes per floor
  const themes = [
    { wall: '#1a1a3e', floor: '#0d0d1f', accent: '#00d4ff', name: 'Krypta' },
    { wall: '#1e0d2e', floor: '#120820', accent: '#b44dff', name: 'Abgrund' },
    { wall: '#1a2e0d', floor: '#0d1f08', accent: '#00ff88', name: 'Giftwald' },
    { wall: '#2e1a0d', floor: '#1f0d08', accent: '#ff8833', name: 'Höllentor' },
    { wall: '#2e0d1a', floor: '#1f080d', accent: '#ff3366', name: 'Nexus' },
  ];
  const theme = themes[(floor - 1) % themes.length];

  return {
    gridX: gx,
    gridY: gy,
    type,
    floor,
    doors: { up: false, down: false, left: false, right: false },
    neighbors: { up: null, down: null, left: null, right: null },
    cleared: false,
    enemyCount: 0,
    enemyTypes: [],
    spawned: false,        // enemies haven't been spawned yet
    powerupsSpawned: false,
    theme,
    // Pre-generate some decorative elements
    decorations: generateDecorations(),
    // Atmosphere data
    torches: generateTorches(gx, gy),
    floorDetails: generateFloorDetails(gx, gy),
    ambientColor: generateAmbientColor(theme, type),
  };
}

/**
 * Generate random floor decorations for visual variety.
 */
function generateDecorations() {
  const decos = [];
  const count = randInt(3, 8);
  for (let i = 0; i < count; i++) {
    decos.push({
      x: randRange(80, ROOM_WIDTH - 80),
      y: randRange(80, ROOM_HEIGHT - 80),
      size: randRange(4, 12),
      alpha: randRange(0.05, 0.15),
      shape: randInt(0, 2),  // 0=circle, 1=diamond, 2=cross
    });
  }
  return decos;
}

/**
 * Generate torch/crystal positions on walls.
 * Each torch has a wall side and position along that wall.
 */
function generateTorches(gx, gy) {
  const torches = [];
  // Seed-based randomness for consistent torches per room
  const seed = gx * 73 + gy * 137;
  const count = 2 + (seed % 3);  // 2-4 torches per room

  const wallPad = 64;  // padding from corners
  for (let i = 0; i < count; i++) {
    const s = seed + i * 47;
    const side = s % 4;  // 0=top, 1=bottom, 2=left, 3=right
    const t = {
      side,
      flickerPhase: (s * 0.1) % (Math.PI * 2),
      brightness: randRange(0.6, 1.0),
    };

    // Position along wall
    switch (side) {
      case 0: // top wall
        t.x = wallPad + ((s * 31) % (ROOM_WIDTH - wallPad * 2));
        t.y = 16;
        break;
      case 1: // bottom wall
        t.x = wallPad + ((s * 29) % (ROOM_WIDTH - wallPad * 2));
        t.y = ROOM_HEIGHT - 16;
        break;
      case 2: // left wall
        t.x = 16;
        t.y = wallPad + ((s * 23) % (ROOM_HEIGHT - wallPad * 2));
        break;
      case 3: // right wall
        t.x = ROOM_WIDTH - 16;
        t.y = wallPad + ((s * 19) % (ROOM_HEIGHT - wallPad * 2));
        break;
    }
    torches.push(t);
  }
  return torches;
}

/**
 * Generate floor detail elements: cracks, puddles, rune circles, blood stains.
 */
function generateFloorDetails(gx, gy) {
  const details = [];
  const seed = gx * 53 + gy * 97;
  const wallPad = 48;

  // Cracks (1-3 per room)
  const crackCount = 1 + (seed % 3);
  for (let i = 0; i < crackCount; i++) {
    const s = seed + i * 71;
    details.push({
      type: 'crack',
      x: wallPad + ((s * 41) % (ROOM_WIDTH - wallPad * 2)),
      y: wallPad + ((s * 37) % (ROOM_HEIGHT - wallPad * 2)),
      rotation: (s * 0.5) % (Math.PI * 2),
      length: randRange(20, 60),
      alpha: randRange(0.06, 0.15),
    });
  }

  // Puddles (0-2 per room)
  const puddleCount = (seed * 3) % 3;
  for (let i = 0; i < puddleCount; i++) {
    const s = seed + i * 83 + 100;
    details.push({
      type: 'puddle',
      x: wallPad + ((s * 43) % (ROOM_WIDTH - wallPad * 2)),
      y: wallPad + ((s * 39) % (ROOM_HEIGHT - wallPad * 2)),
      size: randRange(15, 35),
      alpha: randRange(0.04, 0.10),
    });
  }

  // Rune circle (0-1 per room, rare)
  if ((seed * 7) % 5 === 0) {
    details.push({
      type: 'rune',
      x: ROOM_WIDTH / 2 + randRange(-100, 100),
      y: ROOM_HEIGHT / 2 + randRange(-60, 60),
      radius: randRange(25, 45),
      rotation: randRange(0, Math.PI * 2),
      alpha: randRange(0.05, 0.12),
    });
  }

  // Blood stains (only in combat/boss rooms)
  // Will be added dynamically when enemies die

  return details;
}

/**
 * Generate ambient particle color based on theme and room type.
 */
function generateAmbientColor(theme, roomType) {
  // Boss rooms get a reddish tint, treasure gets golden, rest gets blue
  switch (roomType) {
    case ROOM_BOSS: return { r: 255, g: 50, b: 50, intensity: 0.4 };
    case ROOM_TREASURE: return { r: 255, g: 220, b: 80, intensity: 0.2 };
    case ROOM_REST: return { r: 100, g: 150, b: 255, intensity: 0.15 };
    default: return null;  // use theme accent color
  }
}

/**
 * Pick enemy types available for this floor.
 */
function pickEnemyTypes(floor) {
  const allTypes = ['slime', 'skeleton', 'knight', 'swarm', 'mage'];
  // Unlock more enemy types as floors progress
  const available = allTypes.slice(0, Math.min(2 + floor, allTypes.length));
  return available;
}

/**
 * Get the room at a grid position.
 */
export function getRoomAt(dungeon, gx, gy) {
  if (gx < 0 || gx >= DUNGEON_GRID || gy < 0 || gy >= DUNGEON_GRID) return null;
  return dungeon.grid[gy][gx];
}

/**
 * Advance to the next floor.
 */
export function advanceFloor(dungeon, floor) {
  return generateDungeon(floor);
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
