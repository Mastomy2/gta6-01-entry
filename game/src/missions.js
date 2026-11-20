// Missions and story: five missions in order, each with a title, a story
// beat, an objective marker and a timer where the story needs one. The
// mission object on G tracks the current step; completeMission() pays out,
// saves, and advances. The final mission ends the game with a WIN screen.

import { PLACES, dist } from './city.js';
import { clearPolice } from './police.js';

export const MISSION_DEFS = [
  {
    id: 1, title: 'First Wheels', reward: 500,
    story: 'Rico Vega just got out of the Marina lockup with nothing but a name to clear. Old Marlo says: "No wheels, no work. Get a car — any car — and bring it to my garage."',
    objective: 'Steal any car and bring it to the garage',
  },
  {
    id: 2, title: 'Package Run', reward: 800,
    story: '"One package. Marina Pier. Ninety seconds. The buyers do not wait, and neither do the tide." Marlo tosses Rico a wrapped parcel and a set of keys.',
    objective: 'Pick up the package, then deliver it to Marina Pier in 90 seconds',
  },
  {
    id: 3, title: 'Heat', reward: 1200,
    story: 'The pier drop was watched. Three stars and every cruiser in Solmar Bay is on Rico now. "Lay low, lose them, and the heat dies on its own. Sixty seconds, Rico."',
    objective: 'Survive the police for 60 seconds until the heat dies down',
  },
  {
    id: 4, title: 'Payback', reward: 1500,
    story: 'The Coral Kings jumped Rico\'s cousin outside the plaza and took his chain. "They want a war? Give them one. Four of them, Rico. Make it count."',
    objective: 'Take down 4 Coral Kings gang members at Plaza del Sol',
  },
  {
    id: 5, title: 'The Big Score', reward: 5000,
    story: 'Bay Trust Bank. One vault, one bag, one way out. "Grab the cash, get to the safehouse, and Solmar Bay is ours, kid. This is the one they will sing about."',
    objective: 'Rob the bank vault, then escape the police to the safehouse',
  },
];

export function missionTitle(G) {
  const def = MISSION_DEFS[G.missionIndex];
  return def ? def.title : 'Free Roam';
}

export function missionObjective(G) {
  const def = MISSION_DEFS[G.missionIndex];
  if (!def) return 'Free roam — explore Solmar Bay, steal cars, dodge the law.';
  const m = G.mission;
  if (G.missionIndex === 0) return m.stolen ? 'Drive the stolen car to the garage' : 'Steal any car (E near a car)';
  if (G.missionIndex === 1) return m.pickedUp ? 'Deliver the package to Marina Pier' : 'Go to the package marker';
  if (G.missionIndex === 2) return 'Survive the police — stay alive until the heat dies';
  if (G.missionIndex === 3) return `Take down the Coral Kings: ${m.kills}/4 down`;
  if (G.missionIndex === 4) return m.grabbed ? 'Escape to the safehouse!' : 'Enter the bank and grab the vault cash';
  return def.objective;
}

export function missionTarget(G) {
  if (G.missionIndex === 0) return PLACES.garage;
  if (G.missionIndex === 1) return G.mission.pickedUp ? PLACES.pier : { x: 1000, y: 1400, label: 'Package' };
  if (G.missionIndex === 2) return null; // survive: no single marker
  if (G.missionIndex === 3) return PLACES.plaza;
  if (G.missionIndex === 4) return G.mission.grabbed ? PLACES.safehouse : PLACES.bank;
  return null;
}

export function startMission(G, index) {
  // Clamp: a bad index used to read past MISSION_DEFS and crash the story
  // text (round 3 robustness).
  index = Math.max(0, Math.min(index, MISSION_DEFS.length - 1));
  G.missionIndex = index;
  const def = MISSION_DEFS[index];
  G.mission = { stolen: false, pickedUp: false, kills: 0, grabbed: false, timer: 0, grabTimer: 0 };
  G.missionLockWanted = false;
  if (index === 1) G.mission.timer = 90;
  if (index === 2) {
    G.mission.timer = 60;
    G.wanted = 3;
    G.crimeTimer = 0;
    G.missionLockWanted = true;
    G.audio.setSiren(true);
  }
  if (index === 3) spawnGang(G, 4, PLACES.plaza);
  if (index === 4) G.wanted = 0;
  if (def) {
    G.announce(`Mission ${def.id}: ${def.title}. ${def.objective}`);
    G.storyText = def.story;
    G.storyTimer = 6;
  }
}

export function spawnGang(G, count, near) {
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    G.gang.push({
      x: near.x + Math.cos(a) * 120,
      y: near.y + Math.sin(a) * 120,
      angle: a, hp: 3, maxHp: 3, speed: 130,
      punchCooldown: 0, shootCooldown: 1 + Math.random(), dead: false,
      color: '#7b2d8b',
    });
  }
}

export function completeMission(G) {
  const def = MISSION_DEFS[G.missionIndex];
  if (!def) return;
  G.money += def.reward;
  G.audio.mission();
  G.announce(`Mission complete: ${def.title}! +$${def.reward}.`);
  G.save();
  G.missionIndex += 1;
  if (G.missionIndex >= MISSION_DEFS.length) {
    // The Big Score is done: the story ends in victory.
    G.screen = 'win';
    G.audio.win();
    return;
  }
  startMission(G, G.missionIndex);
}

export function updateMissions(G, dt) {
  const p = G.player;
  const m = G.mission;
  if (G.missionIndex >= MISSION_DEFS.length) return;
  if (G.storyTimer > 0) G.storyTimer -= dt;

  if (G.missionIndex === 0) {
    if (!p.onFoot && p.car && p.car.stolen) m.stolen = true;
    if (m.stolen && dist(p, PLACES.garage) < 90) completeMission(G);
    return;
  }

  if (G.missionIndex === 1) {
    if (!m.pickedUp && dist(p, { x: 1000, y: 1400 }) < 70) {
      m.pickedUp = true;
      m.timer = 90;
      G.audio.pickup();
      G.announce('Package picked up! 90 seconds to the pier — drive!');
    }
    if (m.pickedUp) {
      m.timer -= dt;
      if (m.timer <= 0) {
        G.announce('Too slow — the buyers left. The package run failed.');
        G.audio.fail();
        startMission(G, 1); // retry the mission
        return;
      }
      if (dist(p, PLACES.pier) < 90) completeMission(G);
    }
    return;
  }

  if (G.missionIndex === 2) {
    m.timer -= dt;
    if (m.timer <= 0) {
      G.missionLockWanted = false;
      clearPolice(G);
      completeMission(G);
    }
    return;
  }

  if (G.missionIndex === 3) {
    if (m.kills >= 4) {
      completeMission(G);
      return;
    }
    // Lure the gang to the player if they wandered too far.
    for (const g of G.gang) {
      if (!g.dead && dist(g, p) > 700) {
        g.x = p.x + (Math.random() - 0.5) * 300;
        g.y = p.y + (Math.random() - 0.5) * 300;
      }
    }
    return;
  }

  if (G.missionIndex === 4) {
    if (!m.grabbed) {
      if (dist(p, PLACES.bank) < 110) {
        m.grabTimer += dt;
        if (m.grabTimer >= 3) {
          m.grabbed = true;
          G.wanted = 4;
          G.crimeTimer = 0;
          G.audio.pickup();
          G.announce('Vault cash grabbed! $5,000! Run — the whole force is coming!');
        }
      } else {
        m.grabTimer = 0;
      }
      return;
    }
    if (dist(p, PLACES.safehouse) < 90) {
      G.missionLockWanted = false;
      clearPolice(G);
      completeMission(G);
    }
  }
}
