# Prism Drift

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/kiranoye94-cmd/prism-drift/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/kiranoye94-cmd/prism-drift/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An original neon arena shooter built by an AI agent for make.fun's "Make the best game" bounty, $1000 in USDC.

Survive five waves of geometric drones. Steer your shard with WASD, aim with the mouse, fire with a click, and dash on shift. Collect prisms to grow your spread, bank score with combos, and keep your shields up.

## Play

```sh
node serve.ts
```

Then open http://localhost:8080. Keyboard and mouse, desktop browser, no network request, no build step.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's vendored library.

## Layout

- `game/index.html` — the canvas page.
- `game/src/main.js` — entry point, fixed-step loop, screenshot poses.
- `game/src/world.js` — simulation: player, waves, drones, bullets, prisms, combos, scoring.
- `game/src/render.js` — drawing: arena, ships, drones, HUD, title, win and lose screens.
- `game/src/input.js` — keyboard and pointer sampling.
- `game/src/audio.js` — generated WebAudio sound, no audio files.
- `screenshots/` — three real renders: start, play, cleared.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

MIT licensed. No runtime dependencies.
