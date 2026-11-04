/**
 * Schritt 5: finaler Export mit verbindlicher Freigabe.
 *   npm run story -- approve <datei> [--confirm <hash>] [--by name] [--note text]   Freigabe erteilen (erst mit --confirm wird geschrieben)
 *   npm run story -- approval <datei>                                                Freigabe-Status
 *   npm run story -- revoke <datei>                                                  Freigabe zurückziehen
 *   npm run story -- render <datei> [--only a,b] [--force] [--concurrency n]         finaler Export 1080×1920, 30 FPS, H.264/AAC
 *
 * Regeln:
 *  - `render` läuft NUR mit gültiger Freigabe (approvals/<story-id>.json). Die Freigabe enthält eine Prüfsumme über den Inhalt der Geschichte
 *    (YAML-Daten mit Standardwerten, Zeitleiste inkl. Wort-Timings, alle benutzten Audiodateien, Renderer-Code). Jede Änderung macht sie ungültig.
 *  - Szenen werden einzeln in finaler Qualität gerendert und nur wiederverwendet, wenn Schlüssel (Inhalt+Code+Einstellungen) identisch ist.
 *  - Der Ton wird aus den Szenenstücken sample-genau zusammengesetzt (jedes Stück auf exakt Bilder/30 s gekürzt bzw. aufgefüllt, einmal AAC-kodiert),
 *    das Video unverändert übernommen. Danach wird die Ausgabe geprüft (Bildzahl, Auflösung, Codecs, Ton-/Bildlänge).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {openBrowser, renderMedia, selectComposition} from '@remotion/renderer';
import {checkStoryFile, type Issue} from '../src/story/validate';
import {buildTimeline, type Timeline} from '../src/story/timeline';
import type {StoryData} from '../src/story/schema';
import {BROWSER_EXE, codeHash, ensureBundle, sceneKey} from './preview';
import {lineState, planVoice} from './voice';
import {assembleSegments, probe} from './assemble';

const sha = (b: Buffer | string) => crypto.createHash('sha256').update(b).digest('hex');
export const FINAL = {width: 1080, height: 1920, fps: 30, crf: 20, jpegQuality: 80};

/** JSON mit sortierten Schlüsseln (stabile Prüfsummen). */
export const canonical = (v: unknown): string =>
  JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));

export type Parts = {story: string; timeline: string; audio: string; code: string};
export type Approval = {
  version: 1; story: string; file: string; contentHash: string; parts: Parts; approvedAt: string; approvedBy: string; note?: string;
  summary: {scenes: number; frames: number; seconds: number; lines: number}; codeHash: string;
};

const fileSha = (root: string, rel: string) => { const f = path.join(root, 'public', rel); return fs.existsSync(f) ? sha(fs.readFileSync(f)).slice(0, 20) : 'fehlt'; };

/** Alle Audiodateien, die das Video benutzt (Sprache, Effekte, Musik). */
export const audioFiles = (story: StoryData, tl: Timeline): {file: string; what: string; kind: 'voice' | 'sfx' | 'music'}[] => {
  const out: {file: string; what: string; kind: 'voice' | 'sfx' | 'music'}[] = [];
  story.scenes.forEach((sc, i) => {
    for (const l of tl.scenes[i].lines) out.push({file: l.file, what: `Sprechzeile ${l.id} (Szene ${sc.id})`, kind: 'voice'});
    for (const s of sc.sfx) out.push({file: `audio/${s.sound}.wav`, what: `Soundeffekt „${s.sound}“ (Szene ${sc.id})`, kind: 'sfx'});
  });
  if (story.audio.music) out.push({file: `audio/${story.audio.music.file}.wav`, what: 'Musik', kind: 'music'});
  return out;
};

export const contentParts = (story: StoryData, tl: Timeline, root: string, code: string = codeHash()): Parts => ({
  code,
  story: sha(canonical(story)),
  timeline: sha(canonical(tl)),
  audio: sha(canonical(Object.fromEntries([...new Set(audioFiles(story, tl).map((a) => a.file))].sort().map((f) => [f, fileSha(root, f)])))),
});
export const contentHash = (p: Parts) => sha(`${p.story}|${p.timeline}|${p.audio}|${p.code}`);

/* ───────────── Prüfung vor Freigabe/Export ───────────── */

export type Preflight = {ok: boolean; problems: string[]; warnings: Issue[]; story?: StoryData; timeline?: Timeline};

export const preflight = (file: string, root: string): Preflight => {
  const problems: string[] = [];
  if (!fs.existsSync(path.resolve(root, file))) return {ok: false, problems: [`Datei nicht gefunden: ${file}`], warnings: []};
  const {loaded, issues} = checkStoryFile(file, root);
  const errs = issues.filter((i) => i.level === 'error');
  for (const e of errs) problems.push(`Konfiguration ungültig – ${e.path}${e.line ? ` (Zeile ${e.line})` : ''}: ${e.message}${e.hint ? ` → ${e.hint}` : ''}`);
  if (!loaded.story) return {ok: false, problems: problems.length ? problems : ['Die Datei konnte nicht gelesen werden.'], warnings: issues.filter((i) => i.level === 'warn')};
  const story = loaded.story;
  const rd = (f: string) => { try { return JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')); } catch { return undefined; } };
  const voices = rd(`src/story/voices/${story.meta.id}.json`);
  const timeline = buildTimeline(story, rd('src/story/timeline.json'), voices);
  const f = story.format;
  if (f.width !== FINAL.width || f.height !== FINAL.height || f.fps !== FINAL.fps) problems.push(`Format ${f.width}×${f.height} @ ${f.fps} FPS – der finale Export ist auf ${FINAL.width}×${FINAL.height} @ ${FINAL.fps} FPS festgelegt (format in der YAML anpassen).`);
  // Audio
  const missing = audioFiles(story, timeline).filter((a) => fileSha(root, a.file) === 'fehlt');
  for (const m of missing) problems.push(`Audiodatei fehlt: public/${m.file} (${m.what})${m.kind === 'voice' ? ` → npm run story -- voice ${file}` : m.kind === 'sfx' ? ' → Datei nach public/audio/ legen oder Effekt entfernen' : ' → Musikdatei nach public/audio/ legen oder audio.music entfernen'}`);
  if (voices) { // Sprache muss zum aktuellen Text/Stimmenprofil passen
    for (const p of planVoice(story, root)) if (lineState(p, voices, root) !== 'aktuell' && !missing.some((m) => m.file === `audio/vo_${p.id}.wav`)) problems.push(`Sprache veraltet: Zeile ${p.id} passt nicht mehr zu Text/Stimmenprofil → npm run story -- voice ${file}`);
  }
  for (const sc of timeline.scenes) for (const l of sc.lines) if (!l.real && !missing.some((m) => m.file === l.file)) problems.push(`Zeile ${l.id}: keine echten Wort-Timings (Untertitel wären nur geschätzt) → npm run story -- voice ${file}`);
  if (spawnSync('ffmpeg', ['-version']).status !== 0 || spawnSync('ffprobe', ['-version']).status !== 0) problems.push('ffmpeg/ffprobe ist nicht installiert (wird zum Zusammenfügen und Prüfen gebraucht).');
  return {ok: problems.length === 0, problems, warnings: issues.filter((i) => i.level === 'warn'), story, timeline};
};

/* ───────────── Freigabe ───────────── */

export const approvalPath = (storyId: string, root: string) => path.join(root, 'approvals', `${storyId}.json`);
export const readApproval = (storyId: string, root: string): Approval | undefined => { try { return JSON.parse(fs.readFileSync(approvalPath(storyId, root), 'utf8')); } catch { return undefined; } };

export type ApprovalStatus = {state: 'fehlt' | 'gültig' | 'ungültig'; reasons: string[]; approval?: Approval; codeChanged: boolean};
export const approvalStatus = (story: StoryData, tl: Timeline, root: string, code: string): ApprovalStatus => {
  const a = readApproval(story.meta.id, root);
  if (!a) return {state: 'fehlt', reasons: ['Für diese Geschichte gibt es keine Freigabe.'], codeChanged: false};
  const cur = contentParts(story, tl, root, code), reasons: string[] = [];
  if (a.version !== 1) reasons.push('Freigabe-Format unbekannt.');
  if (a.parts.story !== cur.story) reasons.push('Die Geschichte (YAML-Inhalt) wurde geändert.');
  if (a.parts.timeline !== cur.timeline) reasons.push('Zeitleiste/Wort-Timings wurden geändert (z. B. Sprache neu erzeugt).');
  if (a.parts.audio !== cur.audio) reasons.push('Audiodateien (Sprache/Effekte/Musik) wurden geändert oder ersetzt.');
  if (a.parts.code !== cur.code) reasons.push('Der Renderer-Code (src/, Konfiguration, Abhängigkeiten) wurde geändert – das Video würde anders aussehen können als freigegeben.');
  if (a.contentHash !== contentHash(cur) && !reasons.length) reasons.push('Prüfsumme stimmt nicht (Freigabedatei verändert?).');
  return {state: reasons.length ? 'ungültig' : 'gültig', reasons, approval: a, codeChanged: false};
};

const out = (...l: string[]) => console.log(l.join('\n'));
const refuse = (title: string, items: string[]) => out(`✖ ${title}`, ...items.map((p) => `  - ${p}`));

export const runApprove = (file: string, f: {confirm?: string; by?: string; note?: string}, root = process.cwd()): number => {
  const pf = preflight(file, root);
  if (!pf.ok || !pf.story || !pf.timeline) { refuse('Freigabe nicht möglich – die Geschichte ist nicht exportierbar:', pf.problems); return 1; }
  const parts = contentParts(pf.story, pf.timeline, root), hash = contentHash(parts), short = hash.slice(0, 8);
  const frames = pf.timeline.totalFrames, lines = pf.timeline.scenes.reduce((n, s) => n + s.lines.length, 0);
  out(`Freigabe für „${pf.story.meta.title}“ (${pf.story.meta.id})`, `  ${pf.story.scenes.length} Szenen · ${lines} Sprechzeilen · ${(frames / pf.story.format.fps).toFixed(1)} s · Inhalts-Prüfsumme ${short}`,
    `  Geprüft: Konfiguration, alle Audiodateien vorhanden, Sprache aktuell, echte Wort-Timings.`);
  if (pf.warnings.length) out(`  ${pf.warnings.length} Hinweis(e) aus der Prüfung (npm run story -- check ${file})`);
  if (f.confirm !== short) {
    out('', f.confirm ? `✖ --confirm ${f.confirm} passt nicht zur Prüfsumme ${short}.` : 'Es wurde noch nichts freigegeben. Nach eigener Durchsicht der Vorschau:',
      `  npm run story -- approve ${file} --confirm ${short}`, '', 'Die Freigabe gilt nur für genau diesen Inhalt; jede Änderung macht sie ungültig.');
    return f.confirm ? 1 : 0;
  }
  const a: Approval = {version: 1, story: pf.story.meta.id, file, contentHash: hash, parts, approvedAt: new Date().toISOString(), approvedBy: f.by ?? os.userInfo().username, note: f.note,
    summary: {scenes: pf.story.scenes.length, frames, seconds: Math.round((frames / pf.story.format.fps) * 10) / 10, lines}, codeHash: codeHash()};
  fs.mkdirSync(path.dirname(approvalPath(a.story, root)), {recursive: true});
  fs.writeFileSync(approvalPath(a.story, root), JSON.stringify(a, null, 2) + '\n');
  out(`✔ Freigegeben: approvals/${a.story}.json (von ${a.approvedBy}). Finaler Export: npm run story -- render ${file}`);
  return 0;
};

export const runApprovalStatus = (file: string, root = process.cwd()): number => {
  const pf = preflight(file, root);
  if (!pf.story || !pf.timeline) { refuse('Status nicht ermittelbar:', pf.problems); return 1; }
  const st = approvalStatus(pf.story, pf.timeline, root, codeHash());
  if (st.state === 'gültig') {
    out(`✔ Freigabe gültig – von ${st.approval!.approvedBy} am ${st.approval!.approvedAt}, Prüfsumme ${st.approval!.contentHash.slice(0, 8)}${st.approval!.note ? `, Notiz: ${st.approval!.note}` : ''}`);
    if (!pf.ok) refuse('Aber der Export ist derzeit blockiert:', pf.problems);
    return pf.ok ? 0 : 1;
  }
  refuse(`Freigabe ${st.state}:`, st.reasons);
  out(`  Neu freigeben (nach Durchsicht): npm run story -- approve ${file}`);
  return 4;
};

export const runRevoke = (file: string, root = process.cwd()): number => {
  const {loaded} = checkStoryFile(file, root);
  const id = loaded.story?.meta.id;
  if (!id) { out('✖ Geschichte nicht lesbar – Freigabe-ID unbekannt.'); return 1; }
  if (!fs.existsSync(approvalPath(id, root))) { out(`Keine Freigabe vorhanden für ${id}.`); return 0; }
  fs.rmSync(approvalPath(id, root));
  out(`✔ Freigabe für ${id} zurückgezogen.`);
  return 0;
};

/* ───────────── Export ───────────── */

export type RenderFlags = {only?: string; force?: boolean; concurrency?: number; testScale?: number; out?: string};

export const runExport = async (file: string, f: RenderFlags, root = process.cwd()): Promise<number> => {
  const T0 = Date.now();
  const pf = preflight(file, root);
  if (!pf.ok || !pf.story || !pf.timeline) { refuse('Export nicht möglich:', pf.problems); return 1; }
  const story = pf.story, tl = pf.timeline;
  const code = codeHash();
  // ── verbindliche Freigabe-Schranke (vor allem anderen; es wird noch nichts gestartet) ──
  const st = approvalStatus(story, tl, root, code);
  if (st.state !== 'gültig') {
    refuse(`Kein finaler Export: Freigabe ${st.state}.`, st.reasons);
    out('', `  Ablauf: Vorschau ansehen → npm run story -- approve ${file}  (zeigt die Prüfsumme) → mit --confirm bestätigen → render.`);
    return 4;
  }
  const test = f.testScale !== undefined;
  const scale = f.testScale ?? 1;
  if (test && (!Number.isInteger(FINAL.width * scale) || !Number.isInteger(FINAL.height * scale))) { out(`✖ --test-scale ${scale} ergibt keine ganzzahlige Auflösung.`); return 1; }
  const ids = f.only ? f.only.split(',') : story.scenes.map((s) => s.id);
  for (const id of ids) if (!story.scenes.some((s) => s.id === id)) { out(`✖ Szene „${id}“ gibt es nicht (vorhanden: ${story.scenes.map((s) => s.id).join(', ')})`); return 1; }

  const cacheDir = path.join(root, test ? 'out/final-test-cache' : 'out/final-cache');
  const outDir = path.join(root, 'out/final');
  fs.mkdirSync(cacheDir, {recursive: true}); fs.mkdirSync(outDir, {recursive: true});
  const cfg = {final: true, width: Math.round(FINAL.width * scale), renderFps: FINAL.fps, crf: FINAL.crf, jq: FINAL.jpegQuality};
  const keys = story.scenes.map((_, i) => sceneKey(story, tl, i, cfg, code));
  const segFile = (i: number) => path.join(cacheDir, `${keys[i]}.mp4`);
  const outFile = f.out ?? path.join(outDir, `${story.meta.id}${test ? '-TEST' : ''}.mp4`);
  const sidecar = outFile.replace(/\.mp4$/, '.json');
  console.log(`Finaler Export „${story.meta.title}“: ${cfg.width}×${Math.round(FINAL.height * scale)} @ ${FINAL.fps} FPS, H.264 (CRF ${FINAL.crf}) + AAC${test ? '  — TECHNIK-TEST (verkleinert, KEIN finales Video)' : ''}`);
  console.log(`Freigabe gültig (${st.approval!.approvedBy}, ${st.approval!.contentHash.slice(0, 8)}) · ${story.scenes.length} Szenen, ${tl.totalFrames} Bilder`);

  if (!f.only && !f.force && fs.existsSync(outFile) && fs.existsSync(sidecar)) {
    try {
      const sc = JSON.parse(fs.readFileSync(sidecar, 'utf8'));
      if (sc.contentHash === st.approval!.contentHash && canonical(sc.keys) === canonical(keys)) { out(`✔ ${path.relative(root, outFile)} ist bereits aktuell (Inhalt, Code und Einstellungen unverändert). Mit --force neu zusammenfügen.`); return 0; }
    } catch { /* neu erzeugen */ }
  }

  const todo = ids.map((id) => story.scenes.findIndex((s) => s.id === id)).filter((i) => f.force ? true : !fs.existsSync(segFile(i)));
  const reuse = ids.length - todo.length;
  console.log(`Szenen: ${todo.length} zu rendern, ${reuse} aus dem Final-Cache wiederverwendet`);
  if (todo.length) {
    const bdir = await ensureBundle(code);
    const browser = await openBrowser('chrome', {browserExecutable: BROWSER_EXE, chromiumOptions: {gl: 'swangle'}});
    try {
      const opts = {serveUrl: bdir, puppeteerInstance: browser, inputProps: {story, timeline: tl}};
      const comp = await selectComposition({...opts, id: 'StoryAny'});
      for (const i of todo) {
        const ts = tl.scenes[i], t1 = Date.now(), tmp = segFile(i) + '.part.mp4';
        process.stdout.write(`  ${story.scenes[i].id.padEnd(14)} ${ts.durationFrames} Bilder … `);
        await renderMedia({...opts, composition: comp, codec: 'h264', outputLocation: tmp, frameRange: [ts.startFrame, ts.startFrame + ts.durationFrames - 1], scale, concurrency: f.concurrency ?? 1,
          crf: FINAL.crf, jpegQuality: FINAL.jpegQuality, imageFormat: 'jpeg', audioCodec: 'aac', logLevel: 'error'});
        const pr = probe(tmp);
        if (!pr.video || Number(pr.video.nb_read_frames) !== ts.durationFrames) { fs.rmSync(tmp, {force: true}); throw new Error(`Szene ${story.scenes[i].id}: ${pr.video?.nb_read_frames ?? 0} statt ${ts.durationFrames} Bildern gerendert.`); }
        fs.renameSync(tmp, segFile(i));
        console.log(`${((Date.now() - t1) / 1000).toFixed(1)} s`);
      }
    } finally { await browser.close({silent: true}); }
  }
  if (f.only) { out(`✔ Teilrendering fertig (${ids.join(', ')} im Cache). Es wurde kein Gesamtvideo zusammengefügt – dazu ohne --only ausführen.`); return 0; }
  const notReady = story.scenes.map((s, i) => ({s, i})).filter(({i}) => !fs.existsSync(segFile(i)));
  if (notReady.length) { refuse('Zusammenfügen nicht möglich – Szenenstücke fehlen:', notReady.map(({s}) => s.id)); return 1; }

  // ── Zusammenfügen: Video unverändert, Ton sample-genau (tools/assemble.ts) ──
  const fin = outFile + '.part.mp4';
  try {
    assembleSegments(story.scenes.map((_, i) => ({file: segFile(i), frames: tl.scenes[i].durationFrames})), FINAL.fps, fin);
    // ── Ausgabe prüfen ──
    const pr = probe(fin), expW = cfg.width, expH = Math.round(FINAL.height * scale);
    const vdur = tl.totalFrames / FINAL.fps, adur = Number(pr.audio?.duration ?? 0);
    const checks: [string, boolean, string][] = [
      ['Video H.264', pr.video?.codec_name === 'h264', String(pr.video?.codec_name)],
      ['Ton AAC', pr.audio?.codec_name === 'aac', String(pr.audio?.codec_name)],
      [`Auflösung ${expW}×${expH}`, pr.video?.width === expW && pr.video?.height === expH, `${pr.video?.width}×${pr.video?.height}`],
      [`Bildzahl ${tl.totalFrames}`, Number(pr.video?.nb_read_frames) === tl.totalFrames, String(pr.video?.nb_read_frames)],
      ['Bildrate 30 FPS', Math.abs(eval(pr.video?.avg_frame_rate ?? '0') - FINAL.fps) < 0.05, String(pr.video?.avg_frame_rate)], // eslint-disable-line no-eval
      [`Ton-/Bildlänge (Soll ${vdur.toFixed(3)} s, Toleranz 0,05 s)`, Math.abs(adur - vdur) <= 0.05, `Ton ${adur.toFixed(3)} s`],
    ];
    for (const [n, ok, v] of checks) console.log(`  ${ok ? '✔' : '✖'} ${n}  (${v})`);
    if (checks.some(([, ok]) => !ok)) { fs.rmSync(fin, {force: true}); out('✖ Ausgabeprüfung fehlgeschlagen – es wurde keine Datei veröffentlicht.'); return 5; }
    fs.mkdirSync(path.dirname(outFile), {recursive: true});
    fs.renameSync(fin, outFile);
    fs.writeFileSync(sidecar, JSON.stringify({story: story.meta.id, contentHash: st.approval!.contentHash, approvedBy: st.approval!.approvedBy, codeHash: code, keys, test, frames: tl.totalFrames, exportedAt: new Date().toISOString()}, null, 1));
  } finally { fs.rmSync(fin, {force: true}); }
  console.log(`\n✔ ${path.relative(root, outFile)}${test ? '  (TECHNIK-TEST, kein finales Video)' : ''}  ·  ${((Date.now() - T0) / 1000).toFixed(1)} s gesamt, ${reuse} Szene(n) aus dem Cache`);
  return 0;
};
