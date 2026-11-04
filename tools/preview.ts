/**
 * Schritt 4: schnelle Vorschau.   npm run story -- preview <datei> [Optionen]
 *   --scene a,b        nur diese Szenen        --from 3s --to 8s   Zeitabschnitt (Sekunden, "90f" = Frames; mit einer Szene relativ zu ihr)
 *   --size 360|270     Breite in Pixeln (Vorgabe 360 → 360×640)     --fps 15   Bildrate der Vorschau (Vorgabe 15)
 *   --out <datei>      Ausgabe (Vorgabe out/preview/<story-id>[-szenen].mp4)   --no-cache   Szenen-Cache ignorieren
 *   --jpeg-quality n   Qualität der Zwischenbilder (Vorgabe 70; finales Rendering: 80)   --crf n   H.264-Qualität (Vorgabe 28; final 20)
 *   --concurrency n    parallele Browser-Tabs (Vorgabe 1, siehe Messwerte)   --props <datei>   nur die inputProps schreiben (für finales Rendering)
 * Dieselbe Composition ("StoryAny") und dieselben Props wie im finalen Rendering – Unterschiede nur: Skalierung (scale), Bildrate, CRF.
 * Szenen werden einzeln gerendert und mit einem Schlüssel (Inhalt + Code + Einstellungen) zwischengespeichert; unveränderte Szenen kosten 0 s.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, selectComposition} from '@remotion/renderer';
import {checkStoryFile} from '../src/story/validate';
import {buildTimeline, type Timeline} from '../src/story/timeline';
import {parseTime} from '../src/story/schema';
import type {StoryData} from '../src/story/schema';

const root = process.cwd();
const DEFAULT_CONCURRENCY = 1; // gemessen: mehr Tabs als 1 sind auf dieser Maschine langsamer (siehe docs/STORY_FORMAT.md, Messwerte)
const sha = (b: Buffer | string) => crypto.createHash('sha256').update(b).digest('hex');
const BROWSER = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;

export type PreviewFlags = {jpegQuality?: number; scene?: string; from?: string; to?: string; size?: number; fps?: number; out?: string; noCache?: boolean; concurrency?: number; props?: string; crf?: number};

/** Story + Zeitleiste exakt so, wie sie auch das finale Rendering bekommt (echte TTS-Timings, falls vorhanden). */
export const loadStoryProps = (file: string) => {
  const {loaded, issues} = checkStoryFile(file, root);
  const errs = issues.filter((i) => i.level === 'error');
  if (errs.length || !loaded.story) throw new Error(`${file} hat ${errs.length} Fehler – zuerst "story check" ausführen.`);
  const story = loaded.story;
  const rd = (f: string) => { try { return JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')); } catch { return undefined; } };
  const timeline = buildTimeline(story, rd('src/story/timeline.json'), rd(`src/story/voices/${story.meta.id}.json`));
  return {story, timeline, warnings: issues.filter((i) => i.level === 'warn').length};
};

/** Webpack-Bundle je Code-Stand unter out/bundle-cache/<code>/ (wird nur neu gebaut, wenn sich der Code geändert hat). */
export const ensureBundle = async (code: string): Promise<string> => {
  const bdir = path.join(root, 'out/bundle-cache', code);
  if (!fs.existsSync(path.join(bdir, 'index.html'))) {
    fs.rmSync(path.join(root, 'out/bundle-cache'), {recursive: true, force: true});
    await bundle({entryPoint: path.join(root, 'src/index.ts'), outDir: bdir, webpackOverride: (c) => ({...c, module: {...c.module, rules: [...(c.module?.rules ?? []), {test: /\.ya?ml$/, type: 'asset/source'}]}})});
  }
  return bdir;
};
export const BROWSER_EXE = BROWSER;

/** Prüfsumme des Codes, der die Bildausgabe bestimmt (src/, Konfiguration, Abhängigkeiten); Sprach-JSONs kommen über die Props. */
export const codeHash = (): string => {
  const h = crypto.createHash('sha256');
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!p.endsWith(path.join('src', 'story', 'voices'))) walk(p); } else h.update(p).update(fs.readFileSync(p));
    }
  };
  walk(path.join(root, 'src'));
  for (const f of ['remotion.config.ts', 'package-lock.json']) h.update(fs.readFileSync(path.join(root, f)));
  return h.digest('hex').slice(0, 16);
};

const toAuthFrames = (v: string, fps: number): number => {
  const t = parseTime(/^\d+(\.\d+)?$/.test(v) ? Number(v) : v);
  if (!t || t.kind !== 'abs') throw new Error(`Ungültige Zeit "${v}" (erlaubt: 3.5, "3.5s", "90f")`);
  return Math.round(t.unit === 'f' ? t.value : t.value * fps);
};

type Seg = {label: string; a: number; b: number; scene?: number}; // [a,b) in Autoren-Frames
const fileSha = (f: string) => (fs.existsSync(f) ? sha(fs.readFileSync(f)).slice(0, 16) : 'fehlt');

export const sceneKey = (story: StoryData, tl: Timeline, i: number, cfg: Record<string, unknown>, code: string): string => {
  const sc = story.scenes[i], ts = tl.scenes[i];
  const audio = (f: string) => fileSha(path.join(root, 'public', f));
  const global = {format: story.format, cast: story.cast, voices: Object.fromEntries(Object.entries(story.voices).map(([k, v]) => [k, v.subtitle])), subtitles: story.subtitles, overlays: story.overlays, transitions: story.transitions, music: story.audio.music};
  return sha(JSON.stringify({
    code, cfg, global, scene: sc, timeline: ts, i, hasNext: i < story.scenes.length - 1, total: tl.totalFrames,
    lineAudio: ts.lines.map((l) => audio(l.file)), sfxAudio: sc.sfx.map((s) => audio(`audio/${s.sound}.wav`)),
    music: story.audio.music ? audio(`audio/${story.audio.music.file}.wav`) : null,
  })).slice(0, 24);
};

export const runPreview = async (file: string, f: PreviewFlags): Promise<number> => {
  const T0 = Date.now();
  const {story, timeline: tl, warnings} = loadStoryProps(file);
  const authFps = story.format.fps, renderFps = f.fps ?? 15, scale = authFps / renderFps;
  const width = f.size ?? 360, rscale = width / story.format.width;
  if (!Number.isInteger(story.format.height * rscale) || !Number.isInteger(story.format.width * rscale)) throw new Error(`Breite ${width} ergibt keine ganzzahlige Höhe (z. B. 270 oder 360).`);
  const props = {story, timeline: tl, renderFps: f.props ? undefined : renderFps};
  if (f.props) { fs.mkdirSync(path.dirname(f.props), {recursive: true}); fs.writeFileSync(f.props, JSON.stringify({story, timeline: tl})); console.log(`inputProps (finale Qualität, ${authFps} FPS) geschrieben: ${f.props}`); return 0; }

  // Segmente bestimmen
  const ids = f.scene ? f.scene.split(',') : story.scenes.map((s) => s.id);
  const idx = ids.map((id) => { const i = story.scenes.findIndex((s) => s.id === id); if (i < 0) throw new Error(`Szene "${id}" gibt es nicht (vorhanden: ${story.scenes.map((s) => s.id).join(', ')})`); return i; });
  let segs: Seg[];
  if (f.from !== undefined || f.to !== undefined) {
    if (idx.length > 1 && f.scene) throw new Error('--from/--to nur mit höchstens einer Szene');
    const base = f.scene ? tl.scenes[idx[0]].startFrame : 0, lim = f.scene ? tl.scenes[idx[0]].durationFrames : tl.totalFrames;
    const a = base + (f.from !== undefined ? toAuthFrames(f.from, authFps) : 0), b = base + (f.to !== undefined ? Math.min(toAuthFrames(f.to, authFps), lim) : lim);
    if (b <= a) throw new Error('--to muss nach --from liegen');
    segs = [{label: `${f.scene ?? 'Film'} ${(a - base) / authFps}–${(b - base) / authFps} s`, a, b}];
  } else segs = idx.map((i) => ({label: story.scenes[i].id, a: tl.scenes[i].startFrame, b: tl.scenes[i].startFrame + tl.scenes[i].durationFrames, scene: i}));
  // Szenengrenzen in Komposition: erstes Bild = aufrunden (wie StoryVideo)
  const cf = (x: number) => Math.ceil(x / scale - 1e-9);
  const compTotal = cf(tl.totalFrames);

  console.log(`Vorschau „${story.meta.title}“: ${width}×${Math.round(story.format.height * rscale)} @ ${renderFps} FPS · ${segs.length} Abschnitt(e)${warnings ? ` · ${warnings} Hinweis(e) aus der Prüfung` : ''}`);
  const missing = tl.scenes.flatMap((s) => s.lines.map((l) => l.file)).filter((x) => !fs.existsSync(path.join(root, 'public', x)));
  if (missing.length) console.log(`⚠ ${missing.length} Sprechdatei(en) fehlen → dort stumm: ${missing.join(', ')}`);

  const code = codeHash();
  const cacheDir = path.join(root, 'out/preview-cache');
  fs.mkdirSync(cacheDir, {recursive: true});
  const cfg = {width, renderFps, crf: f.crf ?? 28, jq: f.jpegQuality ?? 70};
  const todo = segs.map((s) => ({s, key: s.scene !== undefined && !f.noCache ? sceneKey(story, tl, s.scene, cfg, code) : undefined}))
    .map(({s, key}) => ({s, key, file: key ? path.join(cacheDir, `${key}.mp4`) : undefined}));
  const fresh = todo.filter((x) => !x.file || !fs.existsSync(x.file));

  const timesMs: Record<string, number> = {};
  let tBundle = 0, tBrowser = 0;
  const rendered: {label: string; ms: number; frames: number}[] = [];
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-'));
  if (fresh.length) {
    let t = Date.now();
    const bdir = await ensureBundle(code);
    tBundle = Date.now() - t; t = Date.now();
    const browser = await openBrowser('chrome', {browserExecutable: BROWSER, chromiumOptions: {gl: 'swangle'}});
    const opts = {serveUrl: bdir, puppeteerInstance: browser, inputProps: props};
    const comp = await selectComposition({...opts, id: 'StoryAny'});
    tBrowser = Date.now() - t;
    for (const x of fresh) {
      const a = cf(x.s.a), b = x.s.scene !== undefined && x.s.scene < story.scenes.length - 1 ? cf(tl.scenes[x.s.scene + 1].startFrame) : x.s.b >= tl.totalFrames ? compTotal : cf(x.s.b);
      const out = x.file ?? path.join(tmpDir, `seg-${a}.mp4`);
      const t1 = Date.now();
      await renderMedia({...opts, composition: comp, codec: 'h264', outputLocation: out + '.part.mp4', frameRange: [a, Math.max(a, b - 1)], scale: rscale,
        concurrency: f.concurrency ?? DEFAULT_CONCURRENCY, crf: cfg.crf, audioCodec: 'aac', imageFormat: 'jpeg', jpegQuality: cfg.jq, logLevel: 'error'});
      fs.renameSync(out + '.part.mp4', out);
      x.file = out;
      rendered.push({label: x.s.label, ms: Date.now() - t1, frames: b - a});
    }
    await browser.close({silent: true});
  }
  void timesMs;

  const outFile = f.out ?? path.join(root, 'out/preview', `${story.meta.id}${f.scene ? '-' + ids.join('+') : ''}${f.from !== undefined || f.to !== undefined ? '-ausschnitt' : ''}.mp4`);
  fs.mkdirSync(path.dirname(outFile), {recursive: true});
  const t2 = Date.now();
  if (todo.length === 1) fs.copyFileSync(todo[0].file!, outFile);
  else {
    const list = path.join(tmpDir, 'list.txt');
    fs.writeFileSync(list, todo.map((x) => `file '${x.file}'`).join('\n'));
    // Video unverändert übernehmen, Ton neu verbinden (vermeidet Knackser an AAC-Grenzen)
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', outFile], {encoding: 'utf8'});
    if (r.status !== 0) { console.log('✖ ffmpeg-Zusammenfügen fehlgeschlagen:\n' + r.stderr); return 3; }
  }
  const tConcat = Date.now() - t2;
  fs.rmSync(tmpDir, {recursive: true, force: true});

  const frames = segs.reduce((n, s) => n + (cf(s.b) - cf(s.a)), 0);
  console.log('');
  for (const x of todo) { const r = rendered.find((y) => y.label === x.s.label); console.log(`  ${x.s.label.padEnd(24)} ${r ? `gerendert ${(r.ms / 1000).toFixed(1)} s (${r.frames} Bilder, ${(r.ms / r.frames).toFixed(0)} ms/Bild)` : 'aus Cache (0 s)'}`); }
  console.log(`\n✔ ${path.relative(root, outFile)}  ·  ${frames} Bilder  ·  Gesamt ${((Date.now() - T0) / 1000).toFixed(1)} s (Bundle ${(tBundle / 1000).toFixed(1)} s, Browser+Komposition ${(tBrowser / 1000).toFixed(1)} s, Zusammenfügen ${(tConcat / 1000).toFixed(1)} s)`);
  return 0;
};
