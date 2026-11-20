// Save / load through localStorage: money, mission progress, player position
// and health. Saved after every completed mission and on the S key; Continue
// on the title screen loads it. Storage failures (private mode) are silent.

export const SAVE_KEY = 'solmarbay.save.v1';

export function saveGame(G) {
  const data = {
    version: 1,
    money: G.money,
    missionIndex: G.missionIndex,
    x: G.player.x,
    y: G.player.y,
    hp: G.player.hp,
    ammo: G.ammo,
    savedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    // Round 3: a hand-edited or corrupt save with a non-numeric wallet
    // used to poison the HUD money display; reject it outright.
    if (!Number.isFinite(data.money) || !Number.isFinite(data.x) || !Number.isFinite(data.y)) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadSave() !== null;
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch { /* ignore */ }
}
