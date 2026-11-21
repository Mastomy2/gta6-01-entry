# Solmar Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Mastomy2/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Mastomy2/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

[gta6-01 bounty on make.fun](https://make.fun/bounty/gta6-01)

**Solmar Bay** is an original open-world crime game set in a sun-soaked bay city:
five districts, traffic and pedestrians, a wanted level with police that escalate,
a 10-job story, street races, a crew to recruit and a garage to spend your money in.

## Play

Serve `game/` with any static server (for example `node serve.ts`) and open
`http://localhost:8080` in desktop Chrome. No network is needed — everything
the game loads is a file under `game/`.

- **WASD / Arrows** — drive (or walk on foot)
- **Shift** — nitro boost
- **E** — get in / out of a car, or steal the nearest one
- **M** — start the next story job
- **R** — start a street race in this district
- **G** — open the garage: cars, upgrades, crew, district standing
- **P** — pause

## The city

- **5 districts** — Solmar Beach, Marina Bay, Downtown Solmar, Barrio Verde, The Docks —
  each with its own look, standing (0–100) and jobs that unlock as your reputation grows.
- **Living streets** — traffic that follows the roads and brakes for you, pedestrians
  who stroll the sidewalks and flee a speeding car, palms, yachts in the bay,
  rooftop pools and helipads, and a full day/night cycle with headlights and street glow.

## The story — 10 jobs

From a first courier run (*First Wheels*) through a rival test (*Ghost's Test*),
a dockside deal, a 3-star getaway, two street-race championships, the vault-truck
heist (*The Bay Job*) and the finale (*Solmar Takeover*), each job pays cash and
raises your standing in its district.

## Crew

Recruit four specialists, each with a real ability: **Mara "Ghost"** (driver),
**Rico "Wrench"** (mechanic), **Lena "Byte"** (hacker) and **Dex "Boom"** (muscle).
Up to three ride with you at once.

## Police escalation

Heat builds into 1–5 wanted stars. Patrols chase and ram you, 3 stars bring
roadblocks, 4 stars add spike strips, and 5 stars put a helicopter overhead.
Get busted and the city takes its fine.

## Economy

Jobs and race wins pay. Spend it in the garage on four cars (Comet GT, Vulcan S,
Sabre Turbo, Phantom X), engine / armour / nitro upgrades, and crew contracts.

## Files

- `game/index.html` — the page; `game/src/main.js` — bootstrap and game loop.
- `game/src/config.js` — city, crew, cars, missions and races data.
- `game/src/world.js` — city generation; `vehicles.js` — driving and traffic;
  `player.js` — driving, walking, stealing; `pedestrians.js` — sidewalk life.
- `game/src/police.js` — wanted level and pursuit; `gang.js` — crew, standing, shop;
  `missions.js` — story jobs and street races; `particles.js` — effects.
- `game/src/render.js` — canvas renderer and day/night; `hud.js` — HUD, minimap, menus.
- `game/src/input.js`, `audio.js` (synth sound, no audio files), `save.js`, `scenes.js`.
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `screenshots/` — four screenshots of the game itself: a night chase, a beach race,
  the vault-truck heist, and the garage.

## License

MIT — see `LICENSE`.
