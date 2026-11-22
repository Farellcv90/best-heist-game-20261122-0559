// A tiny seeded generator (mulberry32). One seed, one night: the same seed
// always deals the same patrol jitter, which keeps the screenshot scenes
// repeatable frame for frame.

export function createRandom(seed) {
  let state = seed | 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [low, high) from a generator made above. */
export function rangeBetween(random, low, high) {
  return low + random() * (high - low);
}
