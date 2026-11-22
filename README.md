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
- **R** — switch radio station, **T** — results screen (after the story)
- **P** — pause, **M** — mute

## Missions

1. **First Wheels** — steal a car and bring it to the garage ($250)
2. **Package Run** — pick up and deliver against the clock ($400)
3. **Heat** — three stars: survive and lose the cops ($600)
4. **Payback** — take down the Kings in the plaza ($900)
5. **The Big Score** — crack Solmar Bank, then escape at five stars ($5,250)

Every mission pays a **secondary bonus** for doing the job with style —
a sports car to the garage (+$100), a delivery with 30s to spare (+$150),
losing the heat early (+$150), leaving KING standing last (+$200), or
escaping with the getaway car over 50 HP (+$250). Jobs can also fail in
more ways than the clock: total the getaway car and the job restarts,
trip the bank alarm and the vault resets. Briefings and outros play as
dialogue subtitles at the bottom of the screen.

## A living city

- **District standing** — six districts (North Docks, Downtown, Kings
  Plaza, Parkside, Southside, Ocean Drive) remember Rico from -100 to
  +100. Missions and side jobs lift a district; stealing cars and
  dropping Kings drag it down. A respected wheelman cools his wanted
  level faster, earns up to +10% on side jobs, and the Kings stand down
  on their plaza; a hated one cools slower and pays less.
- **Crew** — MARLA the wheelwoman waits at the garage (after mission 1)
  and TONI the muscle at the plaza (after mission 3). Walk up and they
  join: they fight beside Rico on foot, and MARLA is worth +8% top speed
  in the car. The HUD crew panel names them and their bonus.
- **Radio (R)** — three stations: SOLMAR FM talk, BAY 97.5 night drive,
  and PD SCAN, the police band. A scanner in the car warns of a roadblock
  forming four seconds before the cruisers park.
- **Side jobs** — a TAXI stand on the avenue and a COURIER depot by the
  north docks. Step into the cyan ring and run the fare against the
  clock; pay scales with district standing.
- **Roadblocks** — at three stars and up the PD parks two cruisers across
  the road ahead, striped barrier between them. Ram through or swing
  around; the block burns out after 25 seconds or when the heat drops.
- **Police helicopter** — five stars brings the sky: a PD heli circles
  Rico in a searchlight cone, and while it is overhead the wanted level
  cannot decay. Drop below two stars to shake it.
- **Results screen (T)** — when the Big Score closes, the story ends in
  gold: total earned, time, cars stolen, Kings dropped, jobs run,
  roadblocks smashed, and a rank from C to S.
- **Day/night cycle** — a 4-minute day rolls from dawn to noon to dusk to
  deep night; street lamps glow after dark and the HUD clock shows the
  time, the phase, and the rain.
- **Weather** — showers blow in on their own, soak the roads until they
  shine, and slant across the screen in the wind.
- **Random events** — street races tear down the avenues (checkered flag,
  minimap icon), and while you are wanted the Solmar PD runs raids: a
  surge of cruisers around a red danger zone drawn on the minimap.
- **Reactions** — pedestrians run from speeding cars, punches, fresh
  explosions, and raid cordons.
- **Bigger booms** — explosions throw debris and a shockwave ring, and the
  camera kicks (screen shake) on hard crashes, rams, and blasts.

## Demo scenes

Open the game with a scene parameter for a staged shot of the city alive:

- `?scene=chase` — high-speed pursuit at night in the rain, raid zone ahead, roadblock across the avenue
- `?scene=beach` — Ocean Drive at dusk in a shower, wet sand and lamps, a live taxi job
- `?scene=plaza` — the Kings, led by KING himself, mid-standoff, TONI at Rico's side
- `?scene=heist` — five stars, $5,250, flat out in the night rain, PD heli overhead
- `?scene=results` — the Big Score closed out: the gold results screen, rank S
- `?auto=1` — the autopilot plays mission 1 by itself

## Structure

`game/src/` is split into one clear job per file: `config` (tuning),
`random` (seeded RNG), `world` (the city), `input`, `audio` (WebAudio synth),
`particles`, `vehicles` (cars and traffic), `pedestrians`, `police`,
`player`, `gang`, `missions`, `render`, `hud`, `save`, `scenes`, `main`
(the loop), plus the round-8 systems: `weather` (day/night + rain),
`events` (street races + police raids), `dialogue` (briefings and
subtitles), and `shake` (screen shake), plus the round-9 systems:
`standing` (district reputation), `crew` (recruits and bonuses), `radio`
(three stations + police scanner), `sidejobs` (taxi + courier work),
`roadblock` (PD roadblocks), `heli` (police helicopter), and `results`
(the gold end-of-story screen). No libraries, no network requests,
no build step.

An original fan-made game. Not affiliated with Rockstar Games.
