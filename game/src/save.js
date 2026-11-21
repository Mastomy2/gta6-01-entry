// Solmar Bay — simpan/muat progres ke localStorage (aman bila diblokir).
const SAVE_KEY = 'solmar-bay-save-v1';

export function saveGame(state) {
  try {
    const data = {
      money: state.money,
      standing: state.standing,
      crew: state.crew,
      ownedCars: state.ownedCars,
      upgrades: state.upgrades,
      missionsDone: state.missionsDone,
      stats: state.stats,
      carId: state.player.carId,
      clock: state.clock,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) { return false; }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch (err) { return null; }
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch (err) { /* abaikan */ }
}

export function applySave(state, data) {
  if (!data) return;
  if (typeof data.money === 'number') state.money = data.money;
  if (data.standing) state.standing = { ...state.standing, ...data.standing };
  if (data.crew) state.crew = { owned: data.crew.owned || [], active: data.crew.active || [] };
  if (Array.isArray(data.ownedCars)) state.ownedCars = data.ownedCars;
  if (data.upgrades) state.upgrades = { ...state.upgrades, ...data.upgrades };
  if (Array.isArray(data.missionsDone)) state.missionsDone = data.missionsDone;
  if (data.stats) state.stats = { ...state.stats, ...data.stats };
  if (data.carId) state.player.carId = data.carId;
  if (typeof data.clock === 'number') state.clock = data.clock;
}
