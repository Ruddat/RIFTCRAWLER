// ============================================================
// RIFT CRAWLER – Configuration & Constants
// ============================================================

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const STORAGE_KEY = 'riftCrawlerHighscore';

// Tile & Room
export const TILE_SIZE = 32;
export const ROOM_TILES_X = 38;                        // playable tiles horizontally
export const ROOM_TILES_Y = 19;                        // playable tiles vertically
export const ROOM_WIDTH = ROOM_TILES_X * TILE_SIZE;    // 1216
export const ROOM_HEIGHT = ROOM_TILES_Y * TILE_SIZE;   // 608
export const ROOM_OFFSET_X = (CANVAS_WIDTH - ROOM_WIDTH) / 2;   // 32
export const ROOM_OFFSET_Y = 56;                               // HUD space at top
export const WALL_THICKNESS = 1;                               // 1 tile walls
export const DOOR_WIDTH = 2;                                   // 2 tiles wide doors

// Dungeon
export const DUNGEON_GRID = 7;          // 7x7 potential room grid
export const MIN_ROOMS = 9;
export const MAX_ROOMS = 14;
export const FLOORS_PER_RUN = 5;

// Player defaults
export const PLAYER_SPEED = 180;
export const PLAYER_MAX_HP = 5;
export const PLAYER_SIZE = 14;          // radius
export const ATTACK_DURATION = 0.2;     // seconds
export const ATTACK_COOLDOWN = 0.35;
export const ATTACK_RANGE = 48;
export const ATTACK_ARC = Math.PI * 0.7;  // ~126° swing
export const DASH_SPEED = 500;
export const DASH_DURATION = 0.15;
export const DASH_COOLDOWN = 0.8;
export const INVINCIBLE_TIME = 1.0;
export const SHOOT_COOLDOWN = 0.4;
export const BULLET_SPEED = 400;
export const BULLET_SIZE = 5;

// Enemy defaults
export const ENEMY_SPAWN_PADDING = 60;  // don't spawn near doors
export const KNOCKBACK_FORCE = 200;
export const KNOCKBACK_DURATION = 0.15;

// Visual
export const NEON_BLUE = '#00d4ff';
export const NEON_GREEN = '#00ff88';
export const NEON_RED = '#ff3366';
export const NEON_YELLOW = '#ffe44d';
export const NEON_PURPLE = '#b44dff';
export const NEON_ORANGE = '#ff8833';
export const DARK_BG = '#0a0a14';
export const DARK_WALL = '#1a1a2e';
export const DARK_FLOOR = '#12121f';

// Camera
export const CAMERA_LERP = 8;           // smoothing factor
export const TRANSITION_TIME = 0.3;     // room transition duration
