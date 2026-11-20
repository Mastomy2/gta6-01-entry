// Solmar Bay — tuning constants and palette.
// One job: every number the game balances on lives here, so tuning never
// means hunting through gameplay code.

export const WORLD_W = 3600;
export const WORLD_H = 2600;

export const VIEW_W = 1280;
export const VIEW_H = 720;

// Road network: vertical roads run the full height, horizontal the full width.
export const ROAD_W = 96;
export const V_ROADS = [420, 940, 1460, 1980, 2500, 3020];
export const H_ROADS = [380, 860, 1340, 1820, 2200];

// Beach strip along the south edge of the map.
export const BEACH_Y = 2360;
export const WATER_Y = 2520;

// The gang plaza: the block between the middle roads.
export const PLAZA = { x: 1520, y: 920, w: 400, h: 360, cx: 1720, cy: 1100 };
// The palm park, one block west of the plaza.
export const PARK = { x: 1000, y: 1400, w: 400, h: 360, cx: 1200, cy: 1580 };

export const PLAYER_START = { x: 1004, y: 620 };
export const HOSPITAL = { x: 1004, y: 620 };

// Player tuning.
export const WALK_SPEED = 235;
export const WALK_ACCEL = 1800;
export const PLAYER_RADIUS = 14;
export const PLAYER_MAX_HP = 100;
export const PUNCH_RANGE = 52;
export const PUNCH_DAMAGE = 34;
export const PUNCH_COOLDOWN = 0.38;

// Car tuning.
export const CAR_ACCEL = 340;
export const CAR_BRAKE = 620;
export const CAR_REVERSE_MAX = 170;
export const CAR_MAX_SPEED = 540;
export const CAR_SPORT_MAX = 640;
export const CAR_STEER = 2.6;
export const CAR_RADIUS = 26;

// Wanted level.
export const MAX_WANTED = 5;
export const WANTED_DECAY_SECONDS = 14;

// Police tuning.
export const COP_MAX_SPEED = 560;
export const COP_RAM_DAMAGE = 9;
export const COP_FOOT_SPEED = 205;
export const COP_PUNCH_DAMAGE = 7;

// Gang tuning.
export const GANG_COUNT = 6;
export const GANG_HP = 100;
export const GANG_SPEED = 185;
export const GANG_DAMAGE = 8;
export const GANG_AGGRO_RANGE = 420;

// Traffic and crowd counts.
export const TRAFFIC_COUNT = 16;
export const PARKED_COUNT = 8;
export const PED_COUNT = 32;

// Mission rewards.
export const REWARDS = [250, 400, 600, 900, 5250];

export const PALETTE = {
  grass: '#4d8a4a',
  grassDark: '#437a40',
  sand: '#e3cd8f',
  water: '#2e7fa8',
  waterDeep: '#1f5f86',
  asphalt: '#3a3a40',
  asphaltLine: '#d8c95a',
  sidewalk: '#9a9a92',
  curb: '#7d7d76',
  buildingRoof: '#8a6f5c',
  buildingRoof2: '#6f7d8c',
  buildingRoof3: '#a08a7a',
  buildingEdge: '#5c4a3e',
  pool: '#3fb7d9',
  helipad: '#565660',
  plaza: '#b8a888',
  fountain: '#4fb3d9',
  palmTrunk: '#7a5a38',
  palmLeaf: '#2f8f3a',
  lamp: '#2c2c30',
  hydrant: '#c23b2e',
  player: '#ffcf3d',
  playerShirt: '#e2483d',
  cop: '#2b4fd8',
  gang: '#7a2ea8',
  explosionOrange: '#ff7a1a',
  explosionYellow: '#ffd23d',
  smoke: '#8a8a8a',
};

export const CAR_COLORS = [
  '#c23b2e', '#2b6fd8', '#e8e8e8', '#222226', '#e8a13d',
  '#3d9e57', '#7a2ea8', '#d8d8d8', '#4a7a8c', '#b8b03a',
];
