// A watchman: walks a patrol, looks around with a vision cone, and reacts
// to the thief in stages — unaware, suspicious, alarmed, chasing — with a
// chance to calm down again when the thief slips out of sight.
import {
  GUARD_PATROL_SPEED, GUARD_INVESTIGATE_SPEED, GUARD_CHASE_SPEED,
  VISION_RANGE, VISION_HALF_ANGLE, SUSPICION_GAIN, SUSPICION_DECAY,
  SUSPICIOUS_AT, ALARM_AT, CAUGHT_AT, TILE,
} from './config.js';
import { hasLineOfSight, angleDifference } from './sight.js';

export const GUARD_STATE = {
  PATROL: 'patrol',
  LOOK: 'look', // turned toward something odd, standing still
  INVESTIGATE: 'investigate', // walking to the last seen (or heard) spot
  CHASE: 'chase', // running at the thief, seen clearly
  RETURN: 'return', // walking back to the patrol route
};

export class Guard {
  constructor(def) {
    this.waypoints = def.waypoints.map(([tx, ty]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }));
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.facing = def.facing;
    this.pause = def.pause ?? 1;
    this.wpIndex = 1;
    this.waitTimer = 0;
    this.state = GUARD_STATE.PATROL;
    this.suspicion = 0;
    this.lastSeen = null; // {x, y} where the thief was last spotted
    this.investigateTarget = null;
    this.stepTimer = 0;
    this._wasSuspicious = false;
    this._wasAlarmed = false;
  }

  // True when the thief is inside this guard's cone with a clear line of sight.
  canSee(solids, px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > VISION_RANGE) return false;
    const angleTo = Math.atan2(dy, dx);
    if (angleDifference(angleTo, this.facing) > VISION_HALF_ANGLE) return false;
    return hasLineOfSight(solids, this.x, this.y, px, py);
  }

  // Walk toward (tx, ty) at `speed`; return true when arrived.
  _moveToward(tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3) return true;
    const step = Math.min(dist, speed * dt);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.facing = Math.atan2(dy, dx);
    return dist - step < 3;
  }

  // A noise at (x, y): guards close enough walk over to check it out.
  hearNoise(x, y, radius) {
    if (this.state === GUARD_STATE.CHASE) return;
    const dist = Math.hypot(x - this.x, y - this.y);
    if (dist > radius) return;
    this.investigateTarget = { x, y };
    this.suspicion = Math.max(this.suspicion, SUSPICIOUS_AT + 0.05);
    if (this.state === GUARD_STATE.PATROL || this.state === GUARD_STATE.RETURN) {
      this.state = GUARD_STATE.INVESTIGATE;
    }
  }

  // One tick: watch, suspect, chase, investigate, calm down.
  // Returns 'alarm' the moment this guard first turns fully alarmed,
  // 'suspicious' when it first grows wary, otherwise null.
  update(dt, solids, player) {
    let event = null;
    const seen = this.canSee(solids, player.x, player.y);
    const dist = Math.hypot(player.x - this.x, player.y - this.y);

    if (seen) {
      // Closer is spotted much faster; sneaking buys time.
      const closeness = 1 - dist / VISION_RANGE;
      const gain = SUSPICION_GAIN * (0.55 + 0.9 * closeness);
      this.suspicion = Math.min(1, this.suspicion + gain * dt);
      this.lastSeen = { x: player.x, y: player.y };
    } else if (this.state !== GUARD_STATE.CHASE) {
      this.suspicion = Math.max(0, this.suspicion - SUSPICION_DECAY * dt);
    } else {
      // A chasing guard that lost the thief cools down slowly, so breaking
      // line of sight is a real escape — the guard drops to investigating.
      this.suspicion = Math.max(0, this.suspicion - SUSPICION_DECAY * 0.5 * dt);
    }

    if (this.suspicion >= CAUGHT_AT && seen) {
      if (!this._wasAlarmed) event = 'alarm';
      this._wasAlarmed = true;
      this.state = GUARD_STATE.CHASE;
    } else if (this.suspicion >= ALARM_AT) {
      if (!this._wasAlarmed) event = 'suspicious';
      this._wasAlarmed = true;
      if (this.state !== GUARD_STATE.CHASE) {
        this.state = GUARD_STATE.INVESTIGATE;
        if (this.lastSeen) this.investigateTarget = { ...this.lastSeen };
      }
    } else if (this.suspicion >= SUSPICIOUS_AT) {
      if (!this._wasSuspicious) event = 'suspicious';
      this._wasSuspicious = true;
      if (this.state === GUARD_STATE.PATROL) this.state = GUARD_STATE.LOOK;
    } else {
      this._wasSuspicious = false;
      this._wasAlarmed = false;
    }

    switch (this.state) {
      case GUARD_STATE.PATROL: {
        if (this.waitTimer > 0) {
          this.waitTimer -= dt;
          break;
        }
        const target = this.waypoints[this.wpIndex];
        if (this._moveToward(target.x, target.y, GUARD_PATROL_SPEED, dt)) {
          this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
          this.waitTimer = this.pause;
        }
        break;
      }
      case GUARD_STATE.LOOK: {
        // Turn toward the last seen spot; give up after a short stare.
        if (this.lastSeen) {
          const want = Math.atan2(this.lastSeen.y - this.y, this.lastSeen.x - this.x);
          let diff = want - this.facing;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          this.facing += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
        }
        if (this.suspicion < SUSPICIOUS_AT) this.state = GUARD_STATE.PATROL;
        break;
      }
      case GUARD_STATE.INVESTIGATE: {
        const target = this.investigateTarget ?? this.lastSeen;
        if (!target) {
          this.state = GUARD_STATE.RETURN;
          break;
        }
        if (this._moveToward(target.x, target.y, GUARD_INVESTIGATE_SPEED, dt)) {
          this.investigateTarget = null;
          this.waitTimer = 1.4;
          this.state = GUARD_STATE.LOOK;
        }
        break;
      }
      case GUARD_STATE.CHASE: {
        if (seen || this.lastSeen) {
          const target = seen ? { x: player.x, y: player.y } : this.lastSeen;
          this._moveToward(target.x, target.y, GUARD_CHASE_SPEED, dt);
        }
        if (this.suspicion < ALARM_AT && !seen) {
          this.state = GUARD_STATE.INVESTIGATE;
          this.investigateTarget = this.lastSeen ? { ...this.lastSeen } : null;
        }
        break;
      }
      case GUARD_STATE.RETURN: {
        // Walk back to the nearest patrol waypoint, then resume the route.
        let nearest = this.waypoints[0];
        let best = Infinity;
        for (const wp of this.waypoints) {
          const d = Math.hypot(wp.x - this.x, wp.y - this.y);
          if (d < best) {
            best = d;
            nearest = wp;
          }
        }
        if (this._moveToward(nearest.x, nearest.y, GUARD_PATROL_SPEED, dt)) {
          this.wpIndex = (this.waypoints.indexOf(nearest) + 1) % this.waypoints.length;
          this.state = GUARD_STATE.PATROL;
        }
        break;
      }
    }

    // Footstep timing for the audio cue: faster when the guard hurries.
    const speed = this.state === GUARD_STATE.CHASE ? GUARD_CHASE_SPEED
      : this.state === GUARD_STATE.INVESTIGATE ? GUARD_INVESTIGATE_SPEED
      : this.state === GUARD_STATE.PATROL ? GUARD_PATROL_SPEED : 0;
    this.stepTimer -= dt;
    if (speed > 0 && this.stepTimer <= 0) {
      this.stepTimer = 46 / speed; // roughly one step per 46 px
      this.justStepped = true;
    } else {
      this.justStepped = false;
    }
    return event;
  }

  // Caught when the guard touches the thief while fully alarmed.
  touches(player, radius = 26) {
    return this.state === GUARD_STATE.CHASE
      && Math.hypot(player.x - this.x, player.y - this.y) < radius;
  }
}
