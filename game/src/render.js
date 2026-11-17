// All drawing for Prism Drift: neon grid arena, the player shard, enemies, bullets, prisms,
// HUD and the title/win/lose overlays. createRenderer returns a single draw(world) the loop
// calls every frame; the visuals are pure canvas2D, no assets.
import { WIDTH, HEIGHT, SOURCE_COLORS } from './world.js';

const TAU = Math.PI * 2;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  let gridPhase = 0;

  function background(world) {
    const g = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 80, WIDTH / 2, HEIGHT / 2, WIDTH * 0.72);
    g.addColorStop(0, '#101a33');
    g.addColorStop(0.55, '#080d1a');
    g.addColorStop(1, '#04060d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Scrolling grid for a sense of drift.
    gridPhase = (gridPhase + 0.35) % 64;
    ctx.save();
    ctx.strokeStyle = 'rgba(76,201,240,0.09)';
    ctx.lineWidth = 1;
    for (let x = -64 + gridPhase; x < WIDTH + 64; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
    }
    for (let y = -64 + gridPhase; y < HEIGHT + 64; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
    }
    ctx.restore();

    const px = world.player?.x ?? WIDTH / 2;
    const py = world.player?.y ?? HEIGHT / 2;
    const glow = ctx.createRadialGradient(px, py, 20, px, py, 320);
    glow.addColorStop(0, 'rgba(76,201,240,0.11)');
    glow.addColorStop(1, 'rgba(76,201,240,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  function arena() {
    ctx.save();
    const inset = 10;
    ctx.strokeStyle = 'rgba(76,201,240,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(inset, inset, WIDTH - inset * 2, HEIGHT - inset * 2);
    ctx.strokeStyle = 'rgba(76,201,240,0.14)';
    for (const [x, y, sx, sy] of [[inset, inset, 1, 1], [WIDTH - inset, inset, -1, 1], [inset, HEIGHT - inset, 1, -1], [WIDTH - inset, HEIGHT - inset, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * 46);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * 46, y);
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.restore();
  }

  function ship(world) {
    const p = world.player;
    if (!p) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.invuln > 0 && Math.floor(p.invuln * 30) % 2 === 0) ctx.globalAlpha = 0.4;
    ctx.rotate(p.aim + Math.PI / 2);
    ctx.fillStyle = SOURCE_COLORS.player;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(14, 14);
    ctx.lineTo(0, 7);
    ctx.lineTo(-14, 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = SOURCE_COLORS.prism;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Aim line.
    ctx.save();
    ctx.strokeStyle = 'rgba(128,255,219,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(p.aim) * 22, p.y + Math.sin(p.aim) * 22);
    ctx.lineTo(p.x + Math.cos(p.aim) * 70, p.y + Math.sin(p.aim) * 70);
    ctx.stroke();
    ctx.restore();
  }

  function enemies(world) {
    for (const e of world.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      const sides = e.type === 'fast' ? 3 : e.type === 'tank' ? 6 : 4;
      ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.color;
      ctx.beginPath();
      for (let i = 0; i < sides; i += 1) {
        const a = (i / sides) * TAU - Math.PI / 2;
        const r = e.radius;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      // Health pips for tough enemies.
      if (e.maxHealth > 2) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(-e.radius, -e.radius - 10, e.radius * 2, 5);
        ctx.fillStyle = SOURCE_COLORS.prism;
        ctx.fillRect(-e.radius, -e.radius - 10, e.radius * 2 * (e.health / e.maxHealth), 5);
      }
      ctx.restore();
    }
  }

  function bullets(world) {
    ctx.fillStyle = SOURCE_COLORS.bullet;
    for (const b of world.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = SOURCE_COLORS.enemy;
    for (const b of world.enemyBullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, TAU);
      ctx.fill();
    }
  }

  function prisms(world) {
    for (const pr of world.prisms) {
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(pr.life * 2);
      ctx.fillStyle = SOURCE_COLORS.prism;
      ctx.beginPath();
      ctx.moveTo(0, -pr.radius);
      ctx.lineTo(pr.radius, 0);
      ctx.lineTo(0, pr.radius);
      ctx.lineTo(-pr.radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function floaters(world) {
    ctx.textAlign = 'center';
    for (const f of world.floaters) {
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = f.color;
      ctx.font = '600 18px system-ui, sans-serif';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function hud(world) {
    const p = world.player;
    ctx.textAlign = 'left';
    ctx.fillStyle = SOURCE_COLORS.ui;
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.fillText(`SCORE ${world.score}`, 30, 46);
    ctx.fillText(`WAVE ${world.wave}`, 30, 76);
    if (world.combo > 1) {
      ctx.fillStyle = SOURCE_COLORS.enemyFast;
      ctx.fillText(`COMBO x${world.combo}`, 30, 106);
    }
    // Health bar, bottom-left.
    if (p) {
      const bw = 220;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(30, HEIGHT - 46, bw, 16);
      ctx.fillStyle = p.health > 2 ? SOURCE_COLORS.player : SOURCE_COLORS.enemy;
      ctx.fillRect(30, HEIGHT - 46, (bw * Math.max(0, p.health)) / p.maxHealth, 16);
      ctx.fillStyle = SOURCE_COLORS.ui;
      ctx.font = '600 14px system-ui, sans-serif';
      ctx.fillText(`HEALTH ${Math.max(0, p.health)}/${p.maxHealth}   PRISMS ${p.prisms}`, 30, HEIGHT - 54);
    }
  }

  function overlay(world) {
    if (world.mode === 'title') {
      ctx.fillStyle = 'rgba(4,6,13,0.7)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.textAlign = 'center';
      ctx.fillStyle = SOURCE_COLORS.prism;
      ctx.font = '700 64px system-ui, sans-serif';
      ctx.fillText('PRISM DRIFT', WIDTH / 2, HEIGHT / 2 - 20);
      ctx.fillStyle = SOURCE_COLORS.ui;
      ctx.font = '500 22px system-ui, sans-serif';
      ctx.fillText('WASD / arrows to move · mouse to aim · click or Space to start', WIDTH / 2, HEIGHT / 2 + 34);
      ctx.fillText('Shift to dash · collect prisms · survive 5 waves', WIDTH / 2, HEIGHT / 2 + 70);
      if (world.best > 0) ctx.fillText(`BEST ${world.best}`, WIDTH / 2, HEIGHT / 2 + 110);
    } else if (world.mode === 'win' || world.mode === 'lose') {
      ctx.fillStyle = world.mode === 'win' ? 'rgba(4,20,30,0.75)' : 'rgba(30,4,16,0.75)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.textAlign = 'center';
      ctx.fillStyle = world.mode === 'win' ? SOURCE_COLORS.prism : SOURCE_COLORS.enemy;
      ctx.font = '700 60px system-ui, sans-serif';
      ctx.fillText(world.mode === 'win' ? 'ALL WAVES CLEARED' : 'RUN ENDED', WIDTH / 2, HEIGHT / 2 - 10);
      ctx.fillStyle = SOURCE_COLORS.ui;
      ctx.font = '600 30px system-ui, sans-serif';
      ctx.fillText(`SCORE ${world.score}`, WIDTH / 2, HEIGHT / 2 + 40);
      ctx.font = '500 20px system-ui, sans-serif';
      ctx.fillText('Press R or Enter to run again', WIDTH / 2, HEIGHT / 2 + 86);
    }
  }

  /** Draw one full frame. */
  function draw(world) {
    ctx.save();
    if (world.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 8 * world.shake, (Math.random() - 0.5) * 8 * world.shake);
    }
    background(world);
    arena();
    prisms(world);
    enemies(world);
    bullets(world);
    ship(world);
    floaters(world);
    ctx.restore();
    hud(world);
    overlay(world);
  }

  return { draw };
}
