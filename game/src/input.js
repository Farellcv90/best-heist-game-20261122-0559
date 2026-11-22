// Keyboard and mouse, gathered into one snapshot per frame. Held keys steer
// Wren; one-shot presses (confirm, pause, mute, smoke, EMP, retry) queue as
// flags so a tap between frames is never lost. Mouse clicks throw coins at
// the cursor and confirm menus.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_SMOKE = 8;
export const ACTION_EMP = 16;
export const ACTION_RETRY = 32;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);

export function createInput(canvas, toField) {
  const held = { up: false, down: false, left: false, right: false, sneak: false, steal: false };
  let actions = 0;
  let pendingCoin = null;
  let mouse = { x: 640, y: 360 };

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) held.up = true;
    else if (DOWN.has(event.code)) held.down = true;
    else if (LEFT.has(event.code)) held.left = true;
    else if (RIGHT.has(event.code)) held.right = true;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') held.sneak = true;
    else if (event.code === 'KeyE') held.steal = true;
    else if (event.code === 'Space' || event.code === 'Enter') {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyM') {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (event.code === 'KeyQ') {
      if (!event.repeat) actions |= ACTION_SMOKE;
    } else if (event.code === 'KeyF') {
      if (!event.repeat) actions |= ACTION_EMP;
    } else if (event.code === 'KeyR') {
      if (!event.repeat) actions |= ACTION_RETRY;
    } else return;
    event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) held.up = false;
    else if (DOWN.has(event.code)) held.down = false;
    else if (LEFT.has(event.code)) held.left = false;
    else if (RIGHT.has(event.code)) held.right = false;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') held.sneak = false;
    else if (event.code === 'KeyE') held.steal = false;
  });

  window.addEventListener('blur', () => {
    held.up = false;
    held.down = false;
    held.left = false;
    held.right = false;
    held.sneak = false;
    held.steal = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    mouse = toField(event.clientX, event.clientY);
  });

  canvas.addEventListener('pointerdown', (event) => {
    mouse = toField(event.clientX, event.clientY);
    actions |= ACTION_CONFIRM;
    pendingCoin = { x: mouse.x, y: mouse.y };
  });

  return {
    /** The movement snapshot the world eats each fixed step. */
    snapshot() {
      const coin = pendingCoin;
      pendingCoin = null;
      return {
        moveX: (held.right ? 1 : 0) - (held.left ? 1 : 0),
        moveY: (held.down ? 1 : 0) - (held.up ? 1 : 0),
        sneak: held.sneak,
        steal: held.steal,
        coin,
        smoke: false,
        emp: false,
      };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    mousePosition() {
      return mouse;
    },
    clearCoin() {
      pendingCoin = null;
    },
  };
}
