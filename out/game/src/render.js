// Everything the player sees: the museum floor, walls, crates, gems, the
// exit door, the thief, the guards and their vision cones, the night
// lighting, and the HUD. All drawn with the 2D canvas, no images.
import {
  TILE, COLS, ROWS, VIEW_W, VIEW_H, PALETTE, VISION_RANGE,
  VISION_HALF_ANGLE, PLAYER_RADIUS, GUARD_RADIUS,
} from './config.js';
import { visionPolygon } from './sight.js';
import { GUARD_STATE } from './guard.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  draw(state) {
    const ctx = this.ctx;
    const { level, solids, gems, exit, player, guards, pebbles, message } = state;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    this._drawFloor(ctx);
    this._drawExit(ctx, exit, state.gemsLeft === 0);
    this._drawGems(ctx, gems);
    this._drawVisionCones(ctx, solids, guards);
    this._drawCratesAndWalls(ctx, level);
    this._drawPebbles(ctx, pebbles);
    this._drawPlayer(ctx, player);
    this._drawGuards(ctx, guards);
    this._drawDarkness(ctx, player, guards);
    this._drawHud(ctx, state);
    if (message) this._drawMessage(ctx, message);
  }

  _drawFloor(ctx) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        ctx.strokeStyle = PALETTE.floorLine;
        ctx.lineWidth = 1;
        ctx.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE - 1, TILE - 1);
      }
    }
  }

  _drawCratesAndWalls(ctx, level) {
    level.map.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '#') {
          ctx.fillStyle = PALETTE.wall;
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
          ctx.fillStyle = PALETTE.wallTop;
          ctx.fillRect(x * TILE, y * TILE, TILE, 8);
        } else if (ch === 'C') {
          ctx.fillStyle = PALETTE.crateEdge;
          ctx.fillRect(x * TILE + 3, y * TILE + 3, TILE - 6, TILE - 6);
          ctx.fillStyle = PALETTE.crate;
          ctx.fillRect(x * TILE + 6, y * TILE + 6, TILE - 12, TILE - 12);
          ctx.fillStyle = PALETTE.crateTop;
          ctx.fillRect(x * TILE + 6, y * TILE + 6, TILE - 12, 10);
          ctx.strokeStyle = PALETTE.crateEdge;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x * TILE + 6, y * TILE + 6);
          ctx.lineTo(x * TILE + TILE - 6, y * TILE + TILE - 6);
          ctx.moveTo(x * TILE + TILE - 6, y * TILE + 6);
          ctx.lineTo(x * TILE + 6, y * TILE + TILE - 6);
          ctx.stroke();
        }
      }
    });
  }

  _drawVisionCones(ctx, solids, guards) {
    for (const guard of guards) {
      const poly = visionPolygon(solids, guard.x, guard.y, guard.facing, VISION_HALF_ANGLE, VISION_RANGE);
      const fill = guard.state === GUARD_STATE.CHASE ? PALETTE.coneAlarmed
        : guard.suspicion >= 0.35 ? PALETTE.coneSuspicious : PALETTE.coneCalm;
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = fill.replace(/[\d.]+\)$/, '0.5)');
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  _drawGems(ctx, gems) {
    const t = performance.now() / 1000;
    for (const gem of gems) {
      if (gem.taken) continue;
      const pulse = 1 + 0.15 * Math.sin(t * 3 + gem.x);
      const glow = ctx.createRadialGradient(gem.x, gem.y, 2, gem.x, gem.y, 26 * pulse);
      glow.addColorStop(0, 'rgba(255, 179, 71, 0.55)');
      glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(gem.x, gem.y, 26 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(gem.x, gem.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.gem;
      ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = PALETTE.gemCore;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
  }

  _drawExit(ctx, exit, open) {
    if (!exit) return;
    const t = performance.now() / 1000;
    const glowR = open ? 40 + 8 * Math.sin(t * 4) : 22;
    const glow = ctx.createRadialGradient(exit.x, exit.y, 4, exit.x, exit.y, glowR);
    glow.addColorStop(0, open ? 'rgba(57, 217, 138, 0.7)' : 'rgba(57, 217, 138, 0.25)');
    glow.addColorStop(1, 'rgba(57, 217, 138, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = open ? PALETTE.exit : PALETTE.exitGlow;
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, open ? 13 : 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b0a12';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(open ? 'EXIT' : 'LOCKED', exit.x, exit.y - 26);
  }

  _drawPebbles(ctx, pebbles) {
    for (const p of pebbles) {
      ctx.strokeStyle = 'rgba(242, 234, 216, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 + p.age * 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#cfc4a8';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawPlayer(ctx, player) {
    const ctx2 = ctx;
    // A soft lantern glow around the thief, so the player is easy to find.
    const glow = ctx2.createRadialGradient(player.x, player.y, 4, player.x, player.y, 46);
    glow.addColorStop(0, 'rgba(232, 182, 76, 0.28)');
    glow.addColorStop(1, 'rgba(232, 182, 76, 0)');
    ctx2.fillStyle = glow;
    ctx2.beginPath();
    ctx2.arc(player.x, player.y, 46, 0, Math.PI * 2);
    ctx2.fill();
    // Cloak: a hooded circle with a brass lantern dot facing the movement.
    ctx2.fillStyle = PALETTE.playerCloak;
    ctx2.beginPath();
    ctx2.arc(player.x, player.y, PLAYER_RADIUS + 2, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.fillStyle = PALETTE.player;
    ctx2.beginPath();
    ctx2.arc(player.x, player.y, PLAYER_RADIUS - 2, 0, Math.PI * 2);
    ctx2.fill();
    const lx = player.x + Math.cos(player.facing) * 9;
    const ly = player.y + Math.sin(player.facing) * 9;
    ctx2.fillStyle = '#fff3c4';
    ctx2.beginPath();
    ctx2.arc(lx, ly, 3.5, 0, Math.PI * 2);
    ctx2.fill();
    if (player.sneaking) {
      ctx2.strokeStyle = 'rgba(242, 234, 216, 0.7)';
      ctx2.lineWidth = 1.5;
      ctx2.beginPath();
      ctx2.arc(player.x, player.y, PLAYER_RADIUS + 6, 0, Math.PI * 2);
      ctx2.stroke();
    }
  }

  _drawGuards(ctx, guards) {
    for (const guard of guards) {
      // A small blue lantern glow so guards read against the dark floor.
      const glow = ctx.createRadialGradient(guard.x, guard.y, 4, guard.x, guard.y, 34);
      glow.addColorStop(0, 'rgba(91, 141, 217, 0.30)');
      glow.addColorStop(1, 'rgba(91, 141, 217, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.guardDark;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, GUARD_RADIUS + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.guard;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, GUARD_RADIUS - 2, 0, Math.PI * 2);
      ctx.fill();
      // Helmet brim pointing where the guard looks.
      const hx = guard.x + Math.cos(guard.facing) * 10;
      const hy = guard.y + Math.sin(guard.facing) * 10;
      ctx.fillStyle = '#dfe9ff';
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fill();
      // Suspicion meter above the guard's head.
      if (guard.suspicion > 0.03) {
        const w = 34;
        const x = guard.x - w / 2;
        const y = guard.y - GUARD_RADIUS - 14;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(x - 1, y - 1, w + 2, 7);
        ctx.fillStyle = guard.suspicion >= 0.72 ? '#ff463c' : guard.suspicion >= 0.35 ? '#ffb63c' : '#ffe08a';
        ctx.fillRect(x, y, w * guard.suspicion, 5);
      }
      // "?" while suspicious, "!" while alarmed or chasing.
      const mark = guard.state === GUARD_STATE.CHASE ? '!'
        : guard.suspicion >= 0.35 ? '?' : null;
      if (mark) {
        ctx.font = 'bold 20px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = mark === '!' ? '#ff6a5e' : '#ffd166';
        ctx.fillText(mark, guard.x, guard.y - GUARD_RADIUS - 24);
      }
    }
  }

  // Night falls over the museum: darken everything except a pool of light
  // around the thief, so safe shadows read as safe and lit floor as risky.
  _drawDarkness(ctx, player, guards) {
    const shade = ctx.createRadialGradient(player.x, player.y, 90, player.x, player.y, 340);
    shade.addColorStop(0, 'rgba(5, 4, 10, 0)');
    shade.addColorStop(1, 'rgba(5, 4, 10, 0.42)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  _drawHud(ctx, state) {
    ctx.fillStyle = 'rgba(8, 6, 14, 0.78)';
    ctx.fillRect(0, 0, VIEW_W, 34);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Wing ${state.levelIndex + 1}/3 — ${state.level.name}`, 12, 18);
    ctx.textAlign = 'center';
    const gemsGot = state.levelGems - state.gemsLeft;
    ctx.fillText(`◆ ${gemsGot}/${state.levelGems} ember gems`, VIEW_W / 2 - 60, 18);
    ctx.fillText(`◉ ${state.player.pebbles} pebbles`, VIEW_W / 2 + 90, 18);
    ctx.textAlign = 'right';
    ctx.fillText(`♥ ${'●'.repeat(Math.max(0, state.lives))}${'○'.repeat(Math.max(0, 3 - state.lives))}`, VIEW_W - 12, 18);
    if (state.gemsLeft === 0) {
      ctx.fillStyle = PALETTE.exit;
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px Georgia, serif';
      ctx.fillText('All gems pocketed — reach the green EXIT!', VIEW_W / 2, 52);
    }
  }

  _drawMessage(ctx, message) {
    const lines = message.text.split('\n');
    ctx.fillStyle = 'rgba(8, 6, 14, 0.82)';
    ctx.fillRect(0, VIEW_H / 2 - 70, VIEW_W, 34 + lines.length * 30);
    ctx.fillStyle = message.color ?? PALETTE.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((line, i) => {
      ctx.font = i === 0 ? 'bold 26px Georgia, serif' : '16px Georgia, serif';
      ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 - 52 + i * 30 + (i === 0 ? 6 : 0));
    });
  }
}
