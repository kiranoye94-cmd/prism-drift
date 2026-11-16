// Prism Drift's simulation: waves of drones, the player's shard, bullets, prisms and pickups.
// Everything is a plain object updated by step(); rendering lives in render.js.
export const WIDTH = 1280;
export const HEIGHT = 720;
export const WAVES = 5;

export const SOURCE_COLORS = {
  enemy: '#ff4d6d',
  enemyFast: '#ffb703',
  enemyTank: '#a06cd5',
  prism: '#4cc9f0',
  heal: '#80ed99',
};

const TAU = Math.PI * 2;
const rand = (min, max) => min + Math.random() * (max - min);

export function createWorld(seed = 1) {
  let randomState = seed >>> 0 || 1;
  const random = () => {
    randomState ^= randomState << 13; randomState >>>= 0;
    randomState ^= randomState >> 17;
    randomState ^= randomState << 5; randomState >>>= 0;
    return randomState / 4294967296;
  };
  const between = (min, max) => min + random() * (max - min);

  const world = {
    mode: 'title',
    time: 0,
    wave: 0,
    waveTimer: 0,
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    message: '',
    messageTimer: 0,
    shake: 0,
    player: null,
    bullets: [],
    enemies: [],
    prisms: [],
    particles: [],
    floaters: [],
    bursts: [],
    random,
    between,
    spawnQueue: [],
    waveCleared: false,
  };

  return world;
}

export function startRun(world) {
  world.mode = 'play';
  world.time = 0;
  world.wave = 0;
  world.waveTimer = 0;
  world.score = 0;
  world.combo = 0;
  world.comboTimer = 0;
  world.bullets = [];
  world.enemies = [];
  world.prisms = [];
  world.particles = [];
  world.floaters = [];
  world.bursts = [];
  world.spawnQueue = [];
  world.waveCleared = false;
  world.player = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    vx: 0,
    vy: 0,
    radius: 13,
    aim: -Math.PI / 2,
    health: 5,
    maxHealth: 5,
    fireCooldown: 0,
    dashCooldown: 0,
    dashTime: 0,
    invulnerable: 0,
    prisms: 0,
  };
  nextWave(world);
}

export function nextWave(world) {
  world.wave += 1;
  world.waveCleared = false;
  if (world.wave > WAVES) {
    world.mode = 'win';
    world.best = Math.max(world.best, world.score);
    return;
  }
  world.message = `WAVE ${world.wave} OF ${WAVES}`;
  world.messageTimer = 1.6;
  world.waveTimer = 0;
  const count = 3 + world.wave * 2;
  for (let i = 0; i < count; i += 1) {
    const roll = world.random();
    const type = roll < 0.2 + world.wave * 0.03 ? 'fast' : roll > 0.86 - world.wave * 0.03 ? 'tank' : 'drone';
    const edge = Math.floor(world.random() * 4);
    const margin = 60;
    const x = edge === 0 ? -margin : edge === 1 ? WIDTH + margin : world.between(margin, WIDTH - margin);
    const y = edge === 2 ? -margin : edge === 3 ? HEIGHT + margin : world.between(margin, HEIGHT - margin);
    world.spawnQueue.push({ type, x, y, delay: i * 0.34 });
  }
}

function spawnEnemy(world, { type, x, y }) {
  const stats = {
    drone: { radius: 16, speed: 62, health: 2, score: 100, color: SOURCE_COLORS.enemy },
    fast: { radius: 12, speed: 118, health: 1, score: 150, color: SOURCE_COLORS.enemyFast },
    tank: { radius: 24, speed: 38, health: 5, score: 260, color: SOURCE_COLORS.enemyTank },
  }[type];
  world.enemies.push({
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: stats.radius,
    speed: stats.speed * (1 + (world.wave - 1) * 0.07),
    health: stats.health,
    maxHealth: stats.health,
    score: stats.score,
    color: stats.color,
    wobble: Math.random() * TAU,
    flash: 0,
  });
}

export function fireBullet(world, player) {
  if (player.fireCooldown > 0) return false;
  player.fireCooldown = 0.16;
  const spread = player.prisms >= 12 ? 0.14 : 0;
  const angles = spread > 0 ? [-spread, 0, spread] : [0];
  for (const offset of angles) {
    const angle = player.aim + offset;
    world.bullets.push({
      x: player.x + Math.cos(angle) * 18,
      y: player.y + Math.sin(angle) * 18,
      vx: Math.cos(angle) * 780,
      vy: Math.sin(angle) * 780,
      radius: 4,
      life: 1.1,
    });
  }
  return true;
}

function burst(world, x, y, color, count = 10, speed = 200) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.random() * TAU;
    const power = world.between(speed * 0.3, speed);
    world.particles.push({
      x, y,
      vx: Math.cos(angle) * power,
      vy: Math.sin(angle) * power,
      life: world.between(0.3, 0.8),
      maxLife: 0.8,
      color,
      size: world.between(1.5, 3.6),
    });
  }
}

export function step(world, input, dt, audio) {
  world.time += dt;
  if (world.messageTimer > 0) world.messageTimer = Math.max(0, world.messageTimer - dt);
  world.shake = Math.max(0, world.shake - dt * 3);

  if (world.mode !== 'play') {
    updateParticles(world, dt);
    return;
  }

  const player = world.player;
  if (!player) return;

  // --- player movement and dash
  const axis = input.axis();
  const accel = 2200;
  player.vx += axis.x * accel * dt;
  player.vy += axis.y * accel * dt;
  const friction = axis.x === 0 && axis.y === 0 ? 7.5 : 3.2;
  player.vx -= player.vx * friction * dt;
  player.vy -= player.vy * friction * dt;

  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.dashTime = Math.max(0, player.dashTime - dt);
  if (input.justPressed('shift') && player.dashCooldown <= 0) {
    player.dashCooldown = 1.5;
    player.dashTime = 0.16;
    player.vx += axis.x * 900 || Math.cos(player.aim) * 700;
    player.vy += axis.y * 900 || Math.sin(player.aim) * 700;
    player.invulnerable = Math.max(player.invulnerable, 0.22);
    audio.dash();
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;
  const pad = player.radius;
  if (player.x < pad) { player.x = pad; player.vx *= -0.35; }
  if (player.x > WIDTH - pad) { player.x = WIDTH - pad; player.vx *= -0.35; }
  if (player.y < pad) { player.y = pad; player.vy *= -0.35; }
  if (player.y > HEIGHT - pad) { player.y = HEIGHT - pad; player.vy *= -0.35; }

  player.aim = Math.atan2(input.pointer.y - player.y, input.pointer.x - player.x);
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  if (input.pointer.down && fireBullet(world, player)) audio.fire();

  // --- waves
  world.waveTimer += dt;
  for (const spawn of world.spawnQueue) {
    if (!spawn.done && world.waveTimer >= spawn.delay) { spawn.done = true; spawnEnemy(world, spawn); }
  }
  if (world.spawnQueue.every((s) => s.done)) world.spawnQueue = [];
  if (world.enemies.length === 0 && world.spawnQueue.length === 0 && !world.waveCleared) {
    world.waveCleared = true;
    if (world.wave >= WAVES) {
      world.mode = 'win';
      world.best = Math.max(world.best, world.score + player.health * 120 + player.prisms * 15);
      audio.win();
    } else {
      audio.wave();
      setTimeout(() => { if (world.mode === 'play') nextWave(world); }, 350);
    }
  }

  // --- bullets
  for (const bullet of world.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
  }
  world.bullets = world.bullets.filter((b) => b.life > 0 && b.x > -30 && b.x < WIDTH + 30 && b.y > -30 && b.y < HEIGHT + 30);

  // --- enemies
  for (const enemy of world.enemies) {
    enemy.flash = Math.max(0, enemy.flash - dt * 4);
    enemy.wobble += dt * 2.2;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    const drift = Math.sin(enemy.wobble) * (enemy.type === 'fast' ? 0.6 : 0.35);
    enemy.vx = (dx / distance) * enemy.speed + -dy / distance * enemy.speed * drift;
    enemy.vy = (dy / distance) * enemy.speed + dx / distance * enemy.speed * drift;
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
  }

  // --- bullets hit enemies
  for (const bullet of world.bullets) {
    for (const enemy of world.enemies) {
      if (enemy.health <= 0) continue;
      if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < enemy.radius + bullet.radius) {
        enemy.health -= 1;
        enemy.flash = 1;
        bullet.life = 0;
        burst(world, bullet.x, bullet.y, enemy.color, 5, 130);
        if (enemy.health <= 0) {
          world.combo += 1;
          world.comboTimer = 2.4;
          const bonus = 1 + Math.min(world.combo, 12) * 0.08;
          const gained = Math.round(enemy.score * bonus);
          world.score += gained;
          world.floaters.push({ x: enemy.x, y: enemy.y, text: `+${gained}`, life: 0.9, color: enemy.color });
          burst(world, enemy.x, enemy.y, enemy.color, 16, 260);
          audio.kill();
          if (world.random() < (enemy.type === 'tank' ? 0.9 : 0.3)) {
            world.prisms.push({ x: enemy.x, y: enemy.y, vx: world.between(-40, 40), vy: world.between(-40, 40), life: 12, radius: 7 });
          }
        }
        break;
      }
    }
  }
  world.bullets = world.bullets.filter((b) => b.life > 0);
  world.enemies = world.enemies.filter((e) => e.health > 0);

  world.comboTimer = Math.max(0, world.comboTimer - dt);
  if (world.comboTimer === 0 && world.combo > 0) world.combo = 0;

  // --- enemy touches player
  for (const enemy of world.enemies) {
    if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < player.radius + enemy.radius) {
      if (player.invulnerable <= 0) {
        player.health -= enemy.type === 'tank' ? 2 : 1;
        player.invulnerable = 0.9;
        world.shake = 1;
        audio.hit();
        burst(world, player.x, player.y, '#ff8fa3', 14, 220);
        enemy.health -= enemy.type === 'tank' ? 1 : 2;
      }
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.hypot(dx, dy) || 1;
      player.vx += (dx / distance) * 380;
      player.vy += (dy / distance) * 380;
      if (player.health <= 0) {
        world.mode = 'lose';
        world.best = Math.max(world.best, world.score);
        world.shake = 1.4;
        audio.lose();
        burst(world, player.x, player.y, '#4cc9f0', 40, 420);
        return;
      }
    }
  }

  // --- prisms
  for (const prism of world.prisms) {
    prism.life -= dt;
    prism.x += prism.vx * dt;
    prism.y += prism.vy * dt;
    prism.vx *= 1 - 1.6 * dt;
    prism.vy *= 1 - 1.6 * dt;
    const dx = player.x - prism.x;
    const dy = player.y - prism.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance < 150) {
      prism.x += (dx / distance) * 260 * dt;
      prism.y += (dy / distance) * 260 * dt;
    }
    if (distance < player.radius + prism.radius + 6) {
      prism.life = 0;
      player.prisms += 1;
      world.score += 25;
      audio.prism();
      burst(world, prism.x, prism.y, SOURCE_COLORS.prism, 8, 150);
      if (player.prisms % 10 === 0) {
        player.health = Math.min(player.maxHealth, player.health + 1);
        world.floaters.push({ x: player.x, y: player.y - 24, text: '+1 SHIELD', life: 1.1, color: SOURCE_COLORS.heal });
      }
    }
  }
  world.prisms = world.prisms.filter((p) => p.life > 0);

  updateParticles(world, dt);

  for (const floater of world.floaters) { floater.life -= dt; floater.y -= 26 * dt; }
  world.floaters = world.floaters.filter((f) => f.life > 0);
}

function updateParticles(world, dt) {
  for (const particle of world.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 1 - 2.2 * dt;
    particle.vy *= 1 - 2.2 * dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
}
