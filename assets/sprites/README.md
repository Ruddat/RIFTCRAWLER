# RiftCrawler Sprite Sheet

Dieses Verzeichnis enthält den ersten echten Sprite-Sheet-Ansatz für RiftCrawler.

## Dateien

- `riftcrawler-sprites.svg` – 512×256 Sprite-Sheet mit 64×64 Frames
- `riftcrawler-sprites.json` – Manifest mit festen Frame-Koordinaten
- `../../js/sprites.js` – Loader + `drawSprite()` Helper

## Raster

Das Sheet ist in 8 Spalten × 4 Reihen organisiert.

| Reihe | Inhalt |
|------:|--------|
| 0 | Player Frames: down, right, up, left, attack, dash, hit, power |
| 1 | Gegner: slime, skeleton, knight, swarm, mage, boss, boss phase 2, boss phase 3 |
| 2 | Projektile und Items: bullet, enemy bullet, bomb, gold, heart, speed, weapon, shield |
| 3 | Dungeon-Objekte: door, chest, rift, stairs, trap, exit |

## Renderer-Plan

Die aktuelle Engine rendert Player und Gegner noch per Canvas-Primitives. Das Sheet ist absichtlich kompatibel dazu vorbereitet:

```js
import { loadSprites, drawSprite, pickPlayerSprite, pickEnemySprite } from './sprites.js';

await loadSprites();
drawSprite(ctx, pickPlayerSprite(state.player), state.player.x, state.player.y, { scale: 1 });
drawSprite(ctx, pickEnemySprite(enemy), enemy.x, enemy.y, { scale: enemy.size / 18 });
```

Wichtig: Der Loader fällt defensiv auf das alte Canvas-Rendering zurück, falls Manifest oder SVG nicht geladen werden können.

## Nächster Umbau

1. `main.js` lädt `loadSprites()` beim Init.
2. `player.js` nutzt `drawSprite()` zuerst, alte Primitive bleiben Fallback.
3. `enemies.js` nutzt `drawSprite()` zuerst, alte Primitive bleiben Fallback.
4. Danach können wir die Primitives schrittweise entfernen oder als Low-Fi-Fallback behalten.
