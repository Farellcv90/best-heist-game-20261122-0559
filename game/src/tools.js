// Wren's pocket tricks, each bought with favors: a coin that talks, a puff
// of smoke that lies, and an EMP that puts the cameras to bed.

import { TOOLS } from './config.js';
import { sendGuardToNoise } from './guards.js';
import { disableCameras } from './cameras.js';

export function createToolBelt() {
  return {
    favors: TOOLS.startFavors,
    coins: 4,
    smokes: 2,
    emps: 1,
    coinFlight: null,
    smoke: { active: false, x: 0, y: 0, radius: TOOLS.smoke.radius, left: 0 },
    lastNoise: null,
  };
}

/** Restock between vaults: a fresh pocket, favors carried over. */
export function restockToolBelt(belt) {
  belt.coins = 4;
  belt.smokes = 2;
  belt.emps = 1;
  belt.coinFlight = null;
  belt.smoke.active = false;
  belt.smoke.left = 0;
  belt.lastNoise = null;
}

/**
 * Throw a coin toward (x, y), clamped to throwing range. The coin flies for
 * a beat, lands with a clink, and the nearest guard comes to look.
 */
export function throwCoin(belt, player, x, y) {
  if (belt.coins <= 0 || belt.favors < TOOLS.coin.cost || belt.coinFlight) return false;
  const dx = x - player.x;
  const dy = y - player.y;
  const distance = Math.hypot(dx, dy);
  const reach = Math.min(distance, TOOLS.coin.range);
  const scale = distance > 0.001 ? reach / distance : 0;
  belt.coins -= 1;
  belt.favors -= TOOLS.coin.cost;
  belt.coinFlight = {
    fromX: player.x,
    fromY: player.y,
    toX: player.x + dx * scale,
    toY: player.y + dy * scale,
    t: 0,
    seconds: 0.45,
  };
  return true;
}

/** Advance the coin; on landing, make the noise. Returns 'landed' or null. */
export function stepCoin(belt, guards, dt) {
  if (belt.lastNoise) {
    belt.lastNoise.left -= dt;
    if (belt.lastNoise.left <= 0) belt.lastNoise = null;
  }
  const flight = belt.coinFlight;
  if (!flight) return null;
  flight.t += dt / flight.seconds;
  if (flight.t < 1) return null;
  belt.coinFlight = null;
  belt.lastNoise = { x: flight.toX, y: flight.toY, left: 0.8 };
  sendGuardToNoise(guards, flight.toX, flight.toY, TOOLS.coin.noiseRadius, TOOLS.coin.investigateSeconds);
  return 'landed';
}

/** Where the flying coin is right now, with its little arc height. */
export function coinPosition(belt) {
  const flight = belt.coinFlight;
  if (!flight) return null;
  const t = Math.min(1, flight.t);
  return {
    x: flight.fromX + (flight.toX - flight.fromX) * t,
    y: flight.fromY + (flight.toY - flight.fromY) * t,
    height: Math.sin(t * Math.PI) * 26,
  };
}

/** Pop a smoke puff at Wren's feet: sight lines die inside it. */
export function popSmoke(belt, player) {
  if (belt.smokes <= 0 || belt.favors < TOOLS.smoke.cost) return false;
  belt.smokes -= 1;
  belt.favors -= TOOLS.smoke.cost;
  belt.smoke.active = true;
  belt.smoke.x = player.x;
  belt.smoke.y = player.y;
  belt.smoke.left = TOOLS.smoke.seconds;
  return true;
}

export function stepSmoke(belt, dt) {
  if (!belt.smoke.active) return;
  belt.smoke.left -= dt;
  if (belt.smoke.left <= 0) belt.smoke.active = false;
}

/** Fire the EMP: every camera sleeps. */
export function fireEmp(belt, cameras) {
  if (belt.emps <= 0 || belt.favors < TOOLS.emp.cost) return false;
  belt.emps -= 1;
  belt.favors -= TOOLS.emp.cost;
  disableCameras(cameras, TOOLS.emp.seconds);
  return true;
}
