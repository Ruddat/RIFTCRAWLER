// ============================================================
// RIFT CRAWLER – Sprite Overlay Renderer
// ============================================================

import { state } from './state.js';
import { PLAYER_SIZE } from './config.js';
import { drawSprite, pickEnemySprite, pickPlayerSprite } from './sprites.js';

/**
 * Draws loaded sprites over the existing Canvas primitive renderer.
 * This keeps the old rendering as a safe fallback while the sprite system is introduced.
 */
export function drawSpriteOverlay(ctx) {
  drawEnemySprites(ctx);
  drawPlayerSprite(ctx);
}

function drawPlayerSprite(ctx) {
  const p = state.player;
  if (!p) return;

  const alpha = p.invincible && Math.floor(state.time * 15) % 2 === 0 ? 0.65 : 1;
  const rotation = (p.attacking || p.dashing) ? p.facing : 0;
  const scale = Math.max(0.82, PLAYER_SIZE / 20);

  drawSprite(ctx, pickPlayerSprite(p), p.x, p.y, {
    alpha,
    rotation,
    scale,
  });
}

function drawEnemySprites(ctx) {
  for (const e of state.enemies) {
    const spriteName = pickEnemySprite(e);
    const scale = enemySpriteScale(e);
    const rotation = enemySpriteRotation(e);
    const alpha = e.hitFlash > 0 ? 0.82 : 1;

    drawSprite(ctx, spriteName, e.x, e.y, {
      alpha,
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
