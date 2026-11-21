// Screenshot staging: ?shot=start|play|tense|end puts the game into a fixed,
// readable moment so the screenshots are real renders of the game's own code
// in a chosen state. Nothing here changes how the game plays.
import { SCREEN } from './game.js';
import { GUARD_STATE } from './guard.js';

export function stageShot(game, name) {
  if (name === 'start') {
    game.screen = SCREEN.TITLE;
    return;
  }
  if (name === 'play') {
    // Mid-game on the first wing: the thief crouched behind a crate while a
    // watchman patrols past with his cone sweeping the floor.
    game.startRun();
    game.screen = SCREEN.PLAYING;
    game.player.x = 5.5 * 48;
    game.player.y = 6.5 * 48;
    game.player.sneaking = true;
    game.player.facing = Math.PI / 4;
    game.guards[0].x = 9.5 * 48;
    game.guards[0].y = 2.5 * 48;
    game.guards[0].facing = Math.PI * 0.75;
    game.guards[0].state = GUARD_STATE.PATROL;
    game.guards[1].x = 16.5 * 48;
    game.guards[1].y = 7.5 * 48;
    game.guards[1].facing = -Math.PI / 2;
    game.guards[1].state = GUARD_STATE.PATROL;
    return;
  }
  if (name === 'tense') {
    // A near miss: the thief frozen behind a crate, a watchman suspicious
    // with his meter half full, the exit glowing in the corner.
    game.startRun();
    game.screen = SCREEN.PLAYING;
    game.player.x = 8.5 * 48;
    game.player.y = 10.5 * 48;
    game.player.sneaking = true;
    game.player.facing = Math.PI;
    game.gems[0].taken = true;
    game.gemsLeft -= 1;
    game.guards[0].x = 11.5 * 48;
    game.guards[0].y = 9.5 * 48;
    game.guards[0].facing = Math.PI;
    game.guards[0].suspicion = 0.62;
    game.guards[0].state = GUARD_STATE.LOOK;
    game.guards[0].lastSeen = { x: 8.5 * 48, y: 10.5 * 48 };
    game.guards[1].x = 16.5 * 48;
    game.guards[1].y = 5.5 * 48;
    game.guards[1].facing = Math.PI / 2;
    game.guards[1].state = GUARD_STATE.PATROL;
    return;
  }
  if (name === 'end') {
    // The wing cleared: every gem pocketed, the exit open, the score shown.
    game.startRun();
    game.screen = SCREEN.PLAYING;
    for (const gem of game.gems) gem.taken = true;
    game.gemsLeft = 0;
    game.score = 550;
    game.player.x = 17.5 * 48;
    game.player.y = 12.5 * 48;
    game.player.facing = 0;
    game.guards[0].x = 9.5 * 48;
    game.guards[0].y = 2.5 * 48;
    game.guards[0].facing = 0;
    game.screen = SCREEN.LEVEL_CLEAR;
    game.screenTimer = 0;
  }
}
