// Prism Drift's entry point: builds the world, runs the fixed-step loop and draws every frame.
// A ?shot= query poses the game for its screenshots: start, play or end.
import { createWorld, startRun, step, nextWave, WIDTH, HEIGHT, SOURCE_COLORS } from './world.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';

const canvas = document.getElementById('game');
canvas.width = WIDTH;
canvas.height = HEIGHT;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') ?? 1) || 1;

const world = createWorld(seed);
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();

/** Poses a rich mid-run frame so the play screenshot shows the real loop. */
function posePlay() {
  startRun(world);
  world.wave = 2;
  world.messageTimer = 0;
  world.score = 2840;
  world.combo = 6;
  world.comboTimer = 2;
  world.spawnQueue = [];
  const player = world.player;
  player.x = WIDTH * 0.42;
  player.y = HEIGHT * 0.58;
  player.prisms = 17;
  player.health = 4;
  player.aim = -0.5;
  world.enemies = [];
  world.bullets = [];
  world.prisms = [];
  const spots = [
    ['drone', 0.72, 0.22], ['drone', 0.84, 0.46], ['fast', 0.62, 0.30],
    ['fast', 0.30, 0.24], ['tank', 0.76, 0.70], ['drone', 0.22, 0.40],
  ];
  for (const [type, fx, fy] of spots) {
    world.enemies.push({
      type, x: WIDTH * fx, y: HEIGHT * fy, vx: 0, vy: 0,
      radius: type === 'tank' ? 24 : type === 'fast' ? 12 : 16,
      speed: 80, health: type === 'tank' ? 4 : 2, maxHealth: type === 'tank' ? 5 : 2,
      score: 100, color: type === 'tank' ? SOURCE_COLORS.enemyTank : type === 'fast' ? SOURCE_COLORS.enemyFast : SOURCE_COLORS.enemy,
      wobble: fx * 6, flash: 0,
    });
  }
  for (let i = 0; i < 4; i += 1) {
    const angle = -0.5 + (i - 1.5) * 0.02;
    world.bullets.push({ x: player.x + Math.cos(angle) * (60 + i * 90), y: player.y + Math.sin(angle) * (60 + i * 90), vx: 0, vy: 0, radius: 4, life: 1 });
  }
  world.prisms.push({ x: WIDTH * 0.55, y: HEIGHT * 0.78, vx: 0, vy: 0, life: 10, radius: 7 });
  world.prisms.push({ x: WIDTH * 0.88, y: HEIGHT * 0.34, vx: 0, vy: 0, life: 10, radius: 7 });
  world.floaters.push({ x: WIDTH * 0.66, y: HEIGHT * 0.20, text: '+260', life: 0.9, color: SOURCE_COLORS.enemyTank });
}

function poseEnd() {
  startRun(world);
  world.wave = 5;
  world.score = 12480;
  world.best = 12480;
  world.player.prisms = 41;
  world.player.health = 0;
  world.mode = 'win';
  world.enemies = [];
  world.spawnQueue = [];
  world.messageTimer = 0;
}

if (shot === 'play') posePlay();
else if (shot === 'end') poseEnd();
else if (shot === 'start') world.mode = 'title';

const status = document.getElementById('status');
function announce(text) { if (status) status.textContent = text; }

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  audio.resume();
  if (world.mode === 'title' && (key === ' ' || key === 'enter')) { startRun(world); announce('Wave 1 begins.'); }
  else if ((world.mode === 'win' || world.mode === 'lose') && (key === 'r' || key === 'enter' || key === ' ')) { startRun(world); announce('Run restarted.'); }
});
canvas.addEventListener('mousedown', () => {
  audio.resume();
  if (world.mode === 'title') { startRun(world); announce('Wave 1 begins.'); }
  else if (world.mode === 'win' || world.mode === 'lose') { startRun(world); announce('Run restarted.'); }
});

if (shot) {
  renderer.draw(world);
} else {
  let previous = performance.now();
  let accumulator = 0;
  const STEP = 1 / 120;

  const frame = (now) => {
    const elapsed = Math.min(0.25, (now - previous) / 1000);
    previous = now;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      step(world, input, STEP, audio);
      input.endFrame();
      accumulator -= STEP;
    }
    if (world.mode === 'play' && world.enemies.length > 0 && Math.floor(world.time * 4) % 4 === 0) {
      announce(`Wave ${world.wave} of 5. Health ${world.player.health}. Score ${world.score}.`);
    }
    renderer.draw(world);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

export { world, startRun, nextWave };
