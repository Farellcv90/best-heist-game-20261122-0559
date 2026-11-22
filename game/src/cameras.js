// Wall cameras: patient cyan cones that sweep on a slow sine. They cannot
// chase, but they never blink — unless an EMP puts them to sleep.

import { CAMERA } from './config.js';
import { hasLineOfSight, pointInCone } from './vision.js';

export function createCamera(spec) {
  return {
    x: spec.x,
    y: spec.y,
    baseAngle: spec.baseAngle,
    phase: spec.phase,
    facing: spec.baseAngle,
    disabledFor: 0,
    seesPlayer: false,
    seeStrength: 0,
  };
}

/** Sweep every camera one step and note who can see the player. */
export function stepCameras(cameras, player, solids, smoke, elapsed, dt) {
  for (const camera of cameras) {
    if (camera.disabledFor > 0) camera.disabledFor = Math.max(0, camera.disabledFor - dt);
    const sweep = Math.sin(((elapsed + camera.phase) / CAMERA.sweepPeriod) * Math.PI * 2);
    camera.facing = camera.baseAngle + sweep * CAMERA.sweepAngle;
    camera.seesPlayer = false;
    camera.seeStrength = 0;
    if (camera.disabledFor > 0) continue;
    if (smoke && smoke.active) {
      const inSmoke = Math.hypot(player.x - smoke.x, player.y - smoke.y) < smoke.radius;
      if (inSmoke) continue;
    }
    const strength = pointInCone(
      camera.x, camera.y, camera.facing, CAMERA.coneRange, CAMERA.coneHalfAngle, player.x, player.y,
    );
    if (strength < 0) continue;
    if (!hasLineOfSight(camera.x, camera.y, player.x, player.y, solids)) continue;
    camera.seesPlayer = true;
    camera.seeStrength = strength;
  }
}

/** EMP: every camera in the vault sleeps for a few seconds. */
export function disableCameras(cameras, seconds) {
  for (const camera of cameras) {
    camera.disabledFor = Math.max(camera.disabledFor, seconds);
    camera.seesPlayer = false;
    camera.seeStrength = 0;
  }
}
