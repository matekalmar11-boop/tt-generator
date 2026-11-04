/**
 * `story board <datei>`: Storyboard in EINEM Durchlauf – je Einstellung (Kamera-Schnitt) ein Standbild inkl. Untertitel/Einblendungen
 * und ein Kontaktbogen mit Beschriftung. Ein Browser, ein Bundle (gecacht) → ca. 2–3 s je Bild statt 6 s je Einzelaufruf.
 *   npm run story -- board <datei> [--scene a,b] [--at 0.4] [--scale 0.3333333333333333] [--cols 6] [--out ordner]
 * Ergebnis: <out>/NN_<szene>_<sek>s.png, <out>/kontaktbogen.png, <out>/board.json   (Vorgabe-Ordner: out/board/<story-id>)
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {openBrowser, selectComposition} from '@remotion/renderer';
import {boardPlan} from '../src/story/boardPlan';
import {BROWSER_EXE, codeHash, ensureBundle, loadStoryProps} from './preview';

const root = process.cwd();
const FONTS = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/opentype/inter/Inter-Bold.otf', '/Library/Fonts/Arial Bold.ttf', 'C:/Windows/Fonts/arialbd.ttf'];

export type BoardFlags = {scene?: string; at?: number; scale?: number; cols?: number; out?: string};

export const runBoard = async (file: string, f: BoardFlags): Promise<number> => {
  const {story, timeline: tl} = loadStoryProps(file);
  const scenes = f.scene ? f.scene.split(',') : undefined;
  for (const s of scenes ?? []) if (!story.scenes.some((x) => x.id === s)) throw new Error(`Szene "${s}" gibt es nicht (vorhanden: ${story.scenes.map((x) => x.id).join(', ')})`);
  const plan = boardPlan(story, tl, {at: f.at, scenes});
  if (!plan.length) throw new Error('Keine Einstellungen gefunden.');
  const scale = f.scale ?? 1 / 3, cols = f.cols ?? 6;
  const outDir = path.resolve(root, f.out ?? path.join('out/board', story.meta.id));
  fs.rmSync(outDir, {recursive: true, force: true});
  fs.mkdirSync(outDir, {recursive: true});
  const T0 = Date.now();
  const bdir = await ensureBundle(codeHash());
  const browser = await openBrowser('chrome', {browserExecutable: BROWSER_EXE, chromiumOptions: {gl: 'swangle'}});
  const files: string[] = [];
  try {
    const props = {story, timeline: tl};
    const comp = await selectComposition({serveUrl: bdir, puppeteerInstance: browser, inputProps: props, id: 'StoryAny'});
    const {renderStill} = await import('@remotion/renderer');
    for (const [i, p] of plan.entries()) {
      const file = path.join(outDir, `${String(i + 1).padStart(2, '0')}_${p.scene}_${p.sec.toFixed(1)}s.png`);
      await renderStill({composition: comp, serveUrl: bdir, puppeteerInstance: browser, inputProps: props, frame: p.frame, output: file, imageFormat: 'png', scale});
      files.push(file);
      console.log(`  ${p.label.padEnd(26)} → ${path.relative(root, file)}`);
    }
  } finally { await browser.close({silent: true}); }
  const tShots = Date.now() - T0;

  /* Kontaktbogen: Beschriftung (ffmpeg drawtext, falls Schrift vorhanden) + tile */
  const font = FONTS.find((x) => fs.existsSync(x));
  const lab = path.join(outDir, '.lab'); fs.mkdirSync(lab, {recursive: true});
  files.forEach((fl, i) => {
    const dst = path.join(lab, `l_${String(i + 1).padStart(3, '0')}.png`);
    const text = plan[i].label.replace(/[^A-Za-z0-9 ._-]/g, '');
    const vf = font ? `drawtext=fontfile='${font}':text='${text}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=5` : 'null';
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', fl, '-vf', vf, dst]);
  });
  const rows = Math.ceil(files.length / cols), sheet = path.join(outDir, 'kontaktbogen.png');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '1', '-i', path.join(lab, 'l_%03d.png'), '-vf', `tile=${Math.min(cols, files.length)}x${rows}:padding=6:color=0x14141c`, '-frames:v', '1', sheet]);
  fs.rmSync(lab, {recursive: true, force: true});
  fs.writeFileSync(path.join(outDir, 'board.json'), JSON.stringify(plan.map((p, i) => ({...p, file: path.basename(files[i])})), null, 1));
  const sec = (plan.at(-1)!.endFrame / tl.fps).toFixed(1);
  console.log(`\n✔ ${plan.length} Standbilder (${story.scenes.length} Szenen, Film ${sec} s) · Kontaktbogen: ${path.relative(root, sheet)}${font ? '' : '  (ohne Beschriftung: keine Schrift gefunden)'}\n  Zeit: Bilder ${(tShots / 1000).toFixed(1)} s (${(tShots / plan.length / 1000).toFixed(1)} s/Bild), gesamt ${((Date.now() - T0) / 1000).toFixed(1)} s`);
  return 0;
};
