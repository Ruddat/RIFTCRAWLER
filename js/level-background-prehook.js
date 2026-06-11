// ============================================================
// RIFT CRAWLER – Level Background Prehook
// ============================================================
// Draws a static level background underneath the existing room details without
// touching the room module yet. The hook only replaces the full room floor fill.

const ROOM_WIDTH = 1216;
const ROOM_HEIGHT = 608;
const LEVEL1_BACKGROUND_URL = 'assets/backgrounds/level1-dungeon.png';

const levelBackground = new Image();
let levelBackgroundReady = false;

levelBackground.onload = () => {
  levelBackgroundReady = true;
};
levelBackground.src = LEVEL1_BACKGROUND_URL;

const nativeFillRect = CanvasRenderingContext2D.prototype.fillRect;

CanvasRenderingContext2D.prototype.fillRect = function patchedFillRect(x, y, w, h) {
  const isRoomFloorFill = x === 0 && y === 0 && w === ROOM_WIDTH && h === ROOM_HEIGHT;

  if (isRoomFloorFill && levelBackgroundReady) {
    this.save();
    this.drawImage(levelBackground, 0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    this.restore();
    return;
  }

  return nativeFillRect.call(this, x, y, w, h);
};
