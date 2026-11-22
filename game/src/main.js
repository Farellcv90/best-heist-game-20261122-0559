// Boot and the one loop of The Gilded Hour. Input is read every frame, the
// world advances in fixed 1/60 s steps, and the renderer paints what is
// there. Screens: title, briefing, play, paused, caught, vault clear, run
// clear. ?shot=cover|gallery|vault|getaway (with &seed=N) stages that scene
// instead, paints it twice and sets window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_CAUGHT, EVENT_CLEAR, EVENT_COIN_LANDED, EVENT_EMP,
  EVENT_LASER, EVENT_LOOT, EVENT_SIDE_LOOT, EVENT_SMOKE, EVENT_STEP,
} from './world.js';
import {
  ACTION_CONFIRM, ACTION_EMP, ACTION_MUTE, ACTION_PAUSE, ACTION_RETRY,
  ACTION_SMOKE, createInput,
} from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer, SCREEN_BRIEFING, SCREEN_CAUGHT, SCREEN_CLEAR,
  SCREEN_PAUSED, SCREEN_PLAY, SCREEN_RUN_CLEAR, SCREEN_TITLE,
} from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, renderer.toField);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function beginRun() {
    world.startRun();
    screen = SCREEN_BRIEFING;
    announce(`${world.state.vault.name}. Target ${world.state.vault.lootName}.`);
  }

  function beginVault() {
    input.clearCoin();
    screen = SCREEN_PLAY;
    announce('Infiltrate. Stay out of the cones.');
  }

  function retryVault() {
    world.startVault(world.state.vaultIndex);
    screen = SCREEN_BRIEFING;
    announce('Try the vault again.');
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) {
        audio.unlock();
        beginRun();
      }
      return;
    }
    if (screen === SCREEN_BRIEFING) {
      if (actions & ACTION_CONFIRM) {
        audio.unlock();
        beginVault();
      }
      return;
    }
    if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (screen === SCREEN_CAUGHT) {
      if (actions & (ACTION_RETRY | ACTION_CONFIRM)) retryVault();
      return;
    }
    if (screen === SCREEN_CLEAR) {
      if (actions & ACTION_CONFIRM) {
        world.startVault(world.state.vaultIndex + 1);
        screen = SCREEN_BRIEFING;
        announce(`${world.state.vault.name}.`);
      }
      return;
    }
    if (screen === SCREEN_RUN_CLEAR) {
      if (actions & ACTION_CONFIRM) {
        screen = SCREEN_TITLE;
        announce('The Gilded Hour. Press Enter to play.');
      }
    }
  }

  function reactToEvents(events) {
    if (events & EVENT_STEP) audio.playStep();
    if (events & EVENT_COIN_LANDED) audio.playCoinClink();
    if (events & EVENT_SMOKE) audio.playSmoke();
    if (events & EVENT_EMP) audio.playEmp();
    if (events & EVENT_SIDE_LOOT) audio.playSideLoot();
    if (events & EVENT_LOOT) {
      audio.playVaultDing();
      announce('Loot taken. Get to the exit.');
    }
    if (events & EVENT_LASER) {
      audio.playLaserZap();
      announce('Laser tripped. Alarm rising.');
    }
    if (events & EVENT_CAUGHT) {
      audio.playCaughtSting();
      screen = SCREEN_CAUGHT;
      announce(`Caught. ${world.state.caughtReason}`);
    }
    if (events & EVENT_CLEAR) {
      audio.playClearJingle();
      const tally = world.state.tally;
      if (tally && tally.lastVault) {
        screen = SCREEN_RUN_CLEAR;
        if (world.state.totalScore > best) {
          best = world.state.totalScore;
          saveBest(best);
        }
        announce(`Run clear. Total ${world.state.totalScore}.`);
      } else {
        screen = SCREEN_CLEAR;
        announce('Vault clear.');
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_PLAY) {
      let firstStep = true;
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        const snap = input.snapshot();
        if (firstStep && (actions & ACTION_SMOKE)) snap.smoke = true;
        if (firstStep && (actions & ACTION_EMP)) snap.emp = true;
        firstStep = false;
        const events = world.stepWorld(STEP, snap);
        reactToEvents(events);
        accumulator -= STEP;
      }
      audio.playAlarmBeep(world.state.alarm.value, world.state.elapsed);
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, audio.isMuted());
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Gilded Hour. Press Enter or click to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
