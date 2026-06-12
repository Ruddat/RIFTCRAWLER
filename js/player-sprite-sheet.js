// ============================================================
// RIFT CRAWLER – Player Rogue Sprite Sheet Renderer
// ============================================================

import { state } from './state.js';

const PLAYER_SHEET_URL = 'assets/sprites/player-rogue-sheet.png';
const FRAME_SIZE = 128;
const COLUMNS = 4;

const playerSheet = new Image();
let ready = false;
let failed = false;

playerSheet.onload = () => {
  ready = true;
};
playerSheet.onerror = () => {
  failed = true;
  console.warn('[player-sprite] Missing asset:', PLAYER_SHEET_URL);
};
playerSheet.src = PLAYER_SHEET_URL;

export function isPlayerSpriteReady() {
  return ready && !failed;
}

export function drawPlayerSheetSprite(ctx, player) {
  if (!isPlayerSpriteReady() || !player) return false;

  const frame = pickPlayerFrame(player);
  const sx = frame.col * FRAME_SIZE;
  const sy = frame.row * FRAME_SIZE;

  const attacking = player.attacking || player.levelUpFlash > 0;
  const drawSize = attacking ? 96 : 78;
  const half = drawSize / 2;

  const alpha = player.invincible && Math.floor(state.time * 15) % 2 === 0 ? 0.55 : 1;

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(
    playerSheet,
    sx,
    sy,
    FRAME_SIZE,
    FRAME_SIZE,
    player.x - half,
    player.y - half,
    drawSize,
    drawSize
  );
  ctx.restore();

  return true;
}

function pickPlayerFrame(player) {
  const dir = directionColumn(player.facing ?? 0);

  if (player.attacking || player.levelUpFlash > 0) {
    return { row: 3, col: dir };
  }

  const moving = Math.abs(player.vx || 0) + Math.abs(player.vy || 0) > 1;
  if (moving) {
    const step = Math.floor(state.time * 8) % 2;
    return { row: step ? 2 : 1, col: dir };
  }

  return { row: 0, col: dir };
}

function directionColumn(angle) {
  const full = Math.PI * 2;
  const a = ((angle % full) + full) % full;

  // Columns: 0 front/down, 1 back/up, 2 right, 3 left
  if (a >= Math.PI * 0.25 && a < Math.PI * 0.75) return 0;
  if (a >= Math.PI * 0.75 && a < Math.PI * 1.25) return 3;
  if (a >= Math.PI * 1.25 && a < Math.PI * 1.75) return 1;
  return 2;
}
