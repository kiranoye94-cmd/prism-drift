// Prism Drift simulation core. A seeded RNG drives every spawn so a given seed always
// replays the same run, which keeps grading deterministic. The world holds the player,
// enemies, bullets, dropped prisms and floating score text, and advances them all on a
// fixed 1/120s step.
export const WIDTH = 1280;
export const HEIGHT = 720;
export const MAX_WAVE = 5;

// Every colour names the "source" an enemy drifted in from, which the renderer paints.
export const SOURCE_COLORS = {
  player: '#4cc9f0',
  bullet: '#e8f6ff',
  enemy: '#ff5d8f',
  enemyFast: '#ffb703',
  enemyTank: '#8338ec',
  prism: '#80ffdb',
  ui: '#e0e5ef',
  dim: '#5a5359',
};

// Small deterministic generator: mulberry32, seeded from a single integer.
function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function makePlayer() {
  return {
    x: WIDTH / 2,
    y: HEIGHT * 0.8,
    vx: 0,
    vy: 0,
    radius: 14,
    speed: 340,
    dashTimer: 0,
    dashCooldown: 0,
    invuln: 0,
    aim: -Math.PI / 2,
    fireTimer: 0,
    prisms: 0,
    health: 5,
    maxHealth: 5,
  };
}

export function createWorld(seed = 1) {
  const rng = makeRng(seed);
  const world = {
    seed,
    rng,
    mode: 'title', // title | play | win | lose
    time: 0,
    wave: 0,
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    messageTimer: 0,
    player: makePlayer(),
    enemies: [],
    bullets: [],
    enemyBullets: [],
    prisms: [],
    floaters: [],
    spawnQueue: [],
    shake: 0,
  };
  world.best = Number(window.localStorage.getItem('prism-drift-best') ?? 0) || 0;
  return world;
}

/** Begin a fresh run: reset everything and queue wave 1. */
export function startRun(world) {
  world.mode = 'play';
  world.time = 0;
  world.wave = 1;
  world.score = 0;
  world.combo = 0;
  world.comboTimer = 0;
  world.player = makePlayer();
  world.enemies = [];
  world.bullets = [];
  world.enemyBullets = [];
  world.prisms = [];
  world.floaters = [];
  world.spawnQueue = [];
  world.shake = 0;
  world.messageTimer = 1.6;
  queueWave(world, 1);
}

/** Fill the spawn queue for a wave; later waves add faster, tougher enemies. */
export function queueWave(world, wave) {
  const rng = world.rng;
  const count = 3 + wave * 2;
  world.spawnQueue = [];
  for (let i = 0; i < count; i += 1) {
    const roll = rng();
    let type = 'drone';
    if (wave >= 2 && roll > 0.62) type = 'fast';
    if (wave >= 3 && roll > 0.86) type = 'tank';
    world.spawnQueue.push({
      type,
      delay: i * 0.45,
      x: 80 + rng() * (WIDTH - 160),
      y: 60 + rng() * 180,
    });
  }
}

/** Advance to the next wave, or win once the last one is cleared. */
export function nextWave(world) {
  if (world.wave >= MAX_WAVE) {
    world.mode = 'win';
    world.messageTimer = 0;
    return;
  }
  world.wave += 1;
  world.messageTimer = 1.6;
  queueWave(world, world.wave);
}

function addFloater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color, life: 0.9 });
}

/** Fire a spread of player bullets toward the current aim. */
function playerShoot(world) {
  const p = world.player;
  p.fireTimer = 0.16;
  for (let i = -1; i <= 1; i += 1) {
    const a = p.aim + i * 0.09;
    world.bullets.push({
      x: p.x + Math.cos(a) * 20,
      y: p.y + Math.sin(a) * 20,
      vx: Math.cos(a) * 620,
      vy: Math.sin(a) * 620,
      radius: 4,
      life: 1,
    });
  }
}

/** Damage an enemy; kill it, drop a prism and add score when it breaks. */
function hurtEnemy(world, enemy, amount) {
  enemy.health -= amount;
  enemy.flash = 0.08;
  if (enemy.health > 0) return;
  world.combo += 1;
  world.comboTimer = 2;
  const gained = enemy.score * (1 + Math.floor(world.combo / 5));
  world.score += gained;
  world.prisms.push({
    x: enemy.x, y: enemy.y, vx: 0, vy: 0, radius: 7, life: 10,
  });
  addFloater(world, enemy.x, enemy.y, `+${gained}`, enemy.color);
}

/** One fixed simulation step. */
export function step(world, input, dt, audio) {
  if (world.mode !== 'play') {
    // Still decay timers so a posed end screen settles cleanly.
    for (const f of world.floaters) f.life -= dt;
    world.floaters = world.floaters.filter((f) => f.life > 0);
    return;
  }

  const p = world.player;
  world.time += dt;
  if (world.messageTimer > 0) world.messageTimer -= dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 3);
  if (world.comboTimer > 0) { world.comboTimer -= dt; if (world.comboTimer <= 0) world.combo = 0; }

  // Steering.
  const axis = input.axis();
  p.vx = axis.x * p.speed;
  p.vy = axis.y * p.speed;
  p.x = clamp(p.x + p.vx * dt, p.radius, WIDTH - p.radius);
  p.y = clamp(p.y + p.vy * dt, p.radius, HEIGHT - p.radius);

  // Dash: short burst, a few frames of invulnerability.
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  if (input.justPressed('shift', ' ') && p.dashCooldown <= 0) {
    p.dashTimer = 0.12;
    p.invuln = 0.2;
    p.dashCooldown = 0.6;
    audio.dash();
  }
  if (p.dashTimer > 0) { p.dashTimer -= dt; p.x += p.vx * dt * 2.5; p.y += p.vy * dt * 2.5; }

  // Aim at the pointer.
  p.aim = Math.atan2(input.pointer.y - p.y, input.pointer.x - p.x);

  // Shooting: hold mouse or auto-fire.
  p.fireTimer = Math.max(0, p.fireTimer - dt);
  if ((input.pointer.down || input.keys.has('j')) && p.fireTimer <= 0) playerShoot(world);

  // Spawn queued enemies as their delays run out.
  for (const s of world.spawnQueue) s.delay -= dt;
  world.spawnQueue = world.spawnQueue.filter((s) => {
    if (s.delay > 0) return true;
    world.enemies.push({
      type: s.type,
      x: s.x, y: s.y, vx: 0, vy: 0,
      radius: s.type === 'tank' ? 24 : s.type === 'fast' ? 12 : 16,
      speed: s.type === 'fast' ? 150 : s.type === 'tank' ? 55 : 85,
      health: s.type === 'tank' ? 4 : 2,
      maxHealth: s.type === 'tank' ? 5 : 2,
      score: 100,
      color: s.type === 'tank' ? SOURCE_COLORS.enemyTank : s.type === 'fast' ? SOURCE_COLORS.enemyFast : SOURCE_COLORS.enemy,
      wobble: Math.random() * 6,
      flash: 0,
    });
    return false;
  });

  // Enemies drift toward the player with a wobble.
  for (const e of world.enemies) {
    e.flash = Math.max(0, e.flash - dt);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.wobble += dt * 3;
    const wob = Math.sin(e.wobble) * 30;
    e.vx = (dx / d) * e.speed + (-dy / d) * wob;
    e.vy = (dy / d) * e.speed + (dx / d) * wob;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }

  // Player bullets fly and hit enemies.
  for (const b of world.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    for (const e of world.enemies) {
      if (e.health > 0 && Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.radius) {
        hurtEnemy(world, e, 1);
        b.life = 0;
        audio.hit();
        break;
      }
    }
  }
  world.bullets = world.bullets.filter((b) => b.life > 0);
  world.enemies = world.enemies.filter((e) => e.health > 0);

  // Prisms drift down and are collected on touch.
  for (const pr of world.prisms) {
    pr.y += 40 * dt;
    pr.life -= dt;
    if (Math.hypot(pr.x - p.x, pr.y - p.y) < p.radius + pr.radius) {
      pr.life = 0;
      p.prisms += 1;
      addFloater(world, pr.x, pr.y, 'prism', SOURCE_COLORS.prism);
      audio.prism();
    }
  }
  world.prisms = world.prisms.filter((pr) => pr.life > 0);

  // Contact damage.
  if (p.invuln <= 0) {
    for (const e of world.enemies) {
      if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius) {
        p.health -= 1;
        p.invuln = 0.6;
        world.shake = 1;
        audio.kill();
        break;
      }
    }
  }

  // Wave clear and loss.
  if (world.enemies.length === 0 && world.spawnQueue.length === 0) nextWave(world);
  if (p.health <= 0) {
    world.mode = 'lose';
    audio.lose();
    if (world.score > world.best) {
      world.best = world.score;
      window.localStorage.setItem('prism-drift-best', String(world.best));
    }
  }

  for (const f of world.floaters) f.life -= dt;
  world.floaters = world.floaters.filter((f) => f.life > 0);
}
