// All drawing: the arena, the shard, drones, bullets, prisms, HUD, title, win and lose screens.
import { WIDTH, HEIGHT, WAVES, SOURCE_COLORS } from './world.js';

const TAU = Math.PI * 2;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  let gridPhase = 0;

  function background(world) {
    const gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 80, WIDTH / 2, HEIGHT / 2, WIDTH * 0.72);
    gradient.addColorStop(0, '#101a33');
    gradient.addColorStop(0.55, '#080d1a');
    gradient.addColorStop(1, '#04060d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

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

    const glow = ctx.createRadialGradient(world.player?.x ?? WIDTH / 2, world.player?.y ?? HEIGHT / 2, 20, world.player?.x ?? WIDTH / 2, world.player?.y ?? HEIGHT / 2, 320);
    glow.addColorStop(0, 'rgba(76,201,240,0.11)');
    glow.addColorStop(1, 'rgba(76,201,240,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  function arena(world) {
    ctx.save();
    const inset = 10;
    ctx.strokeStyle = 'rgba(76,201,240,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(inset, inset, WIDTH - inset * 2, HEIGHT - inset * 2);
    ctx.strokeStyle = 'rgba(76,201,240,0.14)';
    for (const corner of [[inset, inset, 1, 1], [WIDTH - inset, inset, -1, 1], [inset, HEIGHT - inset, 1, -1], [WIDTH - inset, HEIGHT - inset, -1, -1]]) {
      const [x, y, sx, sy] = corner;
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
    const player = world.player;
    if (!player) return;
    ctx.save();
    ctx.translate(player.x, player.y);
    if (player.invulnerable > 0 && Math.floor(world.time * 18) % 2 === 0) ctx.globalAlpha = 0.4;

    ctx.save();
    ctx.rotate(player.aim);
    const cone = ctx.createLinearGradient(20, 0, 130, 0);
    cone.addColorStop(0, 'rgba(76,201,240,0.28)');
    cone.addColorStop(1, 'rgba(76,201,240,0)');
    ctx.fillStyle = cone;
    ctx.beginPath(); ctx.moveTo(16, -13); ctx.lineTo(140, 0); ctx.lineTo(16, 13); ctx.closePath(); ctx.fill();
    ctx.restore();

    ctx.shadowColor = '#4cc9f0';
    ctx.shadowBlur = player.dashTime > 0 ? 34 : 18;
    ctx.fillStyle = '#e8fbff';
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-11, 12);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-11, -12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#4cc9f0';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(232,251,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 5, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function droneShape(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.wobble * 0.6);
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = enemy.flash > 0 ? 26 : 12;
    ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : enemy.color;
    const sides = enemy.type === 'tank' ? 6 : enemy.type === 'fast' ? 3 : 5;
    ctx.beginPath();
    for (let i = 0; i < sides; i += 1) {
      const angle = (i / sides) * TAU - Math.PI / 2;
      const radius = enemy.radius;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(6,8,16,0.72)';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.42, 0, TAU);
    ctx.fill();
    if (enemy.maxHealth > 1) {
      ctx.fillStyle = enemy.flash > 0 ? '#0a0f1c' : '#ffffff';
      ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function bulletsAndPrisms(world) {
    ctx.save();
    ctx.shadowColor = '#bde0fe';
    ctx.shadowBlur = 14;
    for (const bullet of world.bullets) {
      ctx.fillStyle = '#e8fbff';
      ctx.beginPath();
      ctx.ellipse(bullet.x, bullet.y, bullet.radius * 1.7, bullet.radius, Math.atan2(bullet.vy, bullet.vx), 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    for (const prism of world.prisms) {
      ctx.save();
      ctx.translate(prism.x, prism.y);
      ctx.rotate(world.time * 2.4);
      ctx.shadowColor = SOURCE_COLORS.prism;
      ctx.shadowBlur = 18;
      ctx.fillStyle = SOURCE_COLORS.prism;
      ctx.beginPath();
      ctx.moveTo(0, -prism.radius);
      ctx.lineTo(prism.radius, 0);
      ctx.lineTo(0, prism.radius);
      ctx.lineTo(-prism.radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function particles(world) {
    for (const particle of world.particles) {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function floaters(world) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
    for (const floater of world.floaters) {
      ctx.globalAlpha = Math.min(1, floater.life);
      ctx.fillStyle = floater.color;
      ctx.fillText(floater.text, floater.x, floater.y);
    }
    ctx.restore();
  }

  function hud(world) {
    const player = world.player;
    if (!player) return;
    ctx.save();
    ctx.font = '700 22px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(232,251,255,0.92)';
    ctx.fillText(`SCORE ${world.score}`, 34, 52);

    ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(140,190,220,0.85)';
    ctx.fillText(`WAVE ${Math.min(world.wave, WAVES)}/${WAVES}`, 34, 78);

    if (world.combo > 1) {
      ctx.fillStyle = SOURCE_COLORS.enemyFast;
      ctx.font = '700 17px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`COMBO x${world.combo}`, 34, 104);
    }

    for (let i = 0; i < player.maxHealth; i += 1) {
      const x = 34 + i * 30;
      const filled = i < player.health;
      ctx.fillStyle = filled ? '#4cc9f0' : 'rgba(76,201,240,0.18)';
      ctx.beginPath();
      ctx.moveTo(x, 128);
      ctx.lineTo(x + 11, 140);
      ctx.lineTo(x, 152);
      ctx.lineTo(x - 11, 140);
      ctx.closePath();
      ctx.fill();
    }

    ctx.textAlign = 'right';
    ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = SOURCE_COLORS.prism;
    ctx.fillText(`◆ ${player.prisms}`, WIDTH - 34, 52);

    ctx.font = '600 14px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = player.dashCooldown <= 0 ? '#80ed99' : 'rgba(140,190,220,0.6)';
    ctx.fillText(player.dashCooldown <= 0 ? 'DASH READY' : `DASH ${player.dashCooldown.toFixed(1)}s`, WIDTH - 34, 78);

    ctx.textAlign = 'center';
    ctx.font = '600 14px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(140,190,220,0.55)';
    ctx.fillText('WASD MOVE   ·   MOUSE AIM   ·   CLICK FIRE   ·   SHIFT DASH', WIDTH / 2, HEIGHT - 26);

    if (world.messageTimer > 0) {
      ctx.globalAlpha = Math.min(1, world.messageTimer);
      ctx.font = '800 52px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#e8fbff';
      ctx.shadowColor = '#4cc9f0';
      ctx.shadowBlur = 26;
      ctx.fillText(world.message, WIDTH / 2, HEIGHT / 2 - 40);
    }
    ctx.restore();
  }

  function title(world) {
    ctx.save();
    ctx.textAlign = 'center';
    const pulse = 0.5 + Math.sin(world.time * 2) * 0.5;

    ctx.shadowColor = '#4cc9f0';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#e8fbff';
    ctx.font = '800 88px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PRISM DRIFT', WIDTH / 2, HEIGHT / 2 - 90);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(160,205,235,0.9)';
    ctx.font = '600 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Survive five waves. Shatter the drones. Bank the prisms.', WIDTH / 2, HEIGHT / 2 - 30);

    ctx.fillStyle = 'rgba(140,190,220,0.75)';
    ctx.font = '500 17px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('WASD / arrows to move   ·   mouse to aim   ·   click to fire   ·   shift to dash', WIDTH / 2, HEIGHT / 2 + 20);

    ctx.globalAlpha = 0.55 + pulse * 0.45;
    ctx.fillStyle = '#4cc9f0';
    ctx.font = '800 26px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PRESS SPACE OR CLICK TO START', WIDTH / 2, HEIGHT / 2 + 110);

    if (world.best > 0) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(140,190,220,0.7)';
      ctx.font = '600 16px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`BEST ${world.best}`, WIDTH / 2, HEIGHT / 2 + 160);
    }
    ctx.restore();
  }

  function endScreen(world, won) {
    ctx.save();
    ctx.fillStyle = 'rgba(4,6,13,0.78)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = 'center';

    ctx.shadowColor = won ? '#80ed99' : '#ff4d6d';
    ctx.shadowBlur = 28;
    ctx.fillStyle = won ? '#80ed99' : '#ff4d6d';
    ctx.font = '800 76px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(won ? 'SECTOR CLEARED' : 'SHARD DESTROYED', WIDTH / 2, HEIGHT / 2 - 90);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8fbff';
    ctx.font = '700 40px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`SCORE ${world.score}`, WIDTH / 2, HEIGHT / 2 - 10);

    ctx.font = '600 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(160,205,235,0.9)';
    ctx.fillText(`Best ${world.best}   ·   Waves ${Math.min(world.wave, WAVES)}/${WAVES}   ·   Prisms ${world.player?.prisms ?? 0}`, WIDTH / 2, HEIGHT / 2 + 42);

    ctx.fillStyle = '#4cc9f0';
    ctx.font = '800 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', WIDTH / 2, HEIGHT / 2 + 120);
    ctx.restore();
  }

  return {
    draw(world) {
      ctx.save();
      if (world.shake > 0) {
        const amount = world.shake * 7;
        ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
      }
      background(world);
      arena(world);

      if (world.mode === 'title') {
        title(world);
        particles(world);
        ctx.restore();
        return;
      }

      particles(world);
      for (const enemy of world.enemies) droneShape(enemy);
      bulletsAndPrisms(world);
      ship(world);
      floaters(world);
      hud(world);

      if (world.mode === 'win') endScreen(world, true);
      if (world.mode === 'lose') endScreen(world, false);
      ctx.restore();
    },
  };
}
