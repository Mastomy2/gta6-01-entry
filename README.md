# gta6-01-entry

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Mastomy2/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Mastomy2/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay — an original open-world crime game for make.fun's "Make GTA 6" bounty. Rico Vega, wheelman, is back in the sun-soaked coastal city of Solmar Bay: broke, wanted, and one big score away from freedom. Explore the city on foot and by car, steal cars, outrun the police, and play through 5 story missions — First Wheels, Package Run, Heat, Payback, and The Big Score. Wanted stars 0–5, police chases, gang combat, a HUD with a live minimap, synth sound, particles, and localStorage saves. Referral code: 94ztz8n6.

## Round 3 polish (20 Nov 2026)

The round-2 entry scored 986.657 (rank ~1.657) — the game was complete, but the screenshots were thin: a menu as shot 4, a clipped control hint, empty roads, and a plaza fight that read as dots. Round 3 fixes the presentation, not the systems:

- **New cover scene 4 — the heist getaway** (`?demo=heist`): Mission 5 right after the vault grab — $5,000+ in the bag, 5 wanted stars, four cruisers glued to Rico's bumper, an explosion ahead, safehouse up north. It replaces the title-screen menu shot.
- **Denser city**: street lamps along every road, hydrants on sidewalk corners, traffic 14 → 16, pedestrians 26 → 32.
- **Tighter demo staging**: cruisers sit closer in chase/beach/heist, the four Coral Kings stand 90–120 units out in the plaza (with a KING tag and Rico's aim held on them), traffic and bystanders fill the frame.
- **Damage smoke**: a battered engine (hp < 50) puffs dark smoke from the hood; the chase and heist cars start at hp 42 so it reads in the shot.
- **HUD fix**: the bottom control hint now sits inside a pill with a 12 px margin — it can no longer clip off the bottom of a 1280×720 screenshot.

Screenshots are real renders of the running game (`?demo=chase|beach|plaza|heist`, 1280×720, each ≤ 256 KiB). `?auto=1` runs the scripted autopilot self-test (steal a car, finish mission 1, draw the police).

## Controls

- **WASD / arrows** walk · **Shift** run · **E** steal / enter / exit a car
- **W** gas · **S** brake / reverse · **A / D** steer
- **F** punch · **Click / Space** shoot · **Esc / P** pause · **S** save

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=94ztz8n6&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
