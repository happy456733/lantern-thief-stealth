// Shared tuning for Lantern Thief: tile size, speeds, sight and sound ranges.
// One file holds the numbers so a level or a guard never hard-codes them.
export const TILE = 48;
export const COLS = 20;
export const ROWS = 14;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 672

export const PLAYER_RADIUS = 13;
export const PLAYER_WALK_SPEED = 150; // px per second
export const PLAYER_SNEAK_SPEED = 78;

export const GUARD_RADIUS = 14;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_INVESTIGATE_SPEED = 96;
export const GUARD_CHASE_SPEED = 168;

export const VISION_RANGE = 215; // how far a guard can see, in px
export const VISION_HALF_ANGLE = 0.62; // radians either side of facing (~35 deg)
export const SUSPICION_GAIN = 1.15; // per second, fully in view at close range
export const SUSPICION_DECAY = 0.28; // per second, out of sight
export const SUSPICIOUS_AT = 0.35; // guard turns and looks
export const ALARM_AT = 0.72; // guard walks to the last seen spot
export const CAUGHT_AT = 1.0; // guard sprints at the player

export const NOISE_WALK_RADIUS = 70; // guards hear footsteps inside this
export const NOISE_PEBBLE_RADIUS = 190;

export const STARTING_PEBBLES = 3;
export const STARTING_LIVES = 3;

// Palette: a night museum — deep plum floors, brass, ember orange, watchman blue.
export const PALETTE = {
  floorA: '#241d33',
  floorB: '#201a2e',
  floorLine: '#2e2642',
  wall: '#4a3f63',
  wallTop: '#6b5a8f',
  crate: '#7a5a34',
  crateTop: '#a97e47',
  crateEdge: '#5d4423',
  gem: '#ffb347',
  gemCore: '#ffe9a8',
  exit: '#39d98a',
  exitGlow: '#1d7a4c',
  player: '#e8b64c',
  playerCloak: '#3a2b12',
  guard: '#5b8dd9',
  guardDark: '#2c4a7a',
  coneCalm: 'rgba(255, 214, 110, 0.20)',
  coneSuspicious: 'rgba(255, 190, 60, 0.34)',
  coneAlarmed: 'rgba(255, 70, 60, 0.38)',
  text: '#f2ead8',
  dimText: '#9a8fb5',
};
