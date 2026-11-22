// The heads-up display: the big ALARM meter, the tool belt with its costs,
// and every panel the night needs — title, briefing, caught, and the score
// tally that pays off the planning.

import { FIELD, FONT, PALETTE, TOOLS } from './config.js';
import { alarmBand } from './alarm.js';

const fonts = new Map();

export function hudText(ctx, value, x, y, size, color, align, bold) {
  const key = `${bold ? 'b' : ''}${size}`;
  if (!fonts.has(key)) fonts.set(key, `${bold ? 'bold ' : ''}${size}px ${FONT}`);
  ctx.font = fonts.get(key);
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

export function formatMoney(value) {
  return '$' + Math.round(value).toLocaleString('en-US');
}

/** The alarm meter across the top: bell, bar, number, colour band. */
export function drawAlarmMeter(ctx, state) {
  const alarm = state.alarm;
  const band = alarmBand(alarm);
  const color = band === 2 ? PALETTE.alarmHigh : band === 1 ? PALETTE.alarmMid : PALETTE.alarmLow;
  const barX = 400;
  const barY = 18;
  const barW = 480;
  const barH = 30;
  hudText(ctx, 'ALARM', barX - 14, barY + barH / 2, 24, PALETTE.text, 'right', true);
  // Bell glyph, drawn not typed, so it reads at any size.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(barX - 118, barY + 12, 7, Math.PI, 0);
  ctx.fillRect(barX - 125, barY + 12, 14, 9);
  ctx.fillRect(barX - 127, barY + 21, 18, 3);
  ctx.beginPath();
  ctx.arc(barX - 118, barY + 27, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#10182e';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = color;
  ctx.fillRect(barX + 3, barY + 3, (barW - 6) * (alarm.value / 100), barH - 6);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barW, barH);
  hudText(ctx, `${Math.round(alarm.value)}`, barX + barW + 16, barY + barH / 2, 26, color, 'left', true);
  if (alarm.level > 0) {
    hudText(ctx, `LEVEL ${alarm.level + 1}`, barX + barW + 78, barY + barH / 2, 16, PALETTE.muted, 'left', true);
  }
}

/** Top-left vault name and loot status; top-right favors and score. */
export function drawTopBar(ctx, state) {
  hudText(ctx, state.vault.shortName, 24, 22, 20, PALETTE.text, 'left', true);
  const lootLine = state.player.hasLoot
    ? 'LOOT IN HAND — TO THE EXIT'
    : `TARGET: ${state.vault.lootName} ${formatMoney(state.vault.lootValue)}`;
  hudText(ctx, lootLine, 24, 48, 15, state.player.hasLoot ? PALETTE.exit : PALETTE.loot, 'left', true);
  hudText(ctx, `FAVORS ${state.belt.favors}`, FIELD.width - 24, 22, 20, PALETTE.text, 'right', true);
  const shownScore = state.finished ? state.totalScore : state.totalScore + state.sideScore;
  hudText(
    ctx, `SCORE ${formatMoney(shownScore)}`,
    FIELD.width - 24, 48, 15, PALETTE.muted, 'right', true,
  );
}

/** The tool belt along the bottom: stock, key, and favor cost for each. */
export function drawToolBelt(ctx, state) {
  const belt = state.belt;
  const tools = [
    { label: 'COIN', key: 'CLICK', count: belt.coins, cost: TOOLS.coin.cost },
    { label: 'SMOKE', key: 'Q', count: belt.smokes, cost: TOOLS.smoke.cost },
    { label: 'EMP', key: 'F', count: belt.emps, cost: TOOLS.emp.cost },
  ];
  const boxW = 196;
  const boxH = 40;
  const startX = FIELD.width / 2 - (tools.length * boxW + (tools.length - 1) * 12) / 2;
  const y = FIELD.height - boxH - 6;
  for (let index = 0; index < tools.length; index += 1) {
    const tool = tools[index];
    const x = startX + index * (boxW + 12);
    const usable = tool.count > 0 && belt.favors >= tool.cost;
    ctx.fillStyle = usable ? 'rgba(20, 28, 52, 0.92)' : 'rgba(20, 22, 34, 0.85)';
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeStyle = usable ? PALETTE.panelEdge : '#3a4157';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, boxW, boxH);
    hudText(ctx, `${tool.label} [${tool.key}]`, x + 12, y + boxH / 2, 17, usable ? PALETTE.text : PALETTE.muted, 'left', true);
    hudText(ctx, `x${tool.count} · ${tool.cost}F`, x + boxW - 12, y + boxH / 2, 16, usable ? PALETTE.loot : PALETTE.muted, 'right', true);
  }
  hudText(ctx, 'WASD move · SHIFT sneak · hold E steal', 24, FIELD.height - 26, 14, PALETTE.muted, 'left', false);
  if (state.player.sneaking) {
    hudText(ctx, 'SNEAKING', FIELD.width - 24, FIELD.height - 26, 15, PALETTE.player, 'right', true);
  }
}

function drawPanel(ctx, width, height) {
  const x = (FIELD.width - width) / 2;
  const y = (FIELD.height - height) / 2;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);
  return { x, y, width, height };
}

export function drawTitle(ctx, best) {
  const panel = drawPanel(ctx, 760, 430);
  hudText(ctx, 'THE GILDED HOUR', FIELD.width / 2, panel.y + 74, 54, PALETTE.loot, 'center', true);
  hudText(ctx, 'One thief. Three vaults. One night at the Meridian Trust.', FIELD.width / 2, panel.y + 122, 20, PALETTE.text, 'center', false);
  const lines = [
    'Slip past guards and cameras, lift the loot, reach the exit.',
    'WASD / arrows move · SHIFT sneak · hold E to steal',
    'Click throws a coin · Q smoke · F EMP · P pause · M mute',
    'Cover breaks sight lines. Marble is loud. Carpet is silent.',
  ];
  for (let index = 0; index < lines.length; index += 1) {
    hudText(ctx, lines[index], FIELD.width / 2, panel.y + 176 + index * 32, 19, PALETTE.muted, 'center', false);
  }
  if (best > 0) {
    hudText(ctx, `BEST RUN ${formatMoney(best)}`, FIELD.width / 2, panel.y + 318, 20, PALETTE.text, 'center', true);
  }
  hudText(ctx, 'Press ENTER or click to begin', FIELD.width / 2, panel.y + 372, 23, PALETTE.exit, 'center', true);
}

export function drawBriefing(ctx, state) {
  const vault = state.vault;
  const panel = drawPanel(ctx, 820, 470);
  hudText(ctx, vault.name.toUpperCase(), FIELD.width / 2, panel.y + 58, 34, PALETTE.text, 'center', true);
  hudText(
    ctx, `TARGET: ${vault.lootName} — ${formatMoney(vault.lootValue)}`,
    FIELD.width / 2, panel.y + 104, 24, PALETTE.loot, 'center', true,
  );
  const guards = vault.guards.length;
  const cameras = vault.cameras.length;
  const lasers = vault.lasers.length;
  hudText(
    ctx, `${guards} GUARDS · ${cameras} CAMERA${cameras === 1 ? '' : 'S'}${lasers ? ` · ${lasers} LASER${lasers === 1 ? '' : 'S'}` : ''}`,
    FIELD.width / 2, panel.y + 140, 19, PALETTE.alarmMid, 'center', true,
  );
  hudText(ctx, vault.briefing, FIELD.width / 2, panel.y + 182, 18, PALETTE.muted, 'center', false);
  const lines = [
    'Yellow cones are guard eyes. Cyan cones are cameras. Stay out, or stay behind cover.',
    'Stand at the loot and hold E for 2.5s. Taking it raises the alarm level.',
    'Tools cost favors: coin 1 (click), smoke 2 (Q), EMP 3 (F). Side loot earns favors.',
    'Alarm at 100, or a guard\'s hand on you, ends the vault. The green EXIT pays out.',
  ];
  for (let index = 0; index < lines.length; index += 1) {
    hudText(ctx, lines[index], FIELD.width / 2, panel.y + 232 + index * 30, 17, PALETTE.text, 'center', false);
  }
  hudText(ctx, 'Press ENTER or click — begin the heist', FIELD.width / 2, panel.y + 412, 23, PALETTE.exit, 'center', true);
}

export function drawCaught(ctx, state) {
  const panel = drawPanel(ctx, 700, 330);
  hudText(ctx, 'CAUGHT', FIELD.width / 2, panel.y + 76, 52, PALETTE.alarmHigh, 'center', true);
  hudText(ctx, state.caughtReason, FIELD.width / 2, panel.y + 128, 20, PALETTE.text, 'center', false);
  hudText(
    ctx, `${state.vault.name} keeps its ${state.vault.lootName}... for now.`,
    FIELD.width / 2, panel.y + 164, 18, PALETTE.muted, 'center', false,
  );
  hudText(ctx, 'Press R or ENTER to retry the vault', FIELD.width / 2, panel.y + 252, 23, PALETTE.exit, 'center', true);
}

export function drawPaused(ctx) {
  const panel = drawPanel(ctx, 520, 220);
  hudText(ctx, 'PAUSED', FIELD.width / 2, panel.y + 80, 40, PALETTE.text, 'center', true);
  hudText(ctx, 'The Trust holds its breath.', FIELD.width / 2, panel.y + 124, 18, PALETTE.muted, 'center', false);
  hudText(ctx, 'Press P to resume', FIELD.width / 2, panel.y + 172, 21, PALETTE.exit, 'center', true);
}

/** The tally that pays off the planning, per vault or for the whole run. */
export function drawScoreTally(ctx, state, runClear) {
  const tally = state.tally;
  if (!tally) return;
  const panel = drawPanel(ctx, 760, 500);
  const title = runClear ? 'RUN CLEAR — THE NIGHT IS YOURS' : 'VAULT CLEAR — CLEAN GETAWAY';
  hudText(ctx, title, FIELD.width / 2, panel.y + 54, 32, PALETTE.exit, 'center', true);
  hudText(ctx, tally.vaultName, FIELD.width / 2, panel.y + 92, 20, PALETTE.muted, 'center', false);
  const rows = [
    [`${tally.lootName}`, formatMoney(tally.lootValue)],
    ['Side loot', formatMoney(tally.sideScore)],
    ['Time bonus', formatMoney(tally.timeBonus)],
    ['Ghost bonus (never truly seen)', formatMoney(tally.ghostBonus)],
    [`Alarm peak ${tally.alarmPeak} penalty`, `-${formatMoney(tally.alarmPenalty)}`],
  ];
  for (let index = 0; index < rows.length; index += 1) {
    const y = panel.y + 140 + index * 34;
    hudText(ctx, rows[index][0], panel.x + 70, y, 19, PALETTE.text, 'left', false);
    hudText(ctx, rows[index][1], panel.x + panel.width - 70, y, 19, PALETTE.loot, 'right', true);
  }
  hudText(ctx, 'VAULT SCORE', panel.x + 70, panel.y + 332, 22, PALETTE.text, 'left', true);
  hudText(ctx, formatMoney(tally.score), panel.x + panel.width - 70, panel.y + 332, 26, PALETTE.loot, 'right', true);
  hudText(ctx, `RUN TOTAL ${formatMoney(tally.totalScore)}`, FIELD.width / 2, panel.y + 372, 19, PALETTE.muted, 'center', false);
  const grade = runClear ? tally.runGrade : tally.grade;
  hudText(ctx, `GRADE ${grade}`, FIELD.width / 2, panel.y + 414, 34, grade === 'S' ? PALETTE.loot : PALETTE.text, 'center', true);
  const prompt = runClear ? 'Press ENTER to run it again' : 'Press ENTER — next vault';
  hudText(ctx, prompt, FIELD.width / 2, panel.y + 458, 21, PALETTE.exit, 'center', true);
}
