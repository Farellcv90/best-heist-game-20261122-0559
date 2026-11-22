// Sight geometry: rays against rectangles. Guards and cameras see through
// cones that walls and tall cover cut short, so hiding behind a shelf really
// does break the line.

/** Smallest t in [0, 1] where segment (x1,y1)->(x2,y2) enters rect, or null. */
export function segmentRectHit(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < rect.x || x1 > rect.x + rect.width) return null;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.width - x1) / dx;
    if (t1 > t2) { const swap = t1; t1 = t2; t2 = swap; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < rect.y || y1 > rect.y + rect.height) return null;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.height - y1) / dy;
    if (t1 > t2) { const swap = t1; t1 = t2; t2 = swap; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  return tMin;
}

/** Distance from (x, y) along angle until a solid rect stops the ray. */
export function rayDistance(x, y, angle, maxDistance, solids) {
  const x2 = x + Math.cos(angle) * maxDistance;
  const y2 = y + Math.sin(angle) * maxDistance;
  let best = maxDistance;
  for (const rect of solids) {
    const hit = segmentRectHit(x, y, x2, y2, rect);
    if (hit !== null && hit > 0.001) best = Math.min(best, hit * maxDistance);
  }
  return best;
}

/** True when nothing solid stands between two points. */
export function hasLineOfSight(x1, y1, x2, y2, solids) {
  for (const rect of solids) {
    const hit = segmentRectHit(x1, y1, x2, y2, rect);
    if (hit !== null && hit > 0.001 && hit < 0.999) return false;
  }
  return true;
}

/** Signed smallest turn from angle a to angle b, in [-PI, PI]. */
export function angleDifference(a, b) {
  let diff = (b - a) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * Is (px, py) inside the cone from (x, y) facing `facing`? Returns how deep
 * inside, 0 at the rim to 1 dead centre and close, or -1 when outside.
 * Walls are the caller's job: pair this with hasLineOfSight.
 */
export function pointInCone(x, y, facing, range, halfAngle, px, py) {
  const dx = px - x;
  const dy = py - y;
  const distance = Math.hypot(dx, dy);
  if (distance > range || distance < 0.001) return distance <= range ? 1 : -1;
  const off = Math.abs(angleDifference(facing, Math.atan2(dy, dx)));
  if (off > halfAngle) return -1;
  const centred = 1 - off / halfAngle;
  const close = 1 - distance / range;
  return 0.35 + 0.65 * (centred * 0.6 + close * 0.4);
}

/**
 * The visible cone as a polygon: the apex plus a fan of rays, each clipped
 * by the first solid it meets. The renderer fills exactly this shape, so
 * what the player sees is what the guard sees.
 */
export function castVisionCone(x, y, facing, range, halfAngle, solids, rays) {
  const points = [{ x, y }];
  const steps = rays || 22;
  for (let index = 0; index <= steps; index += 1) {
    const angle = facing - halfAngle + (2 * halfAngle * index) / steps;
    const distance = rayDistance(x, y, angle, range, solids);
    points.push({ x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance });
  }
  return points;
}
