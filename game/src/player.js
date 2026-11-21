// The thief: moves with the keyboard, sneaks slowly and quietly, runs fast
// and loud, and tosses pebbles with the mouse to pull a guard away.
import {
  PLAYER_RADIUS, PLAYER_WALK_SPEED, PLAYER_SNEAK_SPEED,
  TILE, COLS, ROWS, NOISE_WALK_RADIUS,
} from './config.js';
import { isSolid } from './levels.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.facing = -Math.PI / 2;
    this.pebbles = 3;
    this.sneaking = false;
    this.moving = false;
    this.stepTimer = 0;
    this.justStepped = false;
  }

  // How loud the thief's footsteps are right now (0 when still or sneaking).
  noiseRadius() {
    if (!this.moving) return 0;
    if (this.sneaking) return 0;
    return NOISE_WALK_RADIUS;
  }

  // Move one tick, sliding along walls instead of sticking to them.
  update(dt, solids, input) {
    const move = input.moveVector();
    this.sneaking = input.sneaking;
    this.moving = move.x !== 0 || move.y !== 0;
    // Sneak with Shift; otherwise the thief walks at the middle pace.
    const speed = this.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
    if (this.moving) {
      this.facing = Math.atan2(move.y, move.x);
      const nx = this.x + move.x * speed * dt;
      const ny = this.y + move.y * speed * dt;
      if (!this._hitsSolid(solids, nx, this.y)) this.x = nx;
      if (!this._hitsSolid(solids, this.x, ny)) this.y = ny;
    }
    this.stepTimer -= dt;
    if (this.moving && this.stepTimer <= 0) {
      this.stepTimer = (this.sneaking ? 0.55 : 0.38);
      this.justStepped = true;
    } else {
      this.justStepped = false;
    }
  }

  // True when a circle of the thief's radius at (x, y) overlaps a solid tile.
  _hitsSolid(solids, x, y) {
    const r = PLAYER_RADIUS - 1;
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r], [0, -r], [0, r], [-r, 0], [r, 0]]) {
      const tx = Math.floor((x + ox) / TILE);
      const ty = Math.floor((y + oy) / TILE);
      if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
      if (isSolid(solids, tx, ty)) return true;
    }
    return false;
  }

  // Toss a pebble toward (tx, ty). Returns the landing spot or null when the
  // thief has none left.
  throwPebble(tx, ty) {
    if (this.pebbles <= 0) return null;
    this.pebbles -= 1;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    const range = Math.min(dist, 260);
    const landing = {
      x: this.x + (dx / (dist || 1)) * range,
      y: this.y + (dy / (dist || 1)) * range,
    };
    return landing;
  }

  reset(x, y, pebbles) {
    this.x = x;
    this.y = y;
    this.facing = -Math.PI / 2;
    this.pebbles = pebbles;
    this.suspicion = 0;
  }
}
