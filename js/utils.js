// ============================================================
// RIFT CRAWLER – Utility Helpers
// ============================================================

/** Clamp a value between min and max. */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/** Linear interpolation. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Distance between two points. */
export function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Angle from (x1,y1) to (x2,y2). */
export function angleBetween(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/** Normalize angle difference to [-PI, PI]. */
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Random float in [min, max). */
export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

/** Random integer in [min, max]. */
export function randInt(min, max) {
  return Math.floor(randRange(min, max + 1));
}

/** Pick a random element from an array. */
export function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Weighted random pick – items are { item, weight }. */
export function weightedPick(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const i of items) {
    r -= i.weight;
    if (r <= 0) return i.item;
  }
  return items[items.length - 1].item;
}

/** Circle-rectangle collision. */
export function circleRect(cx, cy, cr, rx, ry, rw, rh) {
  const nearX = clamp(cx, rx, rx + rw);
  const nearY = clamp(cy, ry, ry + rh);
  return dist(cx, cy, nearX, nearY) <= cr;
}

/** Circle-circle collision. */
export function circleCircle(x1, y1, r1, x2, y2, r2) {
  return dist(x1, y1, x2, y2) <= r1 + r2;
}

/** Check if point is inside an arc (angle from center). */
export function pointInArc(px, py, cx, cy, radius, facing, arc) {
  const d = dist(cx, cy, px, py);
  if (d > radius) return false;
  const a = Math.atan2(py - cy, px - cx);
  return Math.abs(angleDiff(facing, a)) <= arc / 2;
}

/** Ease out cubic. */
export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/** Ease in out cubic. */
export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
