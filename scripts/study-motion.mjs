// Kurzer Bewegungstest + Renderzeit pro Bild (nur Studie): 60 Bilder (2 s) @ 270×480, eine Figur, Gehen.
// node scripts/study-motion.mjs <outDir> [variante…]    Varianten: base v2 v2lo hybrid glb
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [outDir, ...vars] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('study/index.tsx')});
const browser = await openBrowser('chrome', {browserExecutable: '/opt/pw-browsers/chromium', chromiumOptions: {gl: 'swangle'}});
const res = {};
for (const v of vars.length ? vars : ['base', 'v2', 'v2lo', 'hybrid', 'glb']) {
  const props = {who: [v], shot: 'body', pose: 'walk', face: 'smile', t: 0, clip: 'Walking_A', yaw: 0.6};
  const comp = await selectComposition({serveUrl, id: 'StudyMotion', inputProps: props, puppeteerInstance: browser});
  const stamps = {};
  const t0 = Date.now();
  await renderMedia({composition: comp, serveUrl, inputProps: props, codec: 'h264', outputLocation: path.join(outDir, `motion_${v}.mp4`), scale: 0.25, concurrency: 1, crf: 28, puppeteerInstance: browser, logLevel: 'error',
    onProgress: (p) => { if (!(p.renderedFrames in stamps)) stamps[p.renderedFrames] = Date.now(); }});
  const total = Date.now() - t0, first = stamps[1] - t0, steady = (stamps[60] - stamps[1]) / 59;
  res[v] = {gesamt_s: +(total / 1000).toFixed(1), erstes_bild_s: +(first / 1000).toFixed(1), ms_pro_bild_stationaer: Math.round(steady), ms_pro_bild_gesamt: Math.round(total / 60)};
  console.log(v, JSON.stringify(res[v]));
}
fs.writeFileSync(path.join(outDir, 'motion_timing.json'), JSON.stringify(res, null, 1));
await browser.close({silent: true});
