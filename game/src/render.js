// Drawing only: the world's state and the current screen in, pixels out.
// Cones are filled from the same raycast the rules use, so the light on the
// floor is exactly what each watcher can see.

import { CAMERA, FIELD, GUARD, PALETTE, ROOM } from './config.js';
import { castVisionCone } from './vision.js';
import { GUARD_CHASE, GUARD_SUSPICIOUS } from './guards.js';
import { coinPosition } from './tools.js';
import { laserLive } from './world.js';
import {
  drawAlarmMeter, drawBriefing, drawCaught, drawPaused, drawScoreTally,
  drawTitle, drawToolBelt, drawTopBar, formatMoney, hudText,
} from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_BRIEFING = 'briefing';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_RUN_CLEAR = 'run-clear';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view.x = (canvas.width - FIELD.width * view.scale) / 2;
    view.y = (canvas.height - FIELD.height * view.scale) / 2;
  }

  function toField(clientX, clientY) {
    const ratio = window.devicePixelRatio || 1;
    return {
      x: (clientX * ratio - view.x) / view.scale,
      y: (clientY * ratio - view.y) / view.scale,
    };
  }

  function drawFloor(state) {
    const vault = state.vault;
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(ROOM.x, ROOM.y, ROOM.width, ROOM.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(ROOM.x, ROOM.y, ROOM.width, ROOM.height);
    ctx.clip();
    if (vault.floorStyle === 'checker') {
      const cell = 48;
      for (let gy = 0; gy * cell < ROOM.height; gy += 1) {
        for (let gx = 0; gx * cell < ROOM.width; gx += 1) {
          if ((gx + gy) % 2 === 0) continue;
          ctx.fillStyle = PALETTE.floorAlt;
          ctx.fillRect(ROOM.x + gx * cell, ROOM.y + gy * cell, cell, cell);
        }
      }
    } else if (vault.floorStyle === 'stone') {
      ctx.strokeStyle = 'rgba(10, 14, 26, 0.55)';
      ctx.lineWidth = 3;
      for (let x = ROOM.x; x <= ROOM.x + ROOM.width; x += 74) {
        ctx.beginPath(); ctx.moveTo(x, ROOM.y); ctx.lineTo(x, ROOM.y + ROOM.height); ctx.stroke();
      }
      for (let y = ROOM.y; y <= ROOM.y + ROOM.height; y += 74) {
        ctx.beginPath(); ctx.moveTo(ROOM.x, y); ctx.lineTo(ROOM.x + ROOM.width, y); ctx.stroke();
      }
    } else {
      ctx.strokeStyle = 'rgba(10, 14, 26, 0.4)';
      ctx.lineWidth = 2;
      for (let y = ROOM.y + 26; y < ROOM.y + ROOM.height; y += 26) {
        ctx.beginPath(); ctx.moveTo(ROOM.x, y); ctx.lineTo(ROOM.x + ROOM.width, y); ctx.stroke();
      }
    }
    // Loud marble: pale and polished, it sings under fast feet.
    for (const zone of vault.noisy) {
      const cell = 40;
      for (let y = zone.y; y < zone.y + zone.height; y += cell) {
        for (let x = zone.x; x < zone.x + zone.width; x += cell) {
          const odd = (Math.floor((x - zone.x) / cell) + Math.floor((y - zone.y) / cell)) % 2 === 0;
          ctx.fillStyle = odd ? PALETTE.marble : PALETTE.marbleAlt;
          ctx.fillRect(x, y, Math.min(cell, zone.x + zone.width - x), Math.min(cell, zone.y + zone.height - y));
        }
      }
      hudText(ctx, 'LOUD MARBLE', zone.x + zone.width / 2, zone.y + 16, 13, '#33456e', 'center', true);
    }
    // Quiet carpet: deep plum, silent under any step.
    for (const zone of vault.carpet) {
      ctx.fillStyle = PALETTE.carpet;
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      ctx.fillStyle = PALETTE.carpetAlt;
      for (let x = zone.x + 14; x < zone.x + zone.width - 8; x += 30) {
        for (let y = zone.y + 14; y < zone.y + zone.height - 8; y += 30) {
          ctx.fillRect(x, y, 5, 5);
        }
      }
    }
    ctx.restore();
  }

  function drawExit(state) {
    const exit = state.vault.exit;
    const glowing = state.player.hasLoot;
    ctx.fillStyle = glowing ? 'rgba(57, 224, 122, 0.4)' : 'rgba(44, 92, 64, 0.5)';
    ctx.fillRect(exit.x, exit.y, exit.width, exit.height);
    ctx.strokeStyle = glowing ? PALETTE.exit : PALETTE.exitIdle;
    ctx.lineWidth = 3;
    ctx.strokeRect(exit.x, exit.y, exit.width, exit.height);
    hudText(ctx, 'EXIT', exit.x + exit.width / 2, exit.y + exit.height / 2 - 10, 22, glowing ? PALETTE.exit : PALETTE.muted, 'center', true);
    hudText(ctx, glowing ? 'GO!' : 'GETAWAY', exit.x + exit.width / 2, exit.y + exit.height / 2 + 16, 13, glowing ? PALETTE.exit : PALETTE.muted, 'center', true);
  }

  function drawLoot(state) {
    const vault = state.vault;
    const loot = vault.loot;
    if (!state.player.hasLoot) {
      // The prize on its pedestal: a brass safe with a clock face.
      ctx.fillStyle = PALETTE.lootDark;
      ctx.fillRect(loot.x - 26, loot.y - 20, 52, 40);
      ctx.fillStyle = PALETTE.loot;
      ctx.fillRect(loot.x - 22, loot.y - 16, 44, 32);
      ctx.fillStyle = '#fff6cf';
      ctx.beginPath();
      ctx.arc(loot.x, loot.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.lootDark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(loot.x, loot.y);
      ctx.lineTo(loot.x, loot.y - 8);
      ctx.moveTo(loot.x, loot.y);
      ctx.lineTo(loot.x + 6, loot.y + 3);
      ctx.stroke();
      const sparkle = 0.5 + 0.5 * Math.sin(state.elapsed * 3.2);
      ctx.fillStyle = `rgba(255, 246, 207, ${0.35 + sparkle * 0.5})`;
      ctx.beginPath();
      ctx.arc(loot.x - 30, loot.y - 26, 3, 0, Math.PI * 2);
      ctx.arc(loot.x + 32, loot.y - 12, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    hudText(ctx, `LOOT ${formatMoney(vault.lootValue)}`, loot.x, loot.y - 44, 19, PALETTE.loot, 'center', true);
    hudText(ctx, vault.lootName.toUpperCase(), loot.x, loot.y + 38, 13, PALETTE.text, 'center', true);
    // Side loot: small bright pickings for the greedy and the brave.
    for (const item of state.sideLoot) {
      if (item.taken) continue;
      ctx.fillStyle = PALETTE.loot;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.lootDark;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawLasers(state) {
    for (const laser of state.vault.lasers) {
      const on = laserLive(laser, state.elapsed);
      ctx.fillStyle = '#2a2f42';
      ctx.fillRect(laser.x1 - 7, laser.y1 - 7, 14, 14);
      ctx.fillRect(laser.x2 - 7, laser.y2 - 7, 14, 14);
      ctx.fillStyle = PALETTE.laser;
      ctx.beginPath();
      ctx.arc(laser.x1, laser.y1, 3.5, 0, Math.PI * 2);
      ctx.arc(laser.x2, laser.y2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (on) {
        ctx.strokeStyle = 'rgba(255, 59, 78, 0.35)';
        ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(laser.x1, laser.y1); ctx.lineTo(laser.x2, laser.y2); ctx.stroke();
        ctx.strokeStyle = PALETTE.laser;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(laser.x1, laser.y1); ctx.lineTo(laser.x2, laser.y2); ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(255, 59, 78, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 7]);
        ctx.beginPath(); ctx.moveTo(laser.x1, laser.y1); ctx.lineTo(laser.x2, laser.y2); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  function drawCones(state) {
    for (const camera of state.cameras) {
      if (camera.disabledFor > 0) continue;
      const cone = castVisionCone(
        camera.x, camera.y, camera.facing, CAMERA.coneRange, CAMERA.coneHalfAngle, state.solids,
      );
      ctx.fillStyle = PALETTE.coneCamera;
      ctx.beginPath();
      ctx.moveTo(cone[0].x, cone[0].y);
      for (let index = 1; index < cone.length; index += 1) ctx.lineTo(cone[index].x, cone[index].y);
      ctx.closePath();
      ctx.fill();
    }
    for (const guard of state.guards) {
      const cone = castVisionCone(
        guard.x, guard.y, guard.facing, GUARD.coneRange, GUARD.coneHalfAngle, state.solids,
      );
      ctx.fillStyle = guard.state === GUARD_CHASE
        ? PALETTE.coneChase
        : guard.state === GUARD_SUSPICIOUS ? PALETTE.coneSuspicious : PALETTE.conePatrol;
      ctx.beginPath();
      ctx.moveTo(cone[0].x, cone[0].y);
      for (let index = 1; index < cone.length; index += 1) ctx.lineTo(cone[index].x, cone[index].y);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawCover(state) {
    const vault = state.vault;
    for (const rect of vault.cover) {
      ctx.fillStyle = PALETTE.coverEdge;
      ctx.fillRect(rect.x, rect.y + 5, rect.width, rect.height);
      ctx.fillStyle = PALETTE.cover;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      ctx.fillStyle = PALETTE.coverTop;
      ctx.fillRect(rect.x + 3, rect.y + 3, rect.width - 6, Math.max(4, rect.height - 12));
    }
    ctx.fillStyle = PALETTE.wall;
    for (const rect of vault.walls) ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    // The room's own walls, trimmed in brass.
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(ROOM.x, ROOM.y, ROOM.width, 16);
    ctx.fillRect(ROOM.x, ROOM.y + ROOM.height - 16, ROOM.width, 16);
    ctx.fillRect(ROOM.x, ROOM.y, 16, ROOM.height);
    ctx.fillRect(ROOM.x + ROOM.width - 16, ROOM.y, 16, ROOM.height);
    ctx.fillStyle = PALETTE.wallTrim;
    ctx.fillRect(ROOM.x, ROOM.y + 14, ROOM.width, 2);
    ctx.fillRect(ROOM.x, ROOM.y + ROOM.height - 16, ROOM.width, 2);
    ctx.fillRect(ROOM.x + 14, ROOM.y, 2, ROOM.height);
    ctx.fillRect(ROOM.x + ROOM.width - 16, ROOM.y, 2, ROOM.height);
  }

  function drawCameras(state) {
    for (const camera of state.cameras) {
      const off = camera.disabledFor > 0;
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.rotate(camera.facing);
      ctx.fillStyle = off ? '#5a6274' : PALETTE.cameraBody;
      ctx.fillRect(-4, -8, 20, 16);
      ctx.fillStyle = off ? '#39404f' : '#1d2739';
      ctx.beginPath();
      ctx.arc(16, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      hudText(ctx, off ? 'CAM OFF' : 'CAMERA', camera.x, camera.y - 20, 12, off ? PALETTE.muted : '#7fe7ff', 'center', true);
      if (camera.seesPlayer) {
        hudText(ctx, '!', camera.x + 16, camera.y - 14, 20, PALETTE.alarmHigh, 'center', true);
      }
    }
  }

  function drawGuards(state) {
    for (const guard of state.guards) {
      const bob = Math.sin(guard.stepPhase) * 1.6;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(guard.x, guard.y + 13, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = guard.state === GUARD_CHASE ? '#7a2f35' : PALETTE.guard;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y + bob * 0.3, guard.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.guardDark;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y + bob * 0.3, guard.radius - 5, 0, Math.PI * 2);
      ctx.fill();
      // Cap brim points where the eyes point.
      ctx.fillStyle = PALETTE.guardSkin;
      const noseX = guard.x + Math.cos(guard.facing) * (guard.radius - 3);
      const noseY = guard.y + Math.sin(guard.facing) * (guard.radius - 3);
      ctx.beginPath();
      ctx.arc(noseX, noseY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      if (guard.state === GUARD_SUSPICIOUS) {
        hudText(ctx, '?', guard.x, guard.y - 30, 24, '#ffb03a', 'center', true);
      } else if (guard.state === GUARD_CHASE) {
        hudText(ctx, '!', guard.x, guard.y - 30, 26, PALETTE.alarmHigh, 'center', true);
      } else if (guard.suspicion > 0.08) {
        ctx.strokeStyle = '#ffb03a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(guard.x, guard.y - 26, 7, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
        ctx.stroke();
      }
      hudText(ctx, 'GUARD', guard.x, guard.y + 26, 11, '#cfe0ff', 'center', true);
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    const bob = player.moving ? Math.sin(player.stepPhase) * 1.8 : 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 12, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    const bodyRadius = player.sneaking ? player.radius - 3 : player.radius;
    ctx.fillStyle = PALETTE.playerDark;
    ctx.beginPath();
    ctx.arc(player.x, player.y + bob * 0.3, bodyRadius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(player.x, player.y + bob * 0.3, bodyRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0e3d33';
    const eyeX = player.x + Math.cos(player.facing) * (bodyRadius - 4);
    const eyeY = player.y + Math.sin(player.facing) * (bodyRadius - 4);
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 3.6, 0, Math.PI * 2);
    ctx.fill();
    if (player.hasLoot) {
      ctx.fillStyle = PALETTE.loot;
      ctx.beginPath();
      ctx.arc(player.x - Math.cos(player.facing) * 10, player.y - Math.sin(player.facing) * 10, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    hudText(ctx, 'WREN', player.x, player.y - 28, 12, PALETTE.player, 'center', true);
    // The steal ring: patience, drawn.
    if (player.stealProgress > 0) {
      ctx.strokeStyle = PALETTE.loot;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 24, -Math.PI / 2, -Math.PI / 2 + player.stealProgress * Math.PI * 2);
      ctx.stroke();
      hudText(ctx, 'STEALING...', player.x, player.y - 44, 14, PALETTE.loot, 'center', true);
    }
  }

  function drawToolsFx(state) {
    const belt = state.belt;
    if (belt.smoke.active) {
      const fade = Math.min(1, belt.smoke.left / 0.8);
      ctx.fillStyle = `rgba(200, 208, 226, ${0.45 * fade})`;
      for (let index = 0; index < 7; index += 1) {
        const angle = index * 0.9 + state.elapsed * 0.7;
        const dist = belt.smoke.radius * 0.45;
        ctx.beginPath();
        ctx.arc(
          belt.smoke.x + Math.cos(angle) * dist,
          belt.smoke.y + Math.sin(angle) * dist,
          belt.smoke.radius * 0.55, 0, Math.PI * 2,
        );
        ctx.fill();
      }
      hudText(ctx, 'SMOKE', belt.smoke.x, belt.smoke.y - belt.smoke.radius - 10, 13, '#dfe6f2', 'center', true);
    }
    const coin = coinPosition(belt);
    if (coin) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(coin.x, coin.y, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.loot;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y - coin.height, 6, 0, Math.PI * 2);
      ctx.fill();
      hudText(ctx, 'COIN', coin.x, coin.y - coin.height - 14, 12, PALETTE.loot, 'center', true);
    }
    if (belt.lastNoise) {
      ctx.strokeStyle = `rgba(255, 217, 77, ${belt.lastNoise.left})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(belt.lastNoise.x, belt.lastNoise.y, 10 + (0.8 - belt.lastNoise.left) * 26, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawVignette(state) {
    if (state.alarm.value <= 70) return;
    const strength = (state.alarm.value - 70) / 30;
    const gradient = ctx.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.32,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.75,
    );
    gradient.addColorStop(0, 'rgba(255, 40, 30, 0)');
    gradient.addColorStop(1, `rgba(255, 40, 30, ${0.42 * strength})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  /** Paint one frame: the room, then the HUD or a panel for the screen. */
  function draw(state, screen, best, muted) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let shakeX = 0;
    let shakeY = 0;
    if (state.shake > 0) {
      shakeX = (Math.sin(state.elapsed * 61) * 5 * state.shake);
      shakeY = (Math.cos(state.elapsed * 53) * 5 * state.shake);
    }
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);

    drawFloor(state);
    drawExit(state);
    drawLasers(state);
    drawCones(state);
    drawCover(state);
    drawLoot(state);
    drawCameras(state);
    drawGuards(state);
    drawPlayer(state);
    drawToolsFx(state);
    drawVignette(state);

    drawTopBar(ctx, state);
    drawAlarmMeter(ctx, state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawToolBelt(ctx, state);
    if (muted) hudText(ctx, 'MUTED [M]', FIELD.width - 24, 74, 14, PALETTE.muted, 'right', true);

    if (screen === SCREEN_TITLE) drawTitle(ctx, best);
    else if (screen === SCREEN_BRIEFING) drawBriefing(ctx, state);
    else if (screen === SCREEN_PAUSED) drawPaused(ctx);
    else if (screen === SCREEN_CAUGHT) drawCaught(ctx, state);
    else if (screen === SCREEN_CLEAR) drawScoreTally(ctx, state, false);
    else if (screen === SCREEN_RUN_CLEAR) drawScoreTally(ctx, state, true);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField };
}
