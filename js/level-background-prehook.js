// ============================================================
// RIFT CRAWLER – Level Background Prehook
// ============================================================
// Controlled compatibility hook: only replaces the room's base floor fill with
// the dungeon artwork. It must NOT replace full-room overlays such as weather,
// flashes, fog, gradients or HUD masks.

const ROOM_WIDTH = 1216;
const ROOM_HEIGHT = 608;
const LEVEL1_BACKGROUND_URL = 'assets/backgrounds/level1-dungeon.png';

const FLOOR_COLORS = new Set([
  '#0d0d1f', 'rgb(13, 13, 31)',
  '#120820', 'rgb(18, 8, 32)',
  '#0d1f08', 'rgb(13, 31, 8)',
  '#1f0d08', 'rgb(31, 13, 8)',
  '#1f080d', 'rgb(31, 8, 13)',
]);

const levelBackground = new Image();
let levelBackgroundReady = false;

levelBackground.onload = () => {
  levelBackgroundReady = true;
};
levelBackground.src = LEVEL1_BACKGROUND_URL;

const nativeFillRect = CanvasRenderingContext2D.prototype.fillRect;

CanvasRenderingContext2D.prototype.fillRect = function patchedFillRect(x, y, w, h) {
  const isFullRoomRect = x === 0 && y === 0 && w === ROOM_WIDTH && h === ROOM_HEIGHT;
  const fillStyle = typeof this.fillStyle === 'string' ? this.fillStyle.toLowerCase() : '';
  const isBaseFloorFill = FLOOR_COLORS.has(fillStyle);

  if (isFullRoomRect && isBaseFloorFill && levelBackgroundReady) {
    this.save();
    this.globalAlpha = 1;
    this.globalCompositeOperation = 'source-over';
    this.shadowBlur = 0;
    this.drawImage(levelBackground, 0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    this.restore();
    return;
  }

  return nativeFillRect.call(this, x, y, w, h);
};
