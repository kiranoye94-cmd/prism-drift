// Keyboard + pointer input, folded into one small state object the fixed-step loop samples.
// justPressed() and takeClick() fire at most once per physical press/click, so a single tap
// never triggers two dashes or two shots across frames.
export function createInput(canvas) {
  const held = new Set();
  const tapped = new Set();
  const pointer = { x: 0, y: 0, down: false, clicked: false };

  const onKeyDown = (event) => {
    const key = event.key.toLowerCase();
    if (!held.has(key)) tapped.add(key);
    held.add(key);
    // Keep the page from scrolling while the player steers.
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
  };
  const onKeyUp = (event) => held.delete(event.key.toLowerCase());
  const onBlur = () => {
    held.clear();
    tapped.clear();
    pointer.down = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    pointer.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (event) => {
    event.preventDefault();
    pointer.down = true;
    pointer.clicked = true;
  });
  window.addEventListener('mouseup', () => { pointer.down = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    keys: held,
    pointer,
    /** Consume one press of any of the named keys; true if one was waiting. */
    justPressed(...names) {
      for (const name of names) {
        if (tapped.has(name)) {
          tapped.delete(name);
          return true;
        }
      }
      return false;
    },
    /** Consume one click; true if a click was waiting. */
    takeClick() {
      if (!pointer.clicked) return false;
      pointer.clicked = false;
      return true;
    },
    /** Normalised WASD / arrow movement vector. */
    axis() {
      let x = 0;
      let y = 0;
      if (held.has('a') || held.has('arrowleft')) x -= 1;
      if (held.has('d') || held.has('arrowright')) x += 1;
      if (held.has('w') || held.has('arrowup')) y -= 1;
      if (held.has('s') || held.has('arrowdown')) y += 1;
      const length = Math.hypot(x, y) || 1;
      return { x: x / length, y: y / length };
    },
    /** Clear the one-shot presses at the end of every frame. */
    endFrame() { tapped.clear(); },
  };
}
