// Machbarkeitsstudie: node scripts/study-stills.mjs <outDir> <jobs...>   (jobs: lineup | faces | poses | walk | one)
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [outDir, ...jobs] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('study/index.tsx')});
const browser = await openBrowser('chrome', {browserExecutable: '/opt/pw-browsers/chromium', chromiumOptions: {gl: 'swangle'}});
const stats = {};
const still = async (name, props, id = 'Study') => {
  const comp = await selectComposition({serveUrl, id, inputProps: props, puppeteerInstance: browser});
  const t0 = Date.now();
  await renderStill({composition: comp, serveUrl, inputProps: props, frame: 0, output: path.join(outDir, `${name}.png`), imageFormat: 'png', scale: Number(process.env.SCALE ?? 0.4), puppeteerInstance: browser,
    onBrowserLog: (l) => { const m = /STUDY_STATS (.*)/.exec(l.text); if (m) { const j = JSON.parse(m[1]); stats[j.name] = j; } }});
  console.log(name, Date.now() - t0, 'ms');
};
const WHO = ['base', 'v2', 'glb'];
const CLIP = {idle: 'Idle', walk: 'Walking_A', run: 'Running_A', wave: 'Cheer', sit: 'Sit_Chair_Idle'};
for (const job of jobs) {
  if (job === 'lineup') {
    await still('lineup_idle', {who: WHO, shot: 'lineup', pose: 'idle', face: 'smile', t: 1.0, clip: 'Idle'}, 'StudyWide');
    await still('lineup_wave', {who: WHO, shot: 'lineup', pose: 'wave', face: 'grin', t: 0.5, clip: 'Cheer'}, 'StudyWide');
  }
  if (job === 'faces') for (const w of WHO) for (const f of ['neutral', 'grin', 'shock', 'angry', 'worry']) await still(`face_${w}_${f}`, {who: [w], shot: 'face', pose: 'idle', face: f, t: 1.0, clip: 'Idle'});
  if (job === 'hyb') {
    for (const [name, clip, pose, layer] of [['idle', 'Idle', 'idle', false], ['walk', 'Walking_A', 'walk', false], ['wave', 'Idle', 'wave', true]]) {
      for (const [view, yaw] of [['front', 0], ['side', 1.5708]]) {
        await still(`hyb_${name}_${view}`, {who: ['glb', 'hybrid', 'v2lo'], shot: 'lineup', pose, face: name === 'wave' ? 'grin' : 'smile', t: name === 'walk' ? 0.3 : 1.0, clip, yaw, layerWave: layer}, 'StudyWide');
      }
    }
  }
  if (job === 'hybwalk') for (const [i, t] of [0, 0.15, 0.3, 0.45, 0.6, 0.75].entries()) for (const [w, vyaw] of [['glb', 1.5708], ['hybrid', 1.5708], ['v2lo', 1.5708]]) await still(`hw_${w}_${i}`, {who: [w], shot: 'body', pose: 'walk', face: 'smile', t, clip: 'Walking_A', yaw: vyaw});
  if (job === 'dbgone') await still('dbg', {who: ['hybrid'], shot: 'body', pose: 'walk', face: 'smile', t: 0.3, clip: 'Walking_A'});
  if (job === 'glbfaces') for (const f of ['neutral', 'grin', 'shock', 'angry', 'worry']) await still(`face_glb_${f}`, {who: ['glb'], shot: 'face', pose: 'idle', face: f, t: 1.0, clip: 'Idle', camY: 2.22});
  if (job === 'talk') for (const w of ['base', 'v2']) for (const [i, tk] of [0, 0.35, 0.8].entries()) await still(`talk_${w}_${i}`, {who: [w], shot: 'face', pose: 'idle', face: 'smile', talk: tk, t: 1.0, clip: 'Idle'});
  if (job === 'poses') for (const w of WHO) for (const [p, c] of Object.entries(CLIP)) await still(`pose_${w}_${p}`, {who: [w], shot: 'body', pose: p, face: p === 'wave' ? 'grin' : 'smile', t: p === 'idle' ? 1.0 : 0.4, clip: c, chair: p === 'sit'});
  if (job === 'walkside') for (const w of WHO) for (const [i, t] of [0, 0.15, 0.3, 0.45, 0.6, 0.75].entries()) await still(`ws_${w}_${i}`, {who: [w], shot: 'body', pose: 'walk', face: 'smile', t, clip: 'Walking_A', yaw: 1.5708});
  if (job === 'walk') for (const w of WHO) for (const [i, t] of [0, 0.15, 0.3, 0.45, 0.6, 0.75].entries()) await still(`walk_${w}_${i}`, {who: [w], shot: 'body', pose: 'walk', face: 'smile', t, clip: 'Walking_A'});
}
fs.writeFileSync(path.join(outDir, 'stats.json'), JSON.stringify(stats, null, 1));
await browser.close({silent: true});
console.log(JSON.stringify(stats));
