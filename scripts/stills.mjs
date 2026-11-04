// Rendert mehrere Standbilder mit einem Browser: node scripts/stills.mjs <outDir> <frame> <frame> ...
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [outDir, ...frames] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const opts = {chromeMode: undefined, chromiumOptions: {gl: 'swangle'}, browserExecutable: '/opt/pw-browsers/chromium'};
const comp = await selectComposition({serveUrl, id: 'Main', ...opts});
for (const f of frames) {
  const t0 = Date.now();
  await renderStill({composition: comp, serveUrl, frame: Number(f), output: path.join(outDir, `f${String(f).padStart(4, '0')}.jpg`), imageFormat: 'jpeg', jpegQuality: 80, scale: 0.4, ...opts});
  console.log('frame', f, Date.now() - t0, 'ms');
}
