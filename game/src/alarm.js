// The alarm meter: one number, 0 to 100, that every eye in the room feeds.
// It climbs while Wren is seen, eases off while she is not, and at 100 the
// night is over. The peak is remembered for the score.

import { ALARM } from './config.js';

export function createAlarm() {
  return { value: 0, peak: 0, quietFor: 0, level: 0, caught: false };
}

/** Add suspicion from one watcher for one step; `strength` is 0..1 depth. */
export function addSuspicion(alarm, rate, strength, dt) {
  alarm.value = Math.min(ALARM.max, alarm.value + rate * Math.max(0.15, strength) * dt);
  alarm.peak = Math.max(alarm.peak, alarm.value);
  alarm.quietFor = 0;
  if (alarm.value >= ALARM.max) alarm.caught = true;
}

/** A sudden jolt: a laser trip or the vault door sighing open. */
export function spikeAlarm(alarm, amount) {
  alarm.value = Math.min(ALARM.max, alarm.value + amount);
  alarm.peak = Math.max(alarm.peak, alarm.value);
  alarm.quietFor = 0;
  if (alarm.value >= ALARM.max) alarm.caught = true;
}

/** Ease the meter down once nobody has seen anything for a breath. */
export function decayAlarm(alarm, seen, dt) {
  if (seen) return;
  alarm.quietFor += dt;
  if (alarm.quietFor > ALARM.decayDelay) {
    alarm.value = Math.max(0, alarm.value - ALARM.decayRate * dt);
  }
}

/** The meter's colour band: 0 calm, 1 wary, 2 hot. */
export function alarmBand(alarm) {
  if (alarm.value >= 70) return 2;
  if (alarm.value >= 35) return 1;
  return 0;
}
