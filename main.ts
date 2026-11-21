// Solmar Bay — entrypoint: copy the game and its screenshots to /output,
// then write /output/dossier.json with buildDossier from the kit's library.
import { mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = await buildDossier(outDir, { text_max_bytes: 163840 });
writeFileSync(join(outDir, 'dossier.json'), dossier);
