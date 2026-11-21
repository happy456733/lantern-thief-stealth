// Line of sight on the tile grid: ray casting against solid tiles.
// Both the guard's eyes and the vision-cone drawing use these helpers.
import { TILE, COLS, ROWS } from './config.js';
import { isSolid } from './levels.js';

// March a ray from (x0, y0) toward angle `a` in small steps; return the
// distance to the first solid tile, or `maxDist` when nothing blocks it.
export function castRay(solids, x0, y0, a, maxDist) {
  const step = 6;
  const dx = Math.cos(a) * step;
  const dy = Math.sin(a) * step;
  let x = x0;
  let y = y0;
  for (let d = 0; d < maxDist; d += step) {
    x += dx;
    y += dy;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return d;
    if (isSolid(solids, tx, ty)) return d;
  }
  return maxDist;
}

// True when nothing solid stands between two points.
export function hasLineOfSight(solids, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const steps = Math.ceil(dist / 5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((x0 + dx * t) / TILE);
    const ty = Math.floor((y0 + dy * t) / TILE);
    if (isSolid(solids, tx, ty)) return false;
  }
  return true;
}

// The visible part of a guard's vision cone as a polygon: rays fanned across
// the cone, each stopping at the first wall or crate, so cover reads as cover.
export function visionPolygon(solids, x, y, facing, halfAngle, range, rayCount = 26) {
  const points = [{ x, y }];
  for (let i = 0; i <= rayCount; i++) {
    const a = facing - halfAngle + (2 * halfAngle * i) / rayCount;
    const d = castRay(solids, x, y, a, range);
    points.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
  }
  return points;
}

// Smallest absolute difference between two angles, in radians.
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// True when a circle of `radius` at (x, y) overlaps a solid tile — the
// collision test both the thief and the guards use, so neither walks
// through a wall or a crate.
export function circleHitsSolid(solids, x, y, radius) {
  const r = radius - 1;
  const offsets = [[-r, -r], [r, -r], [-r, r], [r, r], [0, -r], [0, r], [-r, 0], [r, 0]];
  for (const [ox, oy] of offsets) {
    const tx = Math.floor((x + ox) / TILE);
    const ty = Math.floor((y + oy) / TILE);
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
    if (isSolid(solids, tx, ty)) return true;
  }
  return false;
}
