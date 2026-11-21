// Bootstrap: build the game on the page's canvas, run the frame loop, and
// stage a screenshot moment when the URL asks for one (?shot=start|play|
// tense|end). The game starts on its title screen.
import { Game } from './game.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

// For the screenshots and for anyone poking at the game in devtools.
window.__lanternThief = game;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  stageShot(game, shot);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  game.update(dt);
  game.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
