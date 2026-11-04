// Messung der Renderzeit: node scripts/bench.mjs <compId> <vonFrame> <bisFrame> <konfig>…   (konfig z. B. scale=1,gl=swangle,conc=4,every=1)
// Gibt je Konfiguration Wandzeit, Zeit pro Bild, Anteile Rendern/Kodieren aus. Schreibt nur in ein Temp-Verzeichnis.
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const [id, from, to, ...cfgs] = process.argv.slice(2);
const t0 = Date.now();
const serveUrl = await bundle({
  entryPoint: path.resolve('src/index.ts'),
  webpackOverride: (config) => ({...config, module: {...config.module, rules: [...(config.module?.rules ?? []), {test: /\.ya?ml$/, type: 'asset/source'}]}}),
});
console.log(`Bundle: ${((Date.now() - t0) / 1000).toFixed(1)} s (${os.cpus().length} CPUs)`);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-'));
for (const cfg of cfgs) {
  const o = Object.fromEntries(cfg.split(',').map((kv) => kv.split('=')));
  const opts = {serveUrl, chromiumOptions: {gl: o.gl ?? 'swangle'}, browserExecutable: '/opt/pw-browsers/chromium'};
  const t1 = Date.now();
  const comp = await selectComposition({...opts, id, inputProps: {}});
  const tSel = Date.now() - t1;
  const t2 = Date.now();
  let renderedDone = 0, encodedDone = 0;
  const res = await renderMedia({
    ...opts, composition: comp, codec: 'h264', outputLocation: path.join(tmp, 'o.mp4'), frameRange: [Number(from), Number(to)],
    scale: Number(o.scale ?? 1), concurrency: Number(o.conc ?? 4), crf: Number(o.crf ?? 20), audioCodec: 'aac', imageFormat: o.fmt ?? 'jpeg',
    everyNthFrame: 1, onProgress: (p) => { renderedDone = p.renderedDoneIn ?? renderedDone; encodedDone = p.encodedDoneIn ?? encodedDone; },
  });
  const n = Number(to) - Number(from) + 1, wall = Date.now() - t2;
  const size = fs.statSync(path.join(tmp, 'o.mp4')).size;
  console.log(`${cfg.padEnd(34)} ${n} Bilder  Gesamt ${(wall / 1000).toFixed(1)} s  = ${(wall / n).toFixed(0)} ms/Bild · Rendern ${(renderedDone / 1000).toFixed(1)} s · Kodieren fertig ${(encodedDone / 1000).toFixed(1)} s · selectComposition ${(tSel / 1000).toFixed(1)} s · ${(size / 1024).toFixed(0)} kB`);
  console.log('   langsamste Bilder:', (res.slowestFrames ?? []).slice(0, 3).map((s) => `#${s.frame} ${s.time.toFixed(0)} ms`).join(', '));
}
fs.rmSync(tmp, {recursive: true, force: true});
