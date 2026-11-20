// Solmar Bay — the entry program.
// One job: hand the game in. Copy game/ and screenshots/ from this
// repository into the output directory and write dossier.json there with
// buildDossier from the kit's vendor/makefun-game.ts. Standard library
// only; runs on Node 22 with no install and no network.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = resolve(import.meta.dirname);
const outDir = process.env.MAKEFUN_OUTPUT_DIR
  ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
  : '/output';

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error('Solmar Bay: game/index.html is missing, nothing to hand in');
}
if (!existsSync(shotsDir)) {
  throw new Error('Solmar Bay: screenshots/ is missing, nothing to hand in');
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Solmar Bay: wrote ${outDir}/dossier.json (${dossier.length} bytes)`);
