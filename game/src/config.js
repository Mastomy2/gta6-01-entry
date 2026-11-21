// Solmar Bay — data kontrak game: kota, kru, kendaraan, misi, balapan.
// Semua nama, karakter dan cerita orisinal, dibuat untuk game ini.
export const GAME_TITLE = 'SOLMAR BAY';
export const GAME_SUBTITLE = 'An open-world crime story in a sun-soaked bay city';

export const WORLD = {
  width: 3440,
  height: 2720,
  roadGapX: 340,
  roadGapY: 340,
  roadFirstX: 200,
  roadFirstY: 200,
  roadCountX: 10,
  roadCountY: 8,
  roadWidth: 64,
};

// Lima distrik Solmar Bay. Urutan penting: beach dicek dulu (strip utara).
export const DISTRICTS = [
  { id: 'beach', name: 'Solmar Beach', color: '#e8c87a', dark: '#8a6f3a',
    rect: { x: 0, y: 0, w: 3440, h: 460 },
    desc: 'Boardwalk, neon signs and the strip where every racer proves themselves.' },
  { id: 'marina', name: 'Marina Bay', color: '#5fb8d8', dark: '#2a6b84',
    rect: { x: 0, y: 460, w: 760, h: 2260 },
    desc: 'Yachts, fish markets and quiet deals done after midnight.' },
  { id: 'downtown', name: 'Downtown Solmar', color: '#e8b64a', dark: '#8a6a1e',
    rect: { x: 760, y: 460, w: 1500, h: 1300 },
    desc: 'Glass towers, the plaza and the bank that everyone watches.' },
  { id: 'barrio', name: 'Barrio Verde', color: '#7ac87a', dark: '#3f7a3f',
    rect: { x: 760, y: 1760, w: 1500, h: 960 },
    desc: 'Tight streets, murals and the crew that never forgets a favour.' },
  { id: 'docks', name: 'The Docks', color: '#c98a5f', dark: '#7a4a2a',
    rect: { x: 2260, y: 460, w: 1180, h: 2260 },
    desc: 'Cranes, containers and cargo that never appears on a manifest.' },
];

// Kru yang bisa direkrut. Setiap anggota memberi bonus pasif + ability aktif.
export const CREW = [
  { id: 'mara', name: 'Mara "Ghost"', role: 'Driver',
    ability: 'Slipstream: +12% top speed, +25% handling, nitro refills 40% faster.',
    desc: 'Ex-street racer. Never lost a chase she started.',
    cost: 1500, unlock: { type: 'mission', id: 'm2' } },
  { id: 'rico', name: 'Rico "Wrench"', role: 'Mechanic',
    ability: 'Pit Boss: armour slowly repairs itself, repairs cost half, ramming hurts you 40% less.',
    desc: 'Can rebuild an engine with a spanner and a promise.',
    cost: 1200, unlock: { type: 'standing', district: 'docks', value: 30 } },
  { id: 'lena', name: 'Lena "Byte"', role: 'Hacker',
    ability: 'Ghost Signal: police heat fades twice as fast and patrols arrive late.',
    desc: 'Owns the city cameras. The city never sees her coming.',
    cost: 2000, unlock: { type: 'mission', id: 'm4' } },
  { id: 'dex', name: 'Dex "Boom"', role: 'Muscle',
    ability: 'Heavy Hands: your rams deal double damage, heist payouts +15%.',
    desc: 'Opens doors. Sometimes the doors stay open.',
    cost: 1800, unlock: { type: 'standing', district: 'barrio', value: 40 } },
];

// Kendaraan yang bisa dibeli di garasi. comet = mobil awal.
export const CARS = [
  { id: 'comet', name: 'Comet GT', price: 0, topSpeed: 430, accel: 270, handling: 1.0,
    color: '#d83a2e', desc: 'Your first ride. Honest, loud, paid for.' },
  { id: 'vulcan', name: 'Vulcan S', price: 4500, topSpeed: 530, accel: 330, handling: 1.1,
    color: '#2e6fd8', desc: 'A coupe that eats the beach road for breakfast.' },
  { id: 'sabre', name: 'Sabre Turbo', price: 9000, topSpeed: 630, accel: 390, handling: 1.2,
    color: '#e8a13a', desc: 'Twin-turbo menace. The strip knows its sound.' },
  { id: 'phantom', name: 'Phantom X', price: 16000, topSpeed: 730, accel: 450, handling: 1.3,
    color: '#22242e', desc: 'Black on black. The fastest thing in Solmar Bay.' },
];

export const UPGRADES = [
  { key: 'engine', name: 'Engine Tuning', desc: '+8% top speed per level',
    prices: [800, 1600, 3200] },
  { key: 'armor', name: 'Armour Plating', desc: '+50 max armour per level',
    prices: [600, 1200, 2400] },
  { key: 'nitro', name: 'Nitro Kit', desc: '+40 nitro capacity and faster refill per level',
    prices: [500, 1000, 2000] },
];

// Balapan jalanan: sirkuit checkpoint, 2 lap, 3 lawan.
export const RACES = [
  { id: 'beach-sprint', name: 'Beach Sprint', district: 'beach', laps: 2, reward: 3000,
    desc: 'Eight checkpoints down the boardwalk. First to the line takes the pot.',
    checkpoints: [
      { x: 540, y: 200 }, { x: 1560, y: 200 }, { x: 2580, y: 200 }, { x: 3260, y: 200 },
      { x: 3260, y: 540 }, { x: 2580, y: 540 }, { x: 1560, y: 540 }, { x: 540, y: 540 },
    ] },
  { id: 'downtown-gp', name: 'Downtown GP', district: 'downtown', laps: 2, reward: 5000,
    desc: 'A tight grand-prix loop around the plaza towers.',
    checkpoints: [
      { x: 880, y: 880 }, { x: 1900, y: 880 }, { x: 2240, y: 880 }, { x: 2240, y: 1560 },
      { x: 1560, y: 1560 }, { x: 880, y: 1560 }, { x: 880, y: 1220 },
    ] },
  { id: 'marina-run', name: 'Marina Run', district: 'marina', laps: 2, reward: 4000,
    desc: 'Yachts on one side, the bay on the other. No room for mistakes.',
    checkpoints: [
      { x: 200, y: 880 }, { x: 540, y: 880 }, { x: 540, y: 1900 },
      { x: 200, y: 1900 }, { x: 200, y: 1220 }, { x: 540, y: 1220 },
    ] },
];

// Misi cerita 10 babak. Stage: goto / pickup / deliver / escape / ram / race.
export const MISSIONS = [
  { id: 'm1', title: 'First Wheels', district: 'downtown', standingReq: 0, reward: 800,
    briefing: 'A courier package needs legs. Take it from the plaza garage to the marina in one piece.',
    stages: [
      { type: 'goto', x: 1220, y: 880, label: 'Pick up the package at the plaza garage' },
      { type: 'deliver', x: 540, y: 1220, label: 'Deliver the package to the marina' },
    ] },
  { id: 'm2', title: "Ghost's Test", district: 'downtown', standingReq: 15, reward: 1200,
    briefing: 'Mara will only drive for someone who can keep up. Beat her through three gates, fast.',
    crewUnlock: 'mara',
    stages: [
      { type: 'timed', x: 1560, y: 880, label: 'Reach the first gate', seconds: 25 },
      { type: 'timed', x: 2240, y: 1220, label: 'Reach the second gate', seconds: 25 },
      { type: 'timed', x: 1220, y: 1560, label: 'Reach the final gate', seconds: 25 },
    ] },
  { id: 'm3', title: 'Barrio Run', district: 'barrio', standingReq: 10, reward: 1500,
    briefing: 'Two drops in the Barrio, and the patrols are awake tonight. Lose them if they spot you.',
    stages: [
      { type: 'pickup', x: 1220, y: 1900, label: 'Pick up the goods in the Barrio' },
      { type: 'deliver', x: 1900, y: 2240, label: 'First drop: the mural corner' },
      { type: 'deliver', x: 880, y: 2240, label: 'Second drop: the green market' },
      { type: 'escape', label: 'Lose the heat', seconds: 20 },
    ] },
  { id: 'm4', title: 'Dockside Deal', district: 'docks', standingReq: 20, reward: 2000,
    briefing: 'A crate at the docks, a buyer downtown. The harbour police are not part of the deal.',
    crewUnlock: 'lena',
    stages: [
      { type: 'goto', x: 2920, y: 880, label: 'Reach the container yard' },
      { type: 'pickup', x: 2920, y: 1560, label: 'Pick up the crate' },
      { type: 'deliver', x: 1560, y: 1220, label: 'Deliver downtown — stay under 2 stars' },
    ] },
  { id: 'm5', title: 'The Getaway', district: 'downtown', standingReq: 30, reward: 2500,
    briefing: 'Three stars and the whole city behind you. Survive thirty seconds. Do not get boxed in.',
    stages: [
      { type: 'escape', label: 'Outrun a 3-star chase for 30 seconds', seconds: 30, stars: 3 },
    ] },
  { id: 'm6', title: 'Beach Sprint', district: 'beach', standingReq: 25, reward: 3000,
    briefing: 'The strip is watching. Win the Beach Sprint and the whole beach knows your name.',
    stages: [
      { type: 'race', raceId: 'beach-sprint', label: 'Win the Beach Sprint' },
    ] },
  { id: 'm7', title: 'Midnight Cargo', district: 'marina', standingReq: 35, reward: 3500,
    briefing: 'A midnight pickup at the marina, a quiet drop in the Barrio. Keep the heat low.',
    stages: [
      { type: 'pickup', x: 200, y: 1560, label: 'Midnight pickup at the marina' },
      { type: 'deliver', x: 1220, y: 2240, label: 'Quiet drop in the Barrio' },
    ] },
  { id: 'm8', title: 'The Bay Job', district: 'marina', standingReq: 50, reward: 6000,
    briefing: 'The big one. Hit the vault truck, take the crew with you, and vanish into the docks.',
    stages: [
      { type: 'goto', x: 1900, y: 880, label: 'Meet the crew at the plaza' },
      { type: 'ram', label: 'Ram the vault truck until it stops', target: 'vault' },
      { type: 'pickup', x: 1900, y: 880, label: 'Grab the takings' },
      { type: 'deliver', x: 2920, y: 1900, label: 'Escape to the docks hideout' },
    ] },
  { id: 'm9', title: 'King of the Strip', district: 'beach', standingReq: 45, reward: 5000,
    briefing: 'One race decides who owns the strip. Downtown GP, no excuses.',
    stages: [
      { type: 'race', raceId: 'downtown-gp', label: 'Win the Downtown GP' },
    ] },
  { id: 'm10', title: 'Solmar Takeover', district: 'downtown', standingReq: 60, reward: 9000,
    briefing: 'The finale. Take three corners, break the rival crew, and outrun a 4-star storm.',
    stages: [
      { type: 'goto', x: 880, y: 880, label: 'Take the north corner' },
      { type: 'ram', label: 'Break the rival enforcer', target: 'rival' },
      { type: 'goto', x: 2240, y: 1560, label: 'Take the south corner' },
      { type: 'escape', label: 'Outrun a 4-star chase for 30 seconds', seconds: 30, stars: 4 },
      { type: 'deliver', x: 1560, y: 1220, label: 'Bring it home to the plaza' },
    ] },
];

// Eskalasi polisi per bintang.
export const POLICE_LEVELS = [
  { stars: 0, maxCars: 0, speed: 0, label: 'Clean' },
  { stars: 1, maxCars: 1, speed: 380, label: 'One patrol on your tail' },
  { stars: 2, maxCars: 2, speed: 430, label: 'Patrols converging' },
  { stars: 3, maxCars: 3, speed: 480, label: 'Roadblocks ahead — watch the avenue' },
  { stars: 4, maxCars: 4, speed: 530, label: 'Spike strips out. Air support is circling.' },
  { stars: 5, maxCars: 6, speed: 580, label: 'The whole city. Helicopter overhead.' },
];

export const HEAT_PER_STAR = 20; // heat 0..100 -> stars = floor(heat / 20)
export const START_MONEY = 3200;
export const DAY_LENGTH_SECONDS = 480; // satu hari game = 8 menit nyata
