// ============================================================
// RIFT CRAWLER – Sprite Overlay Renderer
// ============================================================

import { state } from './state.js';
import { drawSprite, pickEnemySprite } from './sprites.js';
import { drawPlayerSheetSprite } from './player-sprite-sheet.js';

const ENEMY_SPRITE_ALPHA = 0.72;

/**
 * Draws loaded sprites over the existing Canvas primitive renderer.
 * Temporary integration layer until player/enemy renderers use sprites directly.
 */
export function drawSpriteOverlay(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  drawEnemySprites(ctx);
  drawPlayerSprite(ctx);
  ctx.restore();
}

function drawPlayerSprite(ctx) {
  const p = state.player;
  if (!p) return;

  drawPlayerSheetSprite(ctx, p);
}

function drawEnemySprites(ctx) {
  for (const e of state.enemies) {
    const spriteName = pickEnemySprite(e);
    const scale = enemySpriteScale(e);
    const rotation = enemySpriteRotation(e);
    const hitAlpha = e.hitFlash > 0 ? 0.9 : 1;

    drawSprite(ctx, spriteName, e.x, e.y, {
      alpha: ENEMY_SPRITE_ALPHA * hitAlpha,
      rotation,
      scale,
    });
  }
}

function enemySpriteScale(enemy) {
  if (enemy.type === 'boss') return enemy.size / 30;
  if (enemy.type === 'swarm') return enemy.size / 12;
  return enemy.size / 18;
}

function enemySpriteRotation(enemy) {
  if (enemy.type === 'knight') return enemy.facing || 0;
  if (enemy.type === 'boss') return Math.sin(state.time * 1.5) * 0.05;
  return 0;
}
