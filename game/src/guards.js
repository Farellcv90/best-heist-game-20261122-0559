// Guards: patient patrols with honest eyes. Each one walks a waypoint loop,
// stops and stares when something flickers at the edge of its cone, gives
// chase only after a fair grace beat, and loses the trail when the line of
// sight stays broken.

import { GUARD } from './config.js';
import { angleDifference, hasLineOfSight, pointInCone } from './vision.js';
import { circleBlocked } from './player.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_CHASE = 'chase';
export const GUARD_INVESTIGATE = 'investigate';
export const GUARD_RETURN = 'return';

export function createGuard(spec, speedScale) {
  const start = spec.waypoints[spec.start % spec.waypoints.length];
  const next = spec.waypoints[(spec.start + 1) % spec.waypoints.length];
  return {
    x: start.x,
    y: start.y,
    radius: GUARD.radius,
    facing: Math.atan2(next.y - start.y, next.x - start.x),
    waypoints: spec.waypoints,
    waypointIndex: (spec.start + 1) % spec.waypoints.length,
    state: GUARD_PATROL,
    suspicion: 0,
    seenFor: 0,
    unseenFor: 0,
    investigateX: 0,
    investigateY: 0,
    investigateFor: 0,
    lastSeenX: 0,
    lastSeenY: 0,
    speedScale: speedScale || 1,
    stepPhase: 0,
    seesPlayer: false,
    seeStrength: 0,
  };
}

function turnToward(guard, targetAngle, dt, rate) {
  const diff = angleDifference(guard.facing, targetAngle);
  const turn = Math.max(-rate * dt, Math.min(rate * dt, diff));
  guard.facing += turn;
  return Math.abs(diff - turn) < 0.02;
}

function walkToward(guard, targetX, targetY, speed, dt, solids) {
  const dx = targetX - guard.x;
  const dy = targetY - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 4) return true;
  turnToward(guard, Math.atan2(dy, dx), dt, 3.4);
  const step = Math.min(distance, speed * guard.speedScale * dt);
  const vx = (dx / distance) * step;
  const vy = (dy / distance) * step;
  if (!circleBlocked(guard.x + vx, guard.y, guard.radius, solids)) guard.x += vx;
  if (!circleBlocked(guard.x, guard.y + vy, guard.radius, solids)) guard.y += vy;
  guard.stepPhase += step * 0.08;
  return Math.hypot(targetX - guard.x, targetY - guard.y) < 6;
}

/** How strongly this guard sees the player right now, 0 when blind to her. */
export function guardSight(guard, player, solids, smoke) {
  if (smoke && smoke.active) {
    const inSmoke = Math.hypot(player.x - smoke.x, player.y - smoke.y) < smoke.radius;
    if (inSmoke) return 0;
  }
  const strength = pointInCone(
    guard.x, guard.y, guard.facing, GUARD.coneRange, GUARD.coneHalfAngle, player.x, player.y,
  );
  if (strength < 0) return 0;
  if (!hasLineOfSight(guard.x, guard.y, player.x, player.y, solids)) return 0;
  return strength;
}

/**
 * Advance every guard one step. `sight` maps guard -> strength from
 * guardSight. Returns true when a guard lays a hand on the player.
 */
export function stepGuards(guards, player, sight, dt, solids) {
  let caught = false;
  for (let index = 0; index < guards.length; index += 1) {
    const guard = guards[index];
    const strength = sight[index];
    guard.seesPlayer = strength > 0;
    guard.seeStrength = strength;
    if (strength > 0) {
      guard.seenFor += dt;
      guard.unseenFor = 0;
      guard.lastSeenX = player.x;
      guard.lastSeenY = player.y;
      const fill = strength * (player.sneaking ? 0.5 : 1) * 1.35;
      guard.suspicion = Math.min(1, guard.suspicion + fill * dt);
    } else {
      guard.seenFor = 0;
      guard.unseenFor += dt;
      guard.suspicion = Math.max(0, guard.suspicion - 0.22 * dt);
    }

    if (guard.state === GUARD_PATROL) {
      if (guard.suspicion > 0.32) {
        guard.state = GUARD_SUSPICIOUS;
      } else {
        const target = guard.waypoints[guard.waypointIndex];
        if (walkToward(guard, target.x, target.y, GUARD.patrolSpeed, dt, solids)) {
          guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        }
      }
    } else if (guard.state === GUARD_SUSPICIOUS) {
      if (strength > 0) {
        turnToward(guard, Math.atan2(player.y - guard.y, player.x - guard.x), dt, 2.6);
        if (guard.suspicion >= 1 && guard.seenFor >= GUARD.graceSeconds) {
          guard.state = GUARD_CHASE;
        }
      } else if (guard.suspicion <= 0.05) {
        guard.state = GUARD_RETURN;
      }
    } else if (guard.state === GUARD_CHASE) {
      const tx = strength > 0 ? player.x : guard.lastSeenX;
      const ty = strength > 0 ? player.y : guard.lastSeenY;
      walkToward(guard, tx, ty, GUARD.chaseSpeed, dt, solids);
      if (guard.unseenFor >= GUARD.loseSightSeconds) {
        guard.state = GUARD_RETURN;
        guard.suspicion = 0.4;
      }
    } else if (guard.state === GUARD_INVESTIGATE) {
      guard.investigateFor -= dt;
      if (strength > 0 && guard.suspicion > 0.32) {
        guard.state = GUARD_SUSPICIOUS;
      } else {
        walkToward(guard, guard.investigateX, guard.investigateY, GUARD.investigateSpeed, dt, solids);
        if (guard.investigateFor <= 0) guard.state = GUARD_RETURN;
      }
    } else if (guard.state === GUARD_RETURN) {
      if (strength > 0 && guard.suspicion > 0.32) {
        guard.state = GUARD_SUSPICIOUS;
      } else {
        const target = guard.waypoints[guard.waypointIndex];
        if (walkToward(guard, target.x, target.y, GUARD.patrolSpeed, dt, solids)) {
          guard.state = GUARD_PATROL;
        }
      }
    }

    if (Math.hypot(player.x - guard.x, player.y - guard.y) < GUARD.catchRange) caught = true;
  }
  return caught;
}

/** Send the nearest guard to look at a noise, if one is close enough to hear. */
export function sendGuardToNoise(guards, x, y, radius, seconds) {
  let best = null;
  let bestDistance = radius;
  for (const guard of guards) {
    if (guard.state === GUARD_CHASE) continue;
    const distance = Math.hypot(x - guard.x, y - guard.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = guard;
    }
  }
  if (best === null) return false;
  best.state = GUARD_INVESTIGATE;
  best.investigateX = x;
  best.investigateY = y;
  best.investigateFor = seconds;
  return true;
}
