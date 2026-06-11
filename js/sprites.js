// ============================================================
// RIFT CRAWLER – Sprite Sheet Loader & Renderer
// ============================================================

const DEFAULT_MANIFEST_URL = 'assets/sprites/riftcrawler-sprites.json';

export const sprites = {
  image: null,
  manifest: null,
  ready: false,
  failed: false,
};

/**
 * Loads the default sprite manifest and image.
 * The game keeps working without sprites; renderers can fall back to Canvas primitives.
 */
export async function loadSprites(manifestUrl = DEFAULT_MANIFEST_URL) {
  if (sprites.ready || sprites.failed) return sprites;

  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`Sprite manifest failed: ${response.status}`);

    const manifest = await response.json();
    const image = new Image();

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error(`Sprite image failed: ${manifest.image}`));
      image.src = manifest.image;
    });

    sprites.manifest = manifest;
    sprites.image = image;
    sprites.ready = true;
    return sprites;
  } catch (error) {
    sprites.failed = true;
    console.warn('[sprites] Falling back to primitive Canvas rendering:', error);
    return sprites;
  }
}

export function hasSprite(name) {
  return Boolean(sprites.ready && sprites.manifest?.frames?.[name]);
}

export function getSpriteFrame(name) {
  return sprites.manifest?.frames?.[name] || null;
}

/**
 * Draws a named sprite centered on x/y.
 * Options:
 * - scale: uniform multiplier, default 1
 * - rotation: radians, default 0
 * - alpha: global alpha multiplier, default 1
 * - flipX / flipY: mirrored draw without changing source frame
 */
export function drawSprite(ctx, name, x, y, options = {}) {
  if (!hasSprite(name)) return false;

  const frame = getSpriteFrame(name);
  const scale = options.scale ?? 1;
  const rotation = options.rotation ?? 0;
  const alpha = options.alpha ?? 1;
  const flipX = options.flipX ? -1 : 1;
  const flipY = options.flipY ? -1 : 1;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(flipX * scale, flipY * scale);
  ctx.globalAlpha *= alpha;
  ctx.drawImage(
    sprites.image,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    -frame.pivotX,
    -frame.pivotY,
    frame.w,
    frame.h
  );
  ctx.restore();

  return true;
}

export function pickPlayerSprite(player) {
  if (player.damageFlash > 0) return 'player.hit';
  if (player.powerupGlow > 0 || player.levelUpFlash > 0) return 'player.power';
  if (player.dashing) return 'player.dash';
  if (player.attacking) return 'player.attack';

  const facing = player.facing ?? 0;
  const normalized = ((facing % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  if (normalized >= Math.PI * 0.25 && normalized < Math.PI * 0.75) return 'player.down';
  if (normalized >= Math.PI * 0.75 && normalized < Math.PI * 1.25) return 'player.left';
  if (normalized >= Math.PI * 1.25 && normalized < Math.PI * 1.75) return 'player.up';
  return 'player.right';
}

export function pickEnemySprite(enemy) {
  if (enemy.type === 'boss') {
    if (enemy.phase >= 3) return 'enemy.boss.phase3';
    if (enemy.phase >= 2) return 'enemy.boss.phase2';
  }
  return `enemy.${enemy.type}`;
}
