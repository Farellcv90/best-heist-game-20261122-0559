// The night itself: one world holding the current vault, every guard and
// camera in it, the alarm, the tools and the score. stepWorld advances the
// whole heist by one fixed step and reports what happened as event flags.

import { ALARM, LASER, PLAYER } from './config.js';
import { VAULTS, isNoisyFloor, solidRectsOf } from './levels.js';
import { createPlayer, stepPlayer } from './player.js';
import { createGuard, guardSight, stepGuards } from './guards.js';
import { createCamera, stepCameras } from './cameras.js';
import { createAlarm, addSuspicion, decayAlarm, spikeAlarm } from './alarm.js';
import { createToolBelt, fireEmp, popSmoke, restockToolBelt, stepCoin, stepSmoke, throwCoin } from './tools.js';

export const EVENT_COIN_LANDED = 1;
export const EVENT_SMOKE = 2;
export const EVENT_EMP = 4;
export const EVENT_LOOT = 8;
export const EVENT_SIDE_LOOT = 16;
export const EVENT_LASER = 32;
export const EVENT_CAUGHT = 64;
export const EVENT_CLEAR = 128;
export const EVENT_STEP = 256;

function laserIsOn(laser, elapsed) {
  const cycle = LASER.onSeconds + LASER.offSeconds;
  const t = (elapsed + laser.phase) % cycle;
  return t < LASER.onSeconds;
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

export function createWorld(random) {
  const belt = createToolBelt();
  const state = {
    vaultIndex: 0,
    vault: VAULTS[0],
    solids: solidRectsOf(VAULTS[0]),
    player: createPlayer(VAULTS[0].spawn),
    guards: [],
    cameras: [],
    alarm: createAlarm(),
    belt,
    sideLoot: [],
    elapsed: 0,
    vaultTime: 0,
    totalScore: 0,
    vaultScore: 0,
    sideScore: 0,
    caughtReason: '',
    tally: null,
    finished: false,
    laserCooldown: 0,
    shake: 0,
    prevPlayerX: 0,
    prevPlayerY: 0,
    stepAccumulator: 0,
  };

  function startVault(index) {
    const vault = VAULTS[index];
    state.vaultIndex = index;
    state.vault = vault;
    state.solids = solidRectsOf(vault);
    state.player = createPlayer(vault.spawn);
    state.prevPlayerX = vault.spawn.x;
    state.prevPlayerY = vault.spawn.y;
    const speedScale = 1 + index * 0.06 + state.alarm.level * 0.1;
    state.guards = vault.guards.map((spec) => createGuard(spec, speedScale));
    state.cameras = vault.cameras.map((spec) => createCamera(spec));
    state.alarm = createAlarm();
    state.alarm.level = index;
    state.sideLoot = vault.sideLoot.map((item) => ({ x: item.x, y: item.y, value: item.value, taken: false }));
    state.vaultTime = 0;
    state.vaultScore = 0;
    state.sideScore = 0;
    state.caughtReason = '';
    state.tally = null;
    state.finished = false;
    state.laserCooldown = 0;
    state.shake = 0;
    restockToolBelt(belt);
    // A breath of patrol jitter so no two nights walk quite alike.
    for (const guard of state.guards) guard.stepPhase = random() * 6;
  }

  function startRun() {
    state.totalScore = 0;
    state.elapsed = 0;
    belt.favors = 6;
    startVault(0);
  }

  function gradeFor(score, lootValue) {
    const ratio = score / Math.max(1, lootValue);
    if (ratio >= 1.15) return 'S';
    if (ratio >= 1.02) return 'A';
    if (ratio >= 0.86) return 'B';
    return 'C';
  }

  function finishVault() {
    const vault = state.vault;
    const timeBonus = Math.max(0, Math.round(6000 - state.vaultTime * 25));
    const ghostBonus = state.alarm.peak < 35 ? 5000 : 0;
    const alarmPenalty = Math.round(state.alarm.peak * 40);
    const score = Math.max(0, vault.lootValue + state.sideScore + timeBonus + ghostBonus - alarmPenalty);
    state.vaultScore = score;
    state.totalScore += score;
    belt.favors += ghostBonus > 0 ? 2 : 1;
    state.tally = {
      vaultName: vault.name,
      lootName: vault.lootName,
      lootValue: vault.lootValue,
      sideScore: state.sideScore,
      timeBonus,
      ghostBonus,
      alarmPenalty,
      alarmPeak: Math.round(state.alarm.peak),
      seconds: Math.round(state.vaultTime),
      score,
      grade: gradeFor(score, vault.lootValue),
      totalScore: state.totalScore,
      runGrade: gradeFor(state.totalScore, VAULTS.reduce((sum, v) => sum + v.lootValue, 0)),
      lastVault: state.vaultIndex >= VAULTS.length - 1,
    };
    state.finished = true;
  }

  /**
   * One fixed step. `input` is { moveX, moveY, sneak, steal, coin, smoke,
   * emp } where coin is {x, y} in field pixels or null. Returns EVENT_* flags.
   */
  function stepWorld(dt, input) {
    let events = 0;
    if (state.finished) return events;
    state.elapsed += dt;
    state.vaultTime += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);
    if (state.laserCooldown > 0) state.laserCooldown -= dt;

    const player = state.player;
    state.prevPlayerX = player.x;
    state.prevPlayerY = player.y;

    // Tools first, so a smoke popped this frame already hides her.
    if (input.coin && throwCoin(belt, player, input.coin.x, input.coin.y)) {
      // The clink lands a beat later, in stepCoin.
    }
    if (input.smoke && popSmoke(belt, player)) events |= EVENT_SMOKE;
    if (input.emp && fireEmp(belt, state.cameras)) events |= EVENT_EMP;
    if (stepCoin(belt, state.guards, dt) === 'landed') events |= EVENT_COIN_LANDED;
    stepSmoke(belt, dt);

    const travelled = stepPlayer(player, input.moveX, input.moveY, input.sneak, dt, state.solids);
    if (travelled > 0) {
      state.stepAccumulator += travelled;
      if (state.stepAccumulator > 46) {
        state.stepAccumulator = 0;
        events |= EVENT_STEP;
      }
    }

    // Side loot: walk over it, pocket it, earn a favor.
    for (const item of state.sideLoot) {
      if (item.taken) continue;
      if (Math.hypot(player.x - item.x, player.y - item.y) < 26) {
        item.taken = true;
        state.sideScore += item.value;
        belt.favors += 1;
        events |= EVENT_SIDE_LOOT;
      }
    }

    // The steal: hold still, hold E, watch the ring fill.
    const vault = state.vault;
    const nearLoot = !player.hasLoot
      && Math.hypot(player.x - vault.loot.x, player.y - vault.loot.y) < PLAYER.stealRange;
    if (nearLoot && input.steal && !player.moving) {
      player.stealProgress += dt / PLAYER.stealSeconds;
      if (player.stealProgress >= 1) {
        player.stealProgress = 0;
        player.hasLoot = true;
        state.alarm.level += 1;
        spikeAlarm(state.alarm, ALARM.stealSpike);
        for (const guard of state.guards) guard.speedScale *= 1.12;
        events |= EVENT_LOOT;
      }
    } else if (!nearLoot) {
      player.stealProgress = Math.max(0, player.stealProgress - dt * 0.5);
    }

    // Eyes: guards and cameras feed the meter.
    const sight = state.guards.map((guard) => guardSight(guard, player, state.solids, belt.smoke));
    stepCameras(state.cameras, player, state.solids, belt.smoke, state.elapsed, dt);
    let seen = false;
    for (let index = 0; index < sight.length; index += 1) {
      if (sight[index] > 0) {
        seen = true;
        addSuspicion(state.alarm, ALARM.guardRate, sight[index] * (player.sneaking ? 0.55 : 1), dt);
      }
    }
    for (const camera of state.cameras) {
      if (camera.seesPlayer) {
        seen = true;
        addSuspicion(state.alarm, ALARM.cameraRate, camera.seeStrength * (player.sneaking ? 0.6 : 1), dt);
      }
    }
    if (player.moving && !player.sneaking && isNoisyFloor(vault, player.x, player.y)) {
      seen = true;
      addSuspicion(state.alarm, ALARM.noisyRate, 1, dt);
    }
    decayAlarm(state.alarm, seen, dt);

    const grabbed = stepGuards(state.guards, player, sight, dt, state.solids);

    // Lasers: crossing a live beam is loud.
    if (state.laserCooldown <= 0) {
      for (const laser of vault.lasers) {
        if (!laserIsOn(laser, state.elapsed)) continue;
        if (segmentsCross(
          state.prevPlayerX, state.prevPlayerY, player.x, player.y,
          laser.x1, laser.y1, laser.x2, laser.y2,
        )) {
          spikeAlarm(state.alarm, ALARM.laserSpike);
          state.laserCooldown = LASER.cooldown;
          state.shake = 1;
          events |= EVENT_LASER;
          break;
        }
      }
    }

    if (grabbed) {
      state.caughtReason = 'A guard got a hand on Wren.';
      state.finished = true;
      events |= EVENT_CAUGHT;
      return events;
    }
    if (state.alarm.caught) {
      state.caughtReason = 'The alarm hit 100. The Trust locks down.';
      state.finished = true;
      events |= EVENT_CAUGHT;
      return events;
    }

    // The getaway: loot in hand, feet in the green.
    if (player.hasLoot) {
      const exit = vault.exit;
      if (player.x >= exit.x && player.x <= exit.x + exit.width
        && player.y >= exit.y && player.y <= exit.y + exit.height) {
        finishVault();
        events |= EVENT_CLEAR;
      }
    }
    return events;
  }

  startRun();
  return { state, startRun, startVault, stepWorld, laserIsOn };
}

/** Re-exported so the renderer can ask whether a beam is live. */
export { laserIsOn as laserLive };
