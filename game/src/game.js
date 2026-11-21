// The game itself: screens, levels, gems, the exit, pebbles, getting caught,
// and the tick that ties the player, the guards and the sound together.
import { LEVELS, parseLevel } from './levels.js';
import { Player } from './player.js';
import { Guard, GUARD_STATE } from './guard.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { STARTING_LIVES, STARTING_PEBBLES, NOISE_PEBBLE_RADIUS } from './config.js';
import { PALETTE } from './config.js';

export const SCREEN = {
  TITLE: 'title',
  BRIEF: 'brief',
  PLAYING: 'playing',
  CAUGHT: 'caught',
  LEVEL_CLEAR: 'level-clear',
  WON: 'won',
  GAME_OVER: 'game-over',
  PAUSED: 'paused',
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = new Input(canvas);
    this.sounds = new SoundBank();
    this.renderer = new Renderer(canvas);
    this.screen = SCREEN.TITLE;
    this.levelIndex = 0;
    this.lives = STARTING_LIVES;
    this.score = 0;
    this.message = null;
    this.messageTimer = 0;
    this.screenTimer = 0;
    this.pebbles = []; // flying/landed pebbles with a fading ring
    this._loadLevel(0);
  }

  _loadLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    const parsed = parseLevel(this.level);
    this.solids = parsed.solids;
    this.gems = parsed.gems;
    this.exit = parsed.exit;
    this.player = new Player(parsed.start.x, parsed.start.y);
    this.player.pebbles = STARTING_PEBBLES;
    this.guards = this.level.guards.map((def) => new Guard(def));
    this.pebbles = [];
    this.levelGems = this.gems.length;
    this.gemsLeft = this.gems.length;
  }

  get levelName() {
    return this.level.name;
  }

  // Start a fresh run from the title screen.
  startRun() {
    this.lives = STARTING_LIVES;
    this.score = 0;
    this._loadLevel(0);
    this.screen = SCREEN.BRIEF;
    this.screenTimer = 0;
    this.message = null;
  }

  _nextLevel() {
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.screen = SCREEN.WON;
      this.screenTimer = 0;
      this.sounds.levelClear();
      return;
    }
    this._loadLevel(this.levelIndex + 1);
    this.screen = SCREEN.BRIEF;
    this.screenTimer = 0;
  }

  _showMessage(text, seconds, color) {
    this.message = { text, color: color ?? PALETTE.text };
    this.messageTimer = seconds;
  }

  // A guard caught the thief: lose a life, restart the wing, or end the run.
  _caught() {
    this.lives -= 1;
    this.sounds.caught();
    if (this.lives <= 0) {
      this.screen = SCREEN.GAME_OVER;
    } else {
      this.screen = SCREEN.CAUGHT;
    }
    this.screenTimer = 0;
  }

  update(dt) {
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.message = null;
    }

    if (this.screen === SCREEN.TITLE) {
      if (this.input.consumeKey('enter') || this.input.consumeClick()) {
        this.sounds.ensure();
        this.startRun();
      }
      return;
    }

    if (this.screen === SCREEN.BRIEF) {
      this.screenTimer += dt;
      if (this.screenTimer > 0.15 && (this.input.consumeKey('enter') || this.input.consumeClick())) {
        this.sounds.ensure();
        this.screen = SCREEN.PLAYING;
      }
      return;
    }

    if (this.screen === SCREEN.CAUGHT) {
      this.screenTimer += dt;
      if (this.screenTimer > 1.2 && (this.input.consumeKey('enter') || this.input.consumeClick())) {
        this._loadLevel(this.levelIndex);
        this.screen = SCREEN.BRIEF;
        this.screenTimer = 0;
      }
      return;
    }

    if (this.screen === SCREEN.LEVEL_CLEAR) {
      this.screenTimer += dt;
      if (this.screenTimer > 1.2 && (this.input.consumeKey('enter') || this.input.consumeClick())) {
        this._nextLevel();
      }
      return;
    }

    if (this.screen === SCREEN.WON || this.screen === SCREEN.GAME_OVER) {
      this.screenTimer += dt;
      if (this.screenTimer > 1.0 && (this.input.consumeKey('enter') || this.input.consumeClick())) {
        this.screen = SCREEN.TITLE;
        this.screenTimer = 0;
      }
      return;
    }

    if (this.screen === SCREEN.PAUSED) {
      if (this.input.consumeKey('p') || this.input.consumeKey('escape')) {
        this.screen = SCREEN.PLAYING;
      }
      return;
    }

    // PLAYING
    if (this.input.consumeKey('p') || this.input.consumeKey('escape')) {
      this.screen = SCREEN.PAUSED;
      return;
    }
    if (this.input.consumeKey('m')) this.sounds.muted = !this.sounds.muted;

    this.player.update(dt, this.solids, this.input);
    if (this.player.justStepped) {
      this.sounds.footstep(this.player.sneaking ? 0.15 : 0.6);
      const radius = this.player.noiseRadius();
      if (radius > 0) {
        for (const guard of this.guards) guard.hearNoise(this.player.x, this.player.y, radius);
      }
    }

    // Mouse click tosses a pebble toward the cursor; guards walk to the clatter.
    if (this.input.consumeClick()) {
      this.sounds.ensure();
      const landing = this.player.throwPebble(this.input.mouse.x, this.input.mouse.y);
      if (landing) {
        this.sounds.pebbleThrow();
        this.pebbles.push({ ...landing, age: 0 });
        this.sounds.pebbleLand();
        for (const guard of this.guards) guard.hearNoise(landing.x, landing.y, NOISE_PEBBLE_RADIUS);
      } else {
        this._showMessage('No pebbles left!', 1.2, '#ffb63c');
      }
    }
    for (const p of this.pebbles) p.age += dt;
    this.pebbles = this.pebbles.filter((p) => p.age < 0.9);

    for (const guard of this.guards) {
      const event = guard.update(dt, this.solids, this.player);
      if (event === 'alarm') this.sounds.alarm();
      else if (event === 'suspicious') this.sounds.suspicious();
      if (guard.justStepped) {
        const d = Math.hypot(guard.x - this.player.x, guard.y - this.player.y);
        this.sounds.guardStep(d);
      }
      if (guard.touches(this.player)) {
        this._caught();
        return;
      }
    }

    // Pick up a gem by walking over it; each one also buys a spare pebble.
    for (const gem of this.gems) {
      if (gem.taken) continue;
      const d = Math.hypot(gem.x - this.player.x, gem.y - this.player.y);
      if (d < 30) {
        gem.taken = true;
        this.gemsLeft -= 1;
        this.score += 100;
        this.sounds.gemPickup();
        this.player.pebbles += 1;
        if (this.gemsLeft === 0) {
          this._showMessage('All gems pocketed — reach the green EXIT!', 2.5, PALETTE.exit);
        }
      }
    }

    // The exit opens once every gem is pocketed.
    if (this.gemsLeft === 0 && this.exit) {
      const d = Math.hypot(this.exit.x - this.player.x, this.exit.y - this.player.y);
      if (d < 28) {
        this.score += 250;
        this.screen = SCREEN.LEVEL_CLEAR;
        this.screenTimer = 0;
        this.sounds.levelClear();
      }
    }
  }

  draw() {
    if (this.screen === SCREEN.TITLE) {
      this._drawTitle();
      return;
    }
    const state = {
      level: this.level,
      levelIndex: this.levelIndex,
      solids: this.solids,
      gems: this.gems,
      exit: this.exit,
      player: this.player,
      guards: this.guards,
      pebbles: this.pebbles,
      gemsLeft: this.gemsLeft,
      levelGems: this.levelGems,
      lives: this.lives,
      message: this.message,
    };
    this.renderer.draw(state);

    if (this.screen === SCREEN.BRIEF) {
      this._drawOverlay(
        `Wing ${this.levelIndex + 1} — ${this.level.name}`,
        `${this.level.brief}\n\nPress ENTER or click to begin`,
      );
    } else if (this.screen === SCREEN.PAUSED) {
      this._drawOverlay('Paused', 'Press P to keep sneaking');
    } else if (this.screen === SCREEN.CAUGHT) {
      this._drawOverlay(
        'Caught in the lamplight!',
        this.lives > 0
          ? `${this.lives} ${this.lives === 1 ? 'life' : 'lives'} left — the wing resets.\nPress ENTER to try again`
          : 'Press ENTER to continue',
      );
    } else if (this.screen === SCREEN.LEVEL_CLEAR) {
      this._drawOverlay(
        'Wing cleared — unseen!',
        `Score: ${this.score}\nPress ENTER for the next wing`,
      );
    } else if (this.screen === SCREEN.WON) {
      this._drawOverlay(
        'The Ember Museum is yours!',
        `Every gem pocketed, never once caught flat-footed.\nFinal score: ${this.score}\n\nPress ENTER to play again`,
      );
    } else if (this.screen === SCREEN.GAME_OVER) {
      this._drawOverlay(
        'The watchmen win this night…',
        `Final score: ${this.score}\nPress ENTER to try again`,
      );
    }
  }

  _drawOverlay(title, body) {
    const ctx = this.renderer.ctx;
    ctx.fillStyle = 'rgba(8, 6, 14, 0.72)';
    ctx.fillRect(0, 0, 960, 672);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText(title, 480, 280);
    ctx.font = '17px Georgia, serif';
    ctx.fillStyle = PALETTE.dimText;
    const lines = body.split('\n');
    lines.forEach((line, i) => ctx.fillText(line, 480, 330 + i * 28));
  }

  _drawTitle() {
    const ctx = this.renderer.ctx;
    const t = performance.now() / 1000;
    ctx.fillStyle = '#14101f';
    ctx.fillRect(0, 0, 960, 672);
    // A row of ember gems glowing under the title, like the museum's vault.
    for (let i = 0; i < 5; i++) {
      const x = 240 + i * 120;
      const y = 470 + Math.sin(t * 2 + i) * 6;
      const glow = ctx.createRadialGradient(x, y, 2, x, y, 34);
      glow.addColorStop(0, 'rgba(255, 179, 71, 0.6)');
      glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.gem;
      ctx.fillRect(-10, -10, 20, 20);
      ctx.fillStyle = PALETTE.gemCore;
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    }
    ctx.fillStyle = PALETTE.gem;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 64px Georgia, serif';
    ctx.fillText('LANTERN THIEF', 480, 200);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'italic 24px Georgia, serif';
    ctx.fillText('Shadow of the Ember Museum', 480, 255);
    ctx.fillStyle = PALETTE.dimText;
    ctx.font = '17px Georgia, serif';
    ctx.fillText('A top-down stealth game — slip past the watchmen, pocket every ember gem,', 480, 330);
    ctx.fillText('and reach the green exit unseen.', 480, 356);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '16px Georgia, serif';
    ctx.fillText('WASD / arrows — move      SHIFT — sneak (slow, silent)', 480, 540);
    ctx.fillText('CLICK — toss a pebble to distract a guard      M — mute', 480, 568);
    const blink = 0.6 + 0.4 * Math.sin(t * 3);
    ctx.fillStyle = `rgba(242, 234, 216, ${blink})`;
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText('Press ENTER or click to begin', 480, 620);
  }
}
