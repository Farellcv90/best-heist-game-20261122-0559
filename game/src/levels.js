// The three vaults of the Meridian Trust, as plain data. Every vault is one
// screen: spawn and exit sit opposite the loot, tall cover breaks sight
// lines, and each room offers at least two ways in — a loud fast lane and a
// quiet slow one. Coordinates are field pixels inside ROOM (48,92,1184,576).

function rect(x, y, width, height) {
  return { x, y, width, height };
}

function point(x, y) {
  return { x, y };
}

export const VAULTS = [
  {
    name: 'Vault I — The Counting Room',
    shortName: 'THE COUNTING ROOM',
    lootName: 'Ledger of Names',
    lootValue: 40000,
    floorStyle: 'plank',
    spawn: point(120, 600),
    exit: rect(64, 552, 104, 100),
    loot: point(1090, 160),
    walls: [rect(600, 108, 22, 150), rect(300, 430, 180, 22)],
    cover: [
      rect(260, 180, 190, 30), rect(260, 320, 190, 30), rect(700, 300, 30, 190),
      rect(880, 470, 210, 30), rect(520, 540, 200, 30), rect(960, 250, 110, 44),
      rect(150, 430, 110, 44), rect(1040, 420, 110, 44),
    ],
    noisy: [rect(470, 250, 340, 210)],
    carpet: [rect(64, 470, 300, 182), rect(900, 108, 316, 140)],
    guards: [
      { waypoints: [point(520, 255), point(660, 255), point(660, 520), point(520, 520)], start: 0 },
      { waypoints: [point(850, 190), point(1140, 190), point(1140, 520), point(850, 520)], start: 1 },
    ],
    cameras: [{ x: 640, y: 118, baseAngle: Math.PI / 2, phase: 0 }],
    lasers: [],
    sideLoot: [
      { x: 200, y: 150, value: 800 }, { x: 720, y: 600, value: 1200 }, { x: 1140, y: 600, value: 1500 },
    ],
    briefing: 'Two guards, one camera. The shelves on the left are slow and safe; the marble middle is fast and loud.',
  },
  {
    name: 'Vault II — The Glass Gallery',
    shortName: 'THE GLASS GALLERY',
    lootName: 'Meridian Star',
    lootValue: 90000,
    floorStyle: 'checker',
    spawn: point(120, 600),
    exit: rect(1112, 552, 104, 100),
    loot: point(640, 164),
    walls: [rect(430, 108, 22, 170), rect(828, 108, 22, 170), rect(560, 470, 160, 22)],
    cover: [
      rect(180, 200, 160, 30), rect(940, 200, 160, 30), rect(180, 400, 160, 30),
      rect(940, 400, 160, 30), rect(540, 300, 200, 30), rect(300, 540, 160, 30),
      rect(820, 540, 160, 30), rect(600, 146, 80, 36),
    ],
    noisy: [rect(380, 220, 520, 300)],
    carpet: [rect(64, 108, 180, 544), rect(1036, 108, 180, 544), rect(64, 560, 1152, 92)],
    guards: [
      { waypoints: [point(390, 280), point(500, 280), point(500, 430), point(390, 430)], start: 0 },
      { waypoints: [point(890, 280), point(780, 280), point(780, 430), point(890, 430)], start: 0 },
      { waypoints: [point(420, 500), point(860, 500), point(860, 530), point(420, 530)], start: 0 },
    ],
    cameras: [
      { x: 320, y: 118, baseAngle: Math.PI / 2, phase: 0 },
      { x: 960, y: 118, baseAngle: Math.PI / 2, phase: 2.0 },
    ],
    lasers: [{ x1: 500, y1: 360, x2: 780, y2: 360, phase: 0 }],
    sideLoot: [
      { x: 140, y: 150, value: 1000 }, { x: 1140, y: 150, value: 1000 },
      { x: 640, y: 610, value: 2000 }, { x: 350, y: 622, value: 800 },
    ],
    briefing: 'Three guards, two cameras, one laser. Marble carries every step; the carpet edges stay silent.',
  },
  {
    name: 'Vault III — The Sunken Vault',
    shortName: 'THE SUNKEN VAULT',
    lootName: 'The Gilded Hour',
    lootValue: 250000,
    floorStyle: 'stone',
    spawn: point(120, 600),
    exit: rect(1112, 552, 104, 100),
    loot: point(640, 158),
    walls: [
      rect(350, 108, 22, 200), rect(908, 108, 22, 200), rect(560, 330, 160, 22),
      rect(200, 470, 22, 130), rect(1058, 470, 22, 130),
    ],
    cover: [
      rect(480, 180, 120, 30), rect(680, 180, 120, 30), rect(150, 250, 170, 30),
      rect(960, 250, 170, 30), rect(430, 430, 170, 30), rect(680, 430, 170, 30),
      rect(250, 570, 150, 30), rect(880, 570, 150, 30), rect(590, 140, 100, 36),
    ],
    noisy: [rect(340, 260, 600, 240)],
    carpet: [
      rect(64, 470, 260, 182), rect(956, 470, 260, 182),
      rect(64, 108, 240, 120), rect(976, 108, 240, 120),
    ],
    guards: [
      { waypoints: [point(340, 320), point(405, 320), point(405, 480), point(340, 480)], start: 0 },
      { waypoints: [point(940, 320), point(875, 320), point(875, 480), point(940, 480)], start: 0 },
      { waypoints: [point(460, 240), point(820, 240), point(820, 285), point(460, 285)], start: 0 },
      { waypoints: [point(420, 600), point(860, 600), point(860, 625), point(420, 625)], start: 0 },
    ],
    cameras: [
      { x: 200, y: 118, baseAngle: Math.PI / 2, phase: 0 },
      { x: 520, y: 118, baseAngle: Math.PI / 2, phase: 2.1 },
      { x: 1080, y: 118, baseAngle: Math.PI / 2, phase: 4.2 },
    ],
    lasers: [
      { x1: 430, y1: 390, x2: 850, y2: 390, phase: 0 },
      { x1: 980, y1: 460, x2: 980, y2: 550, phase: 1.1 },
    ],
    sideLoot: [
      { x: 120, y: 140, value: 1500 }, { x: 1160, y: 140, value: 1500 },
      { x: 640, y: 610, value: 3000 }, { x: 120, y: 380, value: 1200 }, { x: 1160, y: 380, value: 1200 },
    ],
    briefing: 'Four guards, three cameras, two lasers. The clock is heavy, the way out is far. Move like smoke.',
  },
];

/** Every solid rectangle of a vault: border walls, inner walls and tall cover. */
export function solidRectsOf(vault) {
  const border = [
    rect(48, 92, 1184, 16), rect(48, 652, 1184, 16),
    rect(48, 92, 16, 576), rect(1216, 92, 16, 576),
  ];
  return border.concat(vault.walls, vault.cover);
}

/** True when (x, y) stands on a loud floor of this vault. */
export function isNoisyFloor(vault, x, y) {
  for (const zone of vault.noisy) {
    if (x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height) return true;
  }
  return false;
}
