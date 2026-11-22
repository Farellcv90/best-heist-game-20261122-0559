// The Gilded Hour — every shared number and colour lives here.
// The playfield is a fixed 1280x720 logical room. The renderer scales it to
// the window, so no rule below ever depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The room the heist happens in, inside the HUD frame. */
export const ROOM = { x: 48, y: 92, width: 1184, height: 576 };

/** Fixed simulation step: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  speed: 214,
  sneakSpeed: 108,
  stealSeconds: 2.5,
  stealRange: 52,
};

export const GUARD = {
  radius: 15,
  patrolSpeed: 88,
  chaseSpeed: 172,
  investigateSpeed: 128,
  coneRange: 238,
  coneHalfAngle: 0.56,
  catchRange: 27,
  loseSightSeconds: 2.0,
  graceSeconds: 0.4,
};

export const CAMERA = {
  coneRange: 268,
  coneHalfAngle: 0.46,
  sweepAngle: 0.72,
  sweepPeriod: 6.4,
  empSeconds: 6,
};

export const ALARM = {
  max: 100,
  guardRate: 15,
  cameraRate: 10.5,
  noisyRate: 3.2,
  laserSpike: 20,
  stealSpike: 10,
  decayRate: 3.4,
  decayDelay: 1.0,
};

export const TOOLS = {
  coin: { cost: 1, range: 360, noiseRadius: 340, investigateSeconds: 3 },
  smoke: { cost: 2, radius: 78, seconds: 3 },
  emp: { cost: 3, seconds: 6 },
  startFavors: 6,
};

export const LASER = { onSeconds: 2.2, offSeconds: 1.2, cooldown: 1.0 };

/** Midnight-brass palette: cover, danger and loot each own a hue. */
export const PALETTE = {
  backdrop: '#0b0f1c',
  floor: '#26304a',
  floorAlt: '#2c3757',
  marble: '#93a7cc',
  marbleAlt: '#a7badd',
  carpet: '#5b3a4a',
  carpetAlt: '#664256',
  wall: '#141a2a',
  wallTrim: '#c9a227',
  cover: '#7a5230',
  coverTop: '#9a6a3e',
  coverEdge: '#5d3e22',
  player: '#2fd4b6',
  playerDark: '#1a8a74',
  guard: '#35507a',
  guardDark: '#24395c',
  guardSkin: '#e8b98a',
  conePatrol: 'rgba(255, 214, 64, 0.26)',
  coneSuspicious: 'rgba(255, 150, 40, 0.32)',
  coneChase: 'rgba(255, 70, 60, 0.34)',
  coneCamera: 'rgba(64, 224, 255, 0.20)',
  cameraBody: '#cfd8e8',
  loot: '#ffd94d',
  lootDark: '#c9a227',
  exit: '#39e07a',
  exitIdle: '#2c5c40',
  laser: '#ff3b4e',
  text: '#f2ecdd',
  muted: '#a9b2c8',
  panel: 'rgba(13, 18, 34, 0.92)',
  panelEdge: '#c9a227',
  alarmLow: '#39e07a',
  alarmMid: '#ffd94d',
  alarmHigh: '#ff5347',
  smoke: 'rgba(200, 208, 226, 0.45)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best run score is kept between visits (this browser only). */
export const BEST_KEY = 'the-gilded-hour.best';
