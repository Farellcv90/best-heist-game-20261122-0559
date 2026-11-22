// Wren, the thief: movement with wall sliding, a quiet sneak, and the slow
// two-and-a-half-second steal that is the heart of every vault.

import { PLAYER } from './config.js';

export function createPlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    radius: PLAYER.radius,
    facing: -Math.PI / 2,
    sneaking: false,
    moving: false,
    stealProgress: 0,
    hasLoot: false,
    stepPhase: 0,
  };
}

function circleHitsRect(x, y, radius, rect) {
  const nearX = Math.max(rect.x, Math.min(x, rect.x + rect.width));
  const nearY = Math.max(rect.y, Math.min(y, rect.y + rect.height));
  const dx = x - nearX;
  const dy = y - nearY;
  return dx * dx + dy * dy < radius * radius;
}

function blocked(x, y, radius, solids) {
  for (const rect of solids) {
    if (circleHitsRect(x, y, radius, rect)) return true;
  }
  return false;
}

/**
 * Move the player one step. Axes resolve separately so she slides along
 * shelves instead of sticking to them. Returns the distance travelled.
 */
export function stepPlayer(player, moveX, moveY, sneak, dt, solids) {
  player.sneaking = sneak;
  const length = Math.hypot(moveX, moveY);
  player.moving = length > 0.01;
  if (!player.moving) return 0;
  const speed = sneak ? PLAYER.sneakSpeed : PLAYER.speed;
  const vx = (moveX / length) * speed;
  const vy = (moveY / length) * speed;
  player.facing = Math.atan2(vy, vx);
  const startX = player.x;
  const startY = player.y;
  const nextX = player.x + vx * dt;
  if (!blocked(nextX, player.y, player.radius, solids)) player.x = nextX;
  const nextY = player.y + vy * dt;
  if (!blocked(player.x, nextY, player.radius, solids)) player.y = nextY;
  const travelled = Math.hypot(player.x - startX, player.y - startY);
  player.stepPhase += travelled * 0.09;
  return travelled;
}

/** Shared circle-vs-rects test for guards and tools. */
export function circleBlocked(x, y, radius, solids) {
  return blocked(x, y, radius, solids);
}
