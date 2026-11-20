# Solmar Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Mastomy2/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Mastomy2/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game in the spirit of GTA 6, built from scratch in plain
JavaScript and canvas. You are Rico Vega, wheelman of Solmar Bay — a
sun-soaked coastal city with traffic, pedestrians, a beach, a palm park, a
gang plaza, rooftop pools and a helipad.

Steal cars, outrun the Solmar PD across five wanted stars, run packages,
settle the score with the Kings gang, and pull the Big Score: $5,250 on the
line with five stars on your tail. Progress saves automatically.

## How to play

Serve `game/` with any static server (for example `node serve.ts`, then open
http://localhost:8080) and play with the keyboard:

- **WASD / arrows** — walk, or drive when in a car
- **E** — steal a car / get out
- **SPACE** — punch
- **P** — pause, **M** — mute

## Missions

1. **First Wheels** — steal a car and bring it to the garage ($250)
2. **Package Run** — pick up and deliver against the clock ($400)
3. **Heat** — three stars: survive and lose the cops ($600)
4. **Payback** — take down the Kings in the plaza ($900)
5. **The Big Score** — crack Solmar Bank, then escape at five stars ($5,250)

## Demo scenes

Open the game with a scene parameter for a staged shot of the city alive:

- `?scene=chase` — high-speed pursuit with an explosion
- `?scene=beach` — Ocean Drive and the sand
- `?scene=plaza` — the Kings, led by KING himself
- `?scene=heist` — five stars, $5,250, flat out
- `?auto=1` — the autopilot plays mission 1 by itself

## Structure

`game/src/` is split into one clear job per file: `config` (tuning),
`random` (seeded RNG), `world` (the city), `input`, `audio` (WebAudio synth),
`particles`, `vehicles` (cars and traffic), `pedestrians`, `police`,
`player`, `gang`, `missions`, `render`, `hud`, `save`, `scenes`, `main`
(the loop). No libraries, no network requests, no build step.

An original fan-made game. Not affiliated with Rockstar Games.
