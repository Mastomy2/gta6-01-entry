// Solmar Bay — saving.
// One job: persist and restore the player's money and story progress in
// localStorage. Nothing else about the run is saved.

const SAVE_KEY = 'solmar-bay-save-v1';

export function saveGame(S) {
  try {
    const data = {
      money: S.player.money,
      missionIndex: S.missions.index,
      carsStolen: S.player.carsStolen,
      kills: S.player.kills,
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number' || typeof data.missionIndex !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function applySave(S, data) {
  if (!data) return;
  S.player.money = data.money;
  S.missions.index = Math.max(0, Math.min(5, data.missionIndex));
  S.missions.done = S.missions.index >= 5;
  S.player.carsStolen = data.carsStolen || 0;
  S.player.kills = data.kills || 0;
}
