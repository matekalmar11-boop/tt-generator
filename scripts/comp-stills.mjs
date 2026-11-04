// Standbilder einer beliebigen Composition: node scripts/comp-stills.mjs <compId> <outDir> <frame> <frame> ...
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [id, outDir, ...frames] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({
  entryPoint: path.resolve('src/index.ts'),
  webpackOverride: (config) => ({...config, module: {...config.module, rules: [...(config.module?.rules ?? []), {test: /\.ya?ml$/, type: 'asset/source'}]}}),
});
const opts = {chromiumOptions: {gl: 'swangle'}, browserExecutable: '/opt/pw-browsers/chromium'};
const comp = await selectComposition({serveUrl, id, ...opts});
for (const f of frames) {
  await renderStill({composition: comp, serveUrl, frame: Number(f), output: path.join(outDir, `${id}_${String(f).padStart(4, '0')}.png`), imageFormat: 'png', scale: 0.4, ...opts});
  console.log(id, 'frame', f);
}
