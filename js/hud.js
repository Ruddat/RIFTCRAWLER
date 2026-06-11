// ============================================================
// RIFT CRAWLER – Neon HUD Overlay
// ============================================================

import {
  CANVAS_WIDTH, CANVAS_HEIGHT, DUNGEON_GRID,
  NEON_BLUE, NEON_GREEN, NEON_RED, NEON_YELLOW, NEON_PURPLE, NEON_ORANGE,
} from './config.js';
import { state } from './state.js';

const PANEL = 'rgba(5, 8, 18, 0.72)';
const PANEL_DARK = 'rgba(3, 5, 12, 0.88)';
const TEXT_DIM = 'rgba(210, 235, 255, 0.55)';
const TEXT_SOFT = 'rgba(235, 248, 255, 0.84)';

export function drawHud(ctx) {
  const p = state.player;
  const room = window.__room_getCurrentRoom ? window.__room_getCurrentRoom() : null;

  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  drawLetterbox(ctx);
  drawFrame(ctx);
  drawVitals(ctx, p);
  drawRoomPanel(ctx, room);
  drawStats(ctx, p);
  drawXP(ctx, p);
  drawDoorHint(ctx, room);
  drawSkills(ctx, p);
  drawBuffs(ctx, p);
  drawCombo(ctx);
  drawRoomCleared(ctx, room);
  drawMinimap(ctx);

  ctx.restore();
}

function drawLetterbox(ctx) {
  const tg = ctx.createLinearGradient(0, 0, 0, 78);
  tg.addColorStop(0, 'rgba(3,5,14,.96)');
  tg.addColorStop(.7, 'rgba(4,7,18,.82)');
  tg.addColorStop(1, 'rgba(4,7,18,0)');
  ctx.fillStyle = tg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, 78);

  const bg = ctx.createLinearGradient(0, CANVAS_HEIGHT - 90, 0, CANVAS_HEIGHT);
  bg.addColorStop(0, 'rgba(4,7,18,0)');
  bg.addColorStop(.35, 'rgba(4,7,18,.84)');
  bg.addColorStop(1, 'rgba(3,5,14,.96)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, CANVAS_HEIGHT - 90, CANVAS_WIDTH, 90);
}

function drawFrame(ctx) {
  ctx.save();
  ctx.globalAlpha = .7;
  ctx.strokeStyle = 'rgba(0,212,255,.42)';
  ctx.lineWidth = 1;
  chamferPath(ctx, 10, 8, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 16, 14);
  ctx.stroke();
  ctx.globalAlpha = .22;
  ctx.shadowColor = NEON_BLUE;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = NEON_BLUE;
  chamferPath(ctx, 24, 38, CANVAS_WIDTH - 48, CANVAS_HEIGHT - 80, 10);
  ctx.stroke();
  ctx.restore();

  diamond(ctx, CANVAS_WIDTH / 2, 11, 5, NEON_BLUE, .75);
  diamond(ctx, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 11, 5, NEON_BLUE, .45);
  diamond(ctx, 12, CANVAS_HEIGHT / 2, 4, NEON_BLUE, .35);
  diamond(ctx, CANVAS_WIDTH - 12, CANVAS_HEIGHT / 2, 4, NEON_BLUE, .35);
}

function drawVitals(ctx, p) {
  panel(ctx, 18, 14, 280, 36, 10, PANEL, 'rgba(255,51,102,.28)');
  const maxHp = Math.max(1, p.maxHp || 5);
  for (let i = 0; i < maxHp; i++) {
    heart(ctx, 38 + i * 30, 31, 9, i < (p.hp || 0) ? NEON_RED : 'rgba(255,255,255,.14)', i < (p.hp || 0));
  }
  const lives = Math.max(0, (p.lives ?? 0) + 1);
  glowText(ctx, 'x' + lives, 214, 37, '#ff77bc', 'bold 18px monospace', 'left');

  if (p.shield) {
    const frac = clamp01((p.shieldTimer || 0) / Math.max(.001, p.shieldMaxTime || 1));
    slimBar(ctx, 28, 46, 142, 5, frac, NEON_BLUE, 'SHIELD');
  }
}

function drawRoomPanel(ctx, room) {
  const w = 340;
  const x = (CANVAS_WIDTH - w) / 2;
  panel(ctx, x, 7, w, 47, 14, PANEL_DARK, 'rgba(0,212,255,.5)');
  const floorName = room?.theme?.name || 'Krypta';
  glowText(ctx, `ETAGE ${state.floor} - ${floorName}`, CANVAS_WIDTH / 2, 30, NEON_BLUE, 'bold 20px monospace', 'center');
  ctx.fillStyle = room?.type === 'boss' ? NEON_RED : TEXT_DIM;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(roomLabel(room?.type || 'start'), CANVAS_WIDTH / 2, 45);
  diamond(ctx, x + 16, 31, 4, NEON_BLUE, .65);
  diamond(ctx, x + w - 16, 31, 4, NEON_BLUE, .65);
}

function drawStats(ctx, p) {
  const x = CANVAS_WIDTH - 306;
  panel(ctx, x, 14, 288, 54, 10, PANEL, 'rgba(0,212,255,.28)');
  coin(ctx, x + 24, 28);
  glowText(ctx, String(p.gold ?? 0), x + 42, 33, NEON_YELLOW, 'bold 16px monospace', 'left');
  diamond(ctx, x + 116, 27, 6, NEON_PURPLE, .9);
  glowText(ctx, String(state.score ?? 0), x + 132, 33, NEON_PURPLE, 'bold 16px monospace', 'left');
  glowText(ctx, `WPN LV${p.weaponLevel || 1}`, x + 24, 57, NEON_BLUE, 'bold 14px monospace', 'left');
  glowText(ctx, `B:${p.bombs ?? 0}`, x + 186, 57, NEON_ORANGE, 'bold 16px monospace', 'left');
}

function drawXP(ctx, p) {
  const x = 24;
  const y = CANVAS_HEIGHT - 42;
  diamondBadge(ctx, x + 14, y + 9, String(state.floor || 1));
  const xp = state.xp ?? p.xp ?? 45;
  const xpMax = state.xpToNext ?? p.xpToNext ?? 100;
  const frac = clamp01(xp / Math.max(1, xpMax));
  ctx.fillStyle = NEON_BLUE;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('XP', x + 44, y + 14);
  slimBar(ctx, x + 72, y + 5, 180, 8, frac, NEON_BLUE, '');
  ctx.fillStyle = TEXT_SOFT;
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`${Math.round(xp)} / ${Math.round(xpMax)}`, x + 264, y + 14);
}

function drawDoorHint(ctx, room) {
  if (!room || !state.doorsOpen) return;
  const dirs = Object.entries(room.doors || {}).filter(([, open]) => open).map(([dir]) => dir);
  if (!dirs.length) return;
  const x = CANVAS_WIDTH / 2 - 44;
  const y = CANVAS_HEIGHT - 61;
  panel(ctx, x, y, 88, 42, 9, 'rgba(2,20,20,.72)', 'rgba(0,255,136,.54)');
  glowText(ctx, doorGlyph(dirs), CANVAS_WIDTH / 2, y + 28, NEON_GREEN, 'bold 20px monospace', 'center');
}

function drawSkills(ctx, p) {
  const y = CANVAS_HEIGHT - 86;
  const size = 64;
  const gap = 10;
  const startX = CANVAS_WIDTH - (size * 3 + gap * 2) - 28;
  skill(ctx, startX, y, size, 'DASH', 'SHIFT', NEON_BLUE, 'dash', dashFrac(p));
  skill(ctx, startX + size + gap, y, size, 'BOMB', 'Q', NEON_PURPLE, 'bomb', (p.bombs || 0) > 0 ? 1 : 0);
  const ready = p.specialWeapon && (p.specialAmmo || 0) > 0;
  skill(ctx, startX + (size + gap) * 2, y, size, specialLabel(p.specialWeapon), 'R', '#ff4faa', 'special', ready ? 1 : .22);
}

function drawBuffs(ctx, p) {
  const buffs = [];
  if (p.shield) buffs.push({ label: 'SHD', color: NEON_BLUE, frac: clamp01((p.shieldTimer || 0) / Math.max(.001, p.shieldMaxTime || 1)) });
  if (p.berserkTimer > 0) buffs.push({ label: 'BRK', color: NEON_RED, frac: clamp01(p.berserkTimer / 10) });
  if (p.speedBoostTimer > 0) buffs.push({ label: 'SPD', color: NEON_GREEN, frac: clamp01(p.speedBoostTimer / 8) });
  if (p.magnetTimer > 0) buffs.push({ label: 'MAG', color: NEON_PURPLE, frac: clamp01(p.magnetTimer / 8) });
  if (state.slowMotion && state.slowMotion < 1) buffs.push({ label: 'SLO', color: NEON_YELLOW, frac: 1 });
  if (!buffs.length) return;
  let x = 24;
  const y = CANVAS_HEIGHT - 82;
  for (const b of buffs.slice(0, 5)) {
    panel(ctx, x, y, 44, 22, 6, 'rgba(4,7,18,.72)', b.color + '88');
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = b.color;
    ctx.fillText(b.label, x + 22, y + 15);
    slimBar(ctx, x + 6, y + 18, 32, 3, b.frac, b.color, '');
    x += 54;
  }
}

function drawCombo(ctx) {
  if (!state.combo || state.combo <= 1) return;
  const color = state.combo >= 10 ? NEON_PURPLE : state.combo >= 5 ? NEON_ORANGE : NEON_YELLOW;
  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 118);
  const s = 1 + Math.sin(state.time * 8) * .08;
  ctx.scale(s, s);
  glowText(ctx, `x${state.combo} COMBO`, 0, 0, color, 'bold 24px monospace', 'center');
  ctx.restore();
}

function drawRoomCleared(ctx, room) {
  if (!state.roomCleared || !state.doorsOpen || room?.type !== 'combat') return;
  ctx.save();
  ctx.globalAlpha = .5 + Math.sin(state.time * 5) * .18;
  glowText(ctx, 'RAUM GELOEST', CANVAS_WIDTH / 2, 104, NEON_GREEN, 'bold 18px monospace', 'center');
  ctx.restore();
}

function drawMinimap(ctx) {
  if (!state.dungeon) return;
  const s = 5;
  const pad = 2;
  const w = DUNGEON_GRID * (s + pad) + 14;
  const h = DUNGEON_GRID * (s + pad) + 14;
  const ox = CANVAS_WIDTH - w - 34;
  const oy = CANVAS_HEIGHT - h - 18;
  panel(ctx, ox - 8, oy - 8, w + 16, h + 16, 8, 'rgba(3,5,12,.64)', 'rgba(0,212,255,.16)');
  for (let gy = 0; gy < DUNGEON_GRID; gy++) {
    for (let gx = 0; gx < DUNGEON_GRID; gx++) {
      const room = state.dungeon.grid[gy][gx];
      const rx = ox + 7 + gx * (s + pad);
      const ry = oy + 7 + gy * (s + pad);
      if (!room) {
        ctx.fillStyle = 'rgba(255,255,255,.025)';
        ctx.fillRect(rx, ry, s, s);
        continue;
      }
      const key = gx + ',' + gy;
      const visited = state.visitedRooms.has(key);
      const current = state.currentRoom.x === gx && state.currentRoom.y === gy;
      if (!visited && !current) {
        ctx.fillStyle = 'rgba(255,255,255,.055)';
        ctx.fillRect(rx, ry, s, s);
        continue;
      }
      const color = roomColor(room.type);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = current ? 8 : 3;
      ctx.fillRect(rx, ry, s, s);
      ctx.shadowBlur = 0;
      if (current) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx - 2, ry - 2, s + 4, s + 4);
      }
      ctx.strokeStyle = 'rgba(200,240,255,.17)';
      if (room.doors.right && gx + 1 < DUNGEON_GRID) {
        ctx.beginPath();
        ctx.moveTo(rx + s, ry + s / 2);
        ctx.lineTo(rx + s + pad, ry + s / 2);
        ctx.stroke();
      }
      if (room.doors.down && gy + 1 < DUNGEON_GRID) {
        ctx.beginPath();
        ctx.moveTo(rx + s / 2, ry + s);
        ctx.lineTo(rx + s / 2, ry + s + pad);
        ctx.stroke();
      }
    }
  }
}

function panel(ctx, x, y, w, h, cut, fill, stroke) {
  ctx.save();
  chamferPath(ctx, x, y, w, h, cut);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.2;
  ctx.shadowColor = stroke;
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.globalAlpha = .18;
  ctx.strokeStyle = '#fff';
  chamferPath(ctx, x + 3, y + 3, w - 6, h - 6, Math.max(2, cut - 3));
  ctx.stroke();
  ctx.restore();
}

function chamferPath(ctx, x, y, w, h, cut) {
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w - cut, y);
  ctx.lineTo(x + w, y + cut);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x + cut, y + h);
  ctx.lineTo(x, y + h - cut);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
}

function heart(ctx, x, y, size, color, glow = true) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = glow ? '#ffb0cf' : 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1.2;
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
  ctx.beginPath();
  ctx.moveTo(x, y + size * .35);
  ctx.bezierCurveTo(x, y - size * .45, x - size * 1.1, y - size * .35, x - size * 1.1, y + size * .15);
  ctx.bezierCurveTo(x - size * 1.1, y + size * .8, x, y + size * 1.25, x, y + size * 1.25);
  ctx.bezierCurveTo(x, y + size * 1.25, x + size * 1.1, y + size * .8, x + size * 1.1, y + size * .15);
  ctx.bezierCurveTo(x + size * 1.1, y - size * .35, x, y - size * .45, x, y + size * .35);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function slimBar(ctx, x, y, w, h, frac, color, label) {
  ctx.save();
  roundedPath(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fill();
  roundedPath(ctx, x, y, w * clamp01(frac), h, h / 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  if (label) {
    ctx.fillStyle = color;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + w + 8, y + h + 1);
  }
  ctx.restore();
}

function roundedPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function skill(ctx, x, y, size, label, key, color, icon, readyFrac) {
  const active = readyFrac >= .98;
  panel(ctx, x, y, size, 76, 9, active ? 'rgba(3,12,20,.82)' : 'rgba(4,5,12,.68)', color + (active ? 'aa' : '55'));
  ctx.save();
  ctx.globalAlpha = active ? 1 : .42;
  ctx.translate(x + size / 2, y + 24);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 11;
  ctx.lineWidth = 2.4;
  skillIcon(ctx, icon);
  ctx.restore();
  if (!active) {
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(x + 4, y + 4, size - 8, (76 - 8) * (1 - clamp01(readyFrac)));
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = active ? color : 'rgba(220,235,255,.45)';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(label.slice(0, 7), x + size / 2, y + 55);
  ctx.fillStyle = active ? TEXT_SOFT : 'rgba(220,235,255,.38)';
  ctx.font = 'bold 9px monospace';
  ctx.fillText(key, x + size / 2, y + 69);
}

function skillIcon(ctx, icon) {
  if (icon === 'dash') {
    ctx.beginPath(); ctx.moveTo(-15, -5); ctx.lineTo(9, -5); ctx.moveTo(-10, 0); ctx.lineTo(16, 0); ctx.moveTo(-15, 5); ctx.lineTo(7, 5); ctx.stroke(); return;
  }
  if (icon === 'bomb') {
    ctx.beginPath(); ctx.arc(0, 3, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -7); ctx.quadraticCurveTo(11, -15, 16, -8); ctx.stroke();
    ctx.beginPath(); ctx.arc(17, -9, 2, 0, Math.PI * 2); ctx.fill(); return;
  }
  ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.moveTo(0, -18); ctx.lineTo(0, 18); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
}

function diamond(ctx, x, y, r, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); ctx.restore();
}

function diamondBadge(ctx, x, y, text) {
  ctx.save(); ctx.strokeStyle = NEON_BLUE; ctx.fillStyle = 'rgba(0,30,45,.72)'; ctx.shadowColor = NEON_BLUE; ctx.shadowBlur = 7;
  ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x + 16, y); ctx.lineTo(x, y + 16); ctx.lineTo(x - 16, y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = TEXT_SOFT; ctx.textAlign = 'center'; ctx.font = 'bold 12px monospace'; ctx.fillText(text, x, y + 4); ctx.restore();
}

function coin(ctx, x, y) {
  ctx.save(); ctx.strokeStyle = NEON_YELLOW; ctx.fillStyle = 'rgba(255,228,77,.18)'; ctx.shadowColor = NEON_YELLOW; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = NEON_YELLOW; ctx.fillText('G', x, y + 4); ctx.restore();
}

function glowText(ctx, text, x, y, color, font, align = 'left') {
  ctx.save(); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.font = font; ctx.textAlign = align; ctx.fillText(text, x, y); ctx.restore();
}

function dashFrac(p) { const cd = p.dashCooldown || 0; return cd <= 0 ? 1 : clamp01(1 - cd / .8); }
function clamp01(v) { return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0)); }
function roomLabel(type) { return ({ start: 'START', combat: state.doorsOpen ? 'CLEARED' : 'KAMPF', treasure: 'SCHATZ', shop: 'SHOP', rest: 'RUHE', boss: 'BOSS' })[type] || String(type || '').toUpperCase(); }
function roomColor(type) { return ({ start: NEON_BLUE, combat: '#7f8ea3', treasure: NEON_YELLOW, boss: NEON_RED, shop: NEON_GREEN, rest: NEON_PURPLE })[type] || '#3b4a5d'; }
function doorGlyph(dirs) { if (dirs.includes('down')) return 'v'; if (dirs.includes('right')) return '>'; if (dirs.includes('left')) return '<'; if (dirs.includes('up')) return '^'; return '*'; }
function specialLabel(type) { return ({ laser: 'LASER', rocket: 'RAKETE', flamethrower: 'FEUER', lightningBolt: 'BLITZ' })[type] || 'SPECIAL'; }
