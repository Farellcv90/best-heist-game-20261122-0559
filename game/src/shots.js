// The screenshot scenes behind ?shot=cover|gallery|vault|getaway. Each one
// stages the real rules in a real vault — guards patrolling, cones sweeping,
// tools in flight — then freezes the frame the camera should catch. The
// same seed always stages the same night.

import { STEP } from './config.js';
import { SCREEN_CLEAR, SCREEN_PLAY } from './render.js';
import { GUARD_SUSPICIOUS } from './guards.js';

const IDLE = { moveX: 0, moveY: 0, sneak: false, steal: false, coin: null, smoke: false, emp: false };

function idleSteps(world, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let index = 0; index < steps; index += 1) world.stepWorld(STEP, IDLE);
}

function faceToward(entity, x, y) {
  entity.facing = Math.atan2(y - entity.y, x - entity.x);
}

/** Vault II mid-crossing: every eye in the room on one frame. */
function stageCover(world) {
  world.startVault(1);
  const state = world.state;
  state.player.x = 640;
  state.player.y = 432;
  state.player.facing = -Math.PI / 2;
  idleSteps(world, 0.9);
  state.player.x = 640;
  state.player.y = 432;
  const wary = state.guards[0];
  wary.x = 452;
  wary.y = 342;
  wary.state = GUARD_SUSPICIOUS;
  wary.suspicion = 0.62;
  faceToward(wary, state.player.x, state.player.y);
  state.alarm.value = 45;
  state.alarm.peak = 45;
  state.alarm.quietFor = 0;
  return { screen: SCREEN_PLAY, best: 0 };
}

/** Vault II from the laser's side: a coin in the air, a guard asking why. */
function stageGallery(world) {
  world.startVault(1);
  const state = world.state;
  state.player.x = 640;
  state.player.y = 402;
  state.player.facing = -Math.PI / 2;
  idleSteps(world, 0.7);
  state.player.x = 640;
  state.player.y = 402;
  const wary = state.guards[1];
  wary.x = 812;
  wary.y = 318;
  wary.state = GUARD_SUSPICIOUS;
  wary.suspicion = 0.55;
  faceToward(wary, state.player.x, state.player.y);
  state.belt.coinFlight = {
    fromX: state.player.x,
    fromY: state.player.y,
    toX: 548,
    toY: 318,
    t: 0.55,
    seconds: 0.45,
  };
  state.alarm.value = 30;
  state.alarm.peak = 30;
  state.alarm.quietFor = 0;
  return { screen: SCREEN_PLAY, best: 0 };
}

/** Vault III at full heat: smoke up, alarm red, exit lit green. */
function stageVault(world) {
  world.startVault(2);
  const state = world.state;
  state.player.x = 640;
  state.player.y = 302;
  state.player.facing = Math.PI / 2;
  state.player.hasLoot = true;
  idleSteps(world, 0.8);
  state.player.x = 640;
  state.player.y = 302;
  state.player.hasLoot = true;
  state.belt.smoke.active = true;
  state.belt.smoke.x = state.player.x + 36;
  state.belt.smoke.y = state.player.y;
  state.belt.smoke.left = 2.4;
  state.alarm.value = 75;
  state.alarm.peak = 75;
  state.alarm.quietFor = 0;
  return { screen: SCREEN_PLAY, best: 0 };
}

/** The getaway that pays: Vault II cleared, tally over the room. */
function stageGetaway(world) {
  world.startVault(1);
  const state = world.state;
  idleSteps(world, 0.6);
  state.player.hasLoot = true;
  state.sideScore = 4800;
  state.vaultTime = 42;
  state.alarm.value = 12;
  state.alarm.peak = 18;
  state.player.x = state.vault.exit.x + 52;
  state.player.y = state.vault.exit.y + 50;
  world.stepWorld(STEP, IDLE);
  return { screen: SCREEN_CLEAR, best: state.totalScore };
}

/** Set `world` to the named scene and return the screen to draw over it. */
export function stageShot(name, world) {
  if (name === 'gallery') return stageGallery(world);
  if (name === 'vault') return stageVault(world);
  if (name === 'getaway') return stageGetaway(world);
  return stageCover(world);
}
