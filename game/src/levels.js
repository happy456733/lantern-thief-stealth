// The three museum wings the thief must cross. Each map is a grid of tiles:
//   # wall   . floor   C crate (cover: blocks sight and movement)
//   G ember gem   E exit door   P where the thief starts
// Guards patrol between the waypoints listed for their level (tile coordinates).
// All maps are 20 columns by 14 rows and are validated by a build check.

export const LEVELS = [
  {
    name: 'The Quiet Gallery',
    brief: 'Three ember gems. Two watchmen walk the floor. Reach the green door unseen.',
    map: [
      '####################',
      '#P....#.....#......#',
      '#.....#..C..#..G...#',
      '#..C......#.....#..#',
      '#.....#.......#....#',
      '#..#.....C....#..#.#',
      '#.....#....#.......#',
      '#..G......#...C....#',
      '#..#...#......#..#.#',
      '#.....#....C......##',
      '#..C.......#...G...#',
      '#.....#........#...#',
      '#....#....#....#..E#',
      '####################',
    ],
    guards: [
      { waypoints: [[5, 2], [14, 2]], facing: 0, pause: 1.2 },
      { waypoints: [[16, 4], [16, 10]], facing: Math.PI / 2, pause: 1.0 },
    ],
  },
  {
    name: 'The Brass Hall',
    brief: 'Four ember gems, three watchmen. Crates are your friends — hide behind them.',
    map: [
      '####################',
      '#P...C.....#....G..#',
      '#..#......#..C.....#',
      '#.....C.....#..#...#',
      '#.C....#.......#...#',
      '#..#......C..#...#.#',
      '#....#....#....#...#',
      '#..G...C.....#...#.#',
      '#..#......#.....#..#',
      '#....C.....#..C....#',
      '#..#.....#.....#..G#',
      '#.....#....C...#...#',
      '#..C....G.#....#..E#',
      '####################',
    ],
    guards: [
      { waypoints: [[6, 1], [6, 6]], facing: Math.PI / 2, pause: 1.0 },
      { waypoints: [[13, 3], [13, 8]], facing: Math.PI / 2, pause: 1.4 },
      { waypoints: [[3, 11], [13, 11]], facing: 0, pause: 0.8 },
    ],
  },
  {
    name: 'The Vault of Embers',
    brief: 'Five ember gems and four watchmen. Patience wins — learn the patrols, then slip through.',
    map: [
      '####################',
      '#P..#...C....#..G..#',
      '#....#.....#...#...#',
      '#..C...#..G..#..#..#',
      '#....#......#......#',
      '#..#...C..#...#..#.#',
      '#....#....#..C...#.#',
      '#..G....#....#...#.#',
      '#..#..C....#....#..#',
      '#....#..#.....#..C.#',
      '#..C....#..G...#...#',
      '#....#.....#....#.G#',
      '#..#...C.....#...#E#',
      '####################',
    ],
    guards: [
      { waypoints: [[6, 1], [6, 5]], facing: Math.PI / 2, pause: 1.0 },
      { waypoints: [[14, 2], [14, 6]], facing: Math.PI / 2, pause: 1.2 },
      { waypoints: [[9, 8], [13, 8]], facing: 0, pause: 0.9 },
      { waypoints: [[16, 4], [16, 9]], facing: Math.PI / 2, pause: 1.1 },
    ],
  },
];

// Turn a level's map strings into the structures the game reads: a solid-tile
// lookup, the gem spots, the exit tile and the player's start, all in pixels.
import { TILE } from './config.js';

export function parseLevel(level) {
  const solids = new Set();
  const gems = [];
  let exit = null;
  let start = null;
  level.map.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '#' || ch === 'C') solids.add(y * 100 + x);
      if (ch === 'G') gems.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, taken: false });
      if (ch === 'E') exit = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      if (ch === 'P') start = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
    }
  });
  return { solids, gems, exit, start };
}

// True when the tile at (tileX, tileY) blocks sight and movement.
export function isSolid(solids, tileX, tileY) {
  return solids.has(tileY * 100 + tileX);
}
