// ============================================================
// RIFT CRAWLER – Sprite Overlay Renderer
// ============================================================

import { state } from './state.js';
import { PLAYER_SIZE } from './config.js';
import { drawSprite, pickEnemySprite, pickPlayerSprite } from './sprites.js';

const SPRITE_OVERLAY_ALPHA = 0.72;

/**
 * Draws loaded sprites over the existing Canvas primitive renderer.
 * Temporary integration layer until player/enemy renderers use sprites directly.
 */
export function drawSpriteOverlay(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawEnemySprites(ctx);
  drawPlayerSprite(ctx);
  ctx.restore();
}

function drawPlayerSprite(ctx) {
  const p = state.player;
  if (!p) return;

  const blinkAlpha = p.invincible && Math.floor(state.time * 15) % 2 === 0 ? 0.45 : 1;
  const rotation = (p.attacking || p.dashing) ? p.facing : 0;
  const scale = Math.max(0.82, PLAYER_SIZE / 20);

  drawSprite(ctx, pickPlayerSprite(p), p.x, p.y, {
    alpha: SPRITE_OVERLAY_ALPHA * blinkAlpha,
    rotation,
    scale,
  });
}

function drawEnemySprites(ctx) {
  for (const e of state.enemies) {
    const spriteName = pickEnemySprite(e);
    const scale = enemySpriteScale(e);
    const rotation = enemySpriteRotation(e);
    const hitAlpha = e.hitFlash > 0 ? 0.9 : 1;

    drawSprite(ctx, spriteName, e.x, e.y, {
      alpha: SPRITE_OVERLAY_ALPHA * hitAlpha,
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
