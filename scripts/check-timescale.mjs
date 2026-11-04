// Prüft, dass Vorschau (15 FPS) und finale Zeitbasis (30 FPS) denselben Bildinhalt zur selben Zeit liefern:
// node scripts/check-timescale.mjs <props.json> <outDir> <frame15:frame30> …
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [propsFile, outDir, ...pairs] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const props = JSON.parse(fs.readFileSync(propsFile, 'utf8'));
const serveUrl = await bundle({
  entryPoint: path.resolve('src/index.ts'),
  webpackOverride: (config) => ({...config, module: {...config.module, rules: [...(config.module?.rules ?? []), {test: /\.ya?ml$/, type: 'asset/source'}]}}),
});
const opts = {chromiumOptions: {gl: 'swangle'}, browserExecutable: '/opt/pw-browsers/chromium', serveUrl};
for (const fps of [15, 30]) {
  const inputProps = {...props, renderFps: fps};
  const comp = await selectComposition({...opts, id: 'StoryAny', inputProps});
  console.log(`${fps} FPS: ${comp.durationInFrames} Bilder, ${comp.width}×${comp.height}`);
  for (const pr of pairs) {
    const f = Number(pr.split(':')[fps === 15 ? 0 : 1]);
    await renderStill({...opts, composition: comp, inputProps, frame: f, output: path.join(outDir, `fps${fps}_${f}.png`), imageFormat: 'png', scale: 1 / 3});
  }
}
