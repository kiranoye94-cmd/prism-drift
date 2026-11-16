// Keyboard and pointer input, sampled into one small state the loop reads.
export function createInput(canvas) {
  const keys = new Set();
  const pointer = { x: 0, y: 0, down: false, clicked: false };
  const pressed = new Set();

  const down = (event) => {
    const key = event.key.toLowerCase();
    if (!keys.has(key)) pressed.add(key);
    keys.add(key);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
  };
  const up = (event) => keys.delete(event.key.toLowerCase());

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    pointer.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', () => { pointer.down = true; pointer.clicked = true; });
  window.addEventListener('mouseup', () => { pointer.down = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    keys,
    pointer,
    /** True once per physical key press, then cleared. */
    justPressed(...names) {
      for (const name of names) if (pressed.has(name)) { pressed.delete(name); return true; }
      return false;
    },
    /** True once per click, then cleared. */
    takeClick() {
      if (!pointer.clicked) return false;
      pointer.clicked = false;
      return true;
    },
    axis() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      const length = Math.hypot(x, y) || 1;
      return { x: x / length, y: y / length };
    },
    endFrame() { pressed.clear(); },
  };
}
