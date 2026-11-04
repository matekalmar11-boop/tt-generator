/**
 * Schritt 3: automatische Spracherzeugung aus der YAML.  npm run story -- voice <datei> [--check] [--force] [--line <id>]
 *   - plant pro Sprechzeile Stimme, Text (mit Aussprachehilfe) und Prüfsumme,
 *   - erzeugt nur geänderte/fehlende Zeilen (Cache), über tts/yaml_tts.py (Piper, offline, kostenlos),
 *   - schreibt public/audio/vo_<zeilen-id>.wav, src/story/voices/<story-id>.json (echte Wort-Timings, Mund-Hüllkurve)
 *     und aktualisiert src/story/audioManifest.json.
 * Fehlen Python-Umgebung, Piper-Modell oder ffmpeg, wird NICHTS erzeugt (keine stummen Platzhalter): es gibt eine genaue Liste, was fehlt.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import type {StoryData} from '../src/story/schema';
import {checkStoryFile} from '../src/story/validate';

export const PIPELINE_VERSION = 4; // bei Änderungen an yaml_tts.py (Klang/Timing) erhöhen → alles wird neu erzeugt
export type VoiceProfile = StoryData['voices'][string];
export type Unit = {display: string; spoken: string};
export type PlanLine = {id: string; scene: string; voiceId: string; profile: VoiceProfile; units: Unit[]; hash: string; model: string};
export type StoredLine = {hash: string; text: string; voice: string; file: string; wavSha: string; seconds: number; timingMode: string; words: {w: string; start: number; end: number}[]; env: number[]; phonemes?: [number, number, string][]};
export type StoredVoices = {version: number; story: string; fps: number; lines: Record<string, StoredLine>};

const sha = (b: Buffer | string) => crypto.createHash('sha256').update(b).digest('hex');
const rootDir = process.cwd();

/** Piper-Modell suchen: tts/models/<name>/<name>.onnx oder tts/models/vits-piper-<name>/<name>.onnx */
export const findModel = (model: string, root = rootDir): string | undefined => {
  for (const d of [model, `vits-piper-${model}`]) {
    const f = path.join(root, 'tts/models', d, `${model}.onnx`);
    if (fs.existsSync(f) && fs.existsSync(`${f}.json`)) return f;
  }
  return undefined;
};

/** Aussprachehilfe: ersetzt ganze Wörter (Satzzeichen bleiben) nur für die Sprache – Untertitel behalten den Originaltext. */
export const toUnits = (text: string, pron: Record<string, string> | undefined): Unit[] =>
  text.split(/\s+/).filter(Boolean).map((tok) => {
    const m = /^([(„"»]*)(.*?)([.,!?:;)“"«]*)$/.exec(tok)!;
    const rep = pron?.[m[2]];
    return {display: tok, spoken: rep !== undefined ? `${m[1]}${rep}${m[3]}` : tok};
  });

export const profileKey = (p: VoiceProfile) => ({
  engine: p.engine, model: p.model, lengthScale: p.lengthScale, noiseScale: p.noiseScale, noiseW: p.noiseW,
  sentenceGap: p.sentenceGap, loudness: p.loudness, effect: p.effect ?? null,
});

export const planVoice = (story: StoryData, root = rootDir): PlanLine[] => {
  const out: PlanLine[] = [];
  for (const sc of story.scenes) for (const l of sc.lines) {
    const voiceId = story.cast[l.who]?.voice;
    if (!voiceId) continue;
    const profile = story.voices[voiceId];
    const units = toUnits(l.text, story.pronunciations);
    const hash = sha(JSON.stringify({v: PIPELINE_VERSION, profile: profileKey(profile), units: units.map((u) => u.spoken), fps: story.format.fps})).slice(0, 20);
    out.push({id: l.id, scene: sc.id, voiceId, profile, units, hash, model: profile.model});
  }
  return out;
};

export const voicesFile = (storyId: string, root = rootDir) => path.join(root, 'src/story/voices', `${storyId}.json`);
export const readVoices = (storyId: string, root = rootDir): StoredVoices | undefined => {
  try { return JSON.parse(fs.readFileSync(voicesFile(storyId, root), 'utf8')); } catch { return undefined; }
};

export type LineState = 'aktuell' | 'aus Cache' | 'neu erzeugen';
/** Entscheidet je Zeile: Datei+Eintrag stimmen (aktuell) / Cache-WAV vorhanden / muss neu erzeugt werden. */
export const lineState = (pl: PlanLine, stored: StoredVoices | undefined, root = rootDir, force = false): LineState => {
  if (force) return 'neu erzeugen';
  const wav = path.join(root, 'public/audio', `vo_${pl.id}.wav`);
  const e = stored?.lines[pl.id];
  if (e && e.hash === pl.hash && fs.existsSync(wav) && sha(fs.readFileSync(wav)) === e.wavSha) return 'aktuell';
  if (fs.existsSync(path.join(root, 'tts/cache/wav', `${pl.hash}.wav`)) && fs.existsSync(path.join(root, 'tts/cache/meta', `${pl.hash}.json`))) return 'aus Cache';
  return 'neu erzeugen';
};

export const SETUP_HELP = [
  'Einrichtung (einmalig, kostenlos, offline nutzbar):',
  '  npm run tts:setup        # legt tts/.venv an, installiert piper-tts + numpy + onnx, lädt das Modell de_DE-thorsten-medium (CC0)',
  '  oder von Hand: python3 -m venv tts/.venv && tts/.venv/bin/pip install piper-tts numpy onnx',
  '                 Modell "vits-piper-de_DE-thorsten-medium" aus dem sherpa-onnx-Release "tts-models" nach tts/models/ entpacken',
  '  ffmpeg muss installiert sein (Lautheit/Effekte).',
].join('\n');

export type Env = {python?: string; missing: string[]};
export const checkEnv = (plan: PlanLine[], root = rootDir): Env => {
  const missing: string[] = [];
  const py = process.env.TTS_PYTHON ?? path.join(root, 'tts/.venv/bin/python');
  let python: string | undefined;
  if (!fs.existsSync(py)) missing.push(`Python-Umgebung ${path.relative(root, py)} fehlt`);
  else {
    const r = spawnSync(py, ['-c', 'import piper, numpy, onnx'], {encoding: 'utf8'});
    if (r.status !== 0) missing.push(`Python-Pakete fehlen (piper-tts, numpy, onnx): ${(r.stderr || '').trim().split('\n').pop()}`);
    else python = py;
  }
  if (spawnSync('ffmpeg', ['-version']).status !== 0) missing.push('ffmpeg ist nicht installiert');
  for (const m of new Set(plan.map((p) => p.model))) if (!findModel(m, root)) missing.push(`Piper-Modell "${m}" fehlt (erwartet tts/models/${m}/${m}.onnx + .onnx.json oder tts/models/vits-piper-${m}/…)`);
  return {python, missing};
};

export type VoiceFlags = {check?: boolean; force?: boolean; line?: string; json?: boolean};
export const runVoice = (file: string, flags: VoiceFlags, writeManifest: () => void, root = rootDir): number => {
  const {loaded, issues} = checkStoryFile(file, root);
  const errs = issues.filter((i) => i.level === 'error');
  if (errs.length || !loaded.story) { console.log(`✖ ${file} hat ${errs.length} Fehler – zuerst "story check" beheben.`); return 1; }
  const story = loaded.story;
  let plan = planVoice(story, root);
  if (flags.line) {
    plan = plan.filter((p) => p.id === flags.line);
    if (!plan.length) { console.log(`✖ Zeile "${flags.line}" gibt es nicht (oder ihre Figur hat keine Stimme).`); return 1; }
  }
  const stored = readVoices(story.meta.id, root);
  const states = plan.map((p) => ({p, s: lineState(p, stored, root, flags.force)}));
  console.log(`Sprache für „${story.meta.title}“ (${plan.length} Zeilen, Stimmen: ${[...new Set(plan.map((p) => p.voiceId))].join(', ')})`);
  for (const {p, s} of states) console.log(`  ${p.id.padEnd(6)} ${p.voiceId.padEnd(10)} ${s.padEnd(13)} ${p.units.map((u) => u.display).join(' ').slice(0, 56)}`);
  const todo = states.filter((x) => x.s === 'neu erzeugen');
  const env = checkEnv(todo.map((x) => x.p), root);
  if (flags.check) {
    console.log(`\n${todo.length} Zeile(n) müssten neu erzeugt werden.`);
    if (todo.length && env.missing.length) console.log(`\n✖ Voraussetzungen fehlen:\n${env.missing.map((m) => `  - ${m}`).join('\n')}\n\n${SETUP_HELP}`);
    else if (todo.length) console.log('✔ Voraussetzungen vorhanden – "story voice <datei>" erzeugt die Zeilen.');
    return todo.length && env.missing.length ? 2 : 0;
  }
  if (todo.length && !env.python || (todo.length && env.missing.length)) {
    console.log(`\n✖ Es wurde NICHTS erzeugt – Voraussetzungen fehlen:\n${env.missing.map((m) => `  - ${m}`).join('\n')}\n\n${SETUP_HELP}`);
    return 2;
  }

  const audioDir = path.join(root, 'public/audio');
  fs.mkdirSync(audioDir, {recursive: true});
  fs.mkdirSync(path.join(root, 'tts/cache/wav'), {recursive: true});
  fs.mkdirSync(path.join(root, 'tts/cache/meta'), {recursive: true});
  const next: StoredVoices = {version: PIPELINE_VERSION, story: story.meta.id, fps: story.format.fps, lines: {...(stored?.lines ?? {})}};

  if (todo.length) { // nur die Zeilen, für die es keinen Cache-Treffer gibt, gehen an Piper
    const fresh = todo.filter((x) => !fs.existsSync(path.join(root, 'tts/cache/wav', `${x.p.hash}.wav`)) || flags.force);
    if (fresh.length) {
      const tmp = fs.mkdtempSync(path.join(root, 'tts/cache/job-'));
      const job = {fps: story.format.fps, outDir: tmp, lines: fresh.map(({p}) => ({id: p.id, hash: p.hash, units: p.units, model: findModel(p.model, root), profile: profileKey(p.profile)}))};
      fs.writeFileSync(path.join(tmp, 'job.json'), JSON.stringify(job, null, 1));
      const worker = process.env.TTS_WORKER ?? path.join(root, 'tts/yaml_tts.py');
      console.log(`\nErzeuge ${fresh.length} Zeile(n) mit Piper …`);
      const r = spawnSync(env.python!, [worker, path.join(tmp, 'job.json')], {stdio: ['ignore', 'inherit', 'inherit']});
      if (r.status !== 0) { console.log(`✖ Spracherzeugung fehlgeschlagen (Exit ${r.status}); Arbeitsordner ${path.relative(root, tmp)} bleibt zur Fehlersuche erhalten.`); return 3; }
      const res = JSON.parse(fs.readFileSync(path.join(tmp, 'result.json'), 'utf8')) as Record<string, Omit<StoredLine, 'hash' | 'text' | 'voice' | 'file' | 'wavSha'>>;
      for (const {p} of fresh) {
        const wavTmp = path.join(tmp, `vo_${p.id}.wav`);
        if (!res[p.id] || !fs.existsSync(wavTmp)) { console.log(`✖ Worker lieferte keine Datei für Zeile ${p.id}.`); return 3; }
        fs.copyFileSync(wavTmp, path.join(root, 'tts/cache/wav', `${p.hash}.wav`));
        fs.writeFileSync(path.join(root, 'tts/cache/meta', `${p.hash}.json`), JSON.stringify(res[p.id]));
      }
      fs.rmSync(tmp, {recursive: true, force: true});
    }
  }
  for (const {p, s} of states) {
    if (s === 'aktuell') continue;
    const wav = fs.readFileSync(path.join(root, 'tts/cache/wav', `${p.hash}.wav`));
    fs.writeFileSync(path.join(audioDir, `vo_${p.id}.wav`), wav);
    const meta = JSON.parse(fs.readFileSync(path.join(root, 'tts/cache/meta', `${p.hash}.json`), 'utf8'));
    next.lines[p.id] = {hash: p.hash, text: p.units.map((u) => u.display).join(' '), voice: p.voiceId, file: `audio/vo_${p.id}.wav`, wavSha: sha(wav), ...meta};
  }
  // Zeilen, die es in der Geschichte nicht mehr gibt, aus dem Eintrag entfernen
  if (!flags.line) { const ids = new Set(plan.map((p) => p.id)); for (const id of Object.keys(next.lines)) if (!ids.has(id)) delete next.lines[id]; }
  fs.mkdirSync(path.dirname(voicesFile(story.meta.id, root)), {recursive: true});
  fs.writeFileSync(voicesFile(story.meta.id, root), JSON.stringify(next, null, 1) + '\n');
  writeManifest();
  const n = {gen: states.filter((x) => x.s === 'neu erzeugen').length, cache: states.filter((x) => x.s === 'aus Cache').length, ok: states.filter((x) => x.s === 'aktuell').length};
  console.log(`\n✔ ${n.gen} neu erzeugt, ${n.cache} aus Cache übernommen, ${n.ok} unverändert · ${path.relative(root, voicesFile(story.meta.id, root))} + audioManifest.json aktualisiert`);
  return 0;
};
