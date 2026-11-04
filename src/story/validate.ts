/**
 * Laden + Validieren einer Story-Datei (YAML/JSON): Schema (zod) + Querprüfungen (Registry, Referenzen, Zeiten, Dateien).
 * Läuft ohne Rendering und ohne Remotion. Alle Meldungen sind deutsch und nennen Pfad, Zeile und – wenn möglich – eine Lösung.
 */
import fs from 'node:fs';
import path from 'node:path';
import {LineCounter, parseDocument, type Document} from 'yaml';
import {Story, parseTime, type ParsedTime, type SceneData, type StoryData} from './schema';
import {ENVIRONMENTS, OBJECTS, RIGS, SETS} from './registry';

export type Issue = {level: 'error' | 'warn'; path: string; line?: number; message: string; hint?: string};

/* ───────────── Hilfen ───────────── */

const lev = (a: string, b: string) => {
  const d = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
const suggest = (word: string, options: string[]) => {
  const best = options.map((o) => [o, lev(word.toLowerCase(), o.toLowerCase())] as const).sort((a, b) => a[1] - b[1])[0];
  return best && best[1] <= Math.max(2, Math.floor(word.length / 3)) ? best[0] : undefined;
};
const didYouMean = (word: string, options: string[]) => {
  const s = suggest(word, options);
  return `${s ? `Meintest du "${s}"? ` : ''}Verfügbar: ${options.join(', ')}`;
};
const fmtPath = (p: ReadonlyArray<PropertyKey>) =>
  p.map((s, i) => (typeof s === 'number' ? `[${s}]` : i ? `.${String(s)}` : String(s))).join('') || '(Wurzel)';

/** Schema entlang eines Pfads ablaufen (für "gültige Felder"-Hinweise). */
const unwrap = (s: any): any => {
  for (let i = 0; i < 10 && s; i++) {
    const t = s.def?.type ?? s._zod?.def?.type;
    const def = s.def ?? s._zod?.def;
    if (['default', 'optional', 'nullable', 'readonly', 'prefault', 'nonoptional'].includes(t)) s = def.innerType;
    else if (t === 'pipe') s = def.in;
    else break;
  }
  return s;
};
const schemaAt = (root: any, p: ReadonlyArray<PropertyKey>): any => {
  let s = unwrap(root);
  for (const seg of p) {
    const def = s?.def ?? s?._zod?.def;
    if (!def) return undefined;
    if (def.type === 'object') s = unwrap(def.shape[seg as string]);
    else if (def.type === 'array') s = unwrap(def.element);
    else if (def.type === 'record') s = unwrap(def.valueType);
    else return undefined;
  }
  return s;
};
const validKeys = (p: ReadonlyArray<PropertyKey>): string[] => {
  const s = schemaAt(Story, p); const def = s?.def ?? s?._zod?.def;
  return def?.type === 'object' ? Object.keys(def.shape) : [];
};

/* ───────────── Laden + Schema ───────────── */

export type Loaded = {story?: StoryData; raw?: unknown; issues: Issue[]; doc?: Document; text: string};

export const loadStory = (file: string): Loaded => {
  const issues: Issue[] = [];
  if (!fs.existsSync(file)) return {issues: [{level: 'error', path: file, message: `Datei nicht gefunden: ${file}`}], text: ''};
  const text = fs.readFileSync(file, 'utf8');
  const lc = new LineCounter();
  const doc = parseDocument(text, {lineCounter: lc, prettyErrors: false});
  const lineOf = (p: ReadonlyArray<PropertyKey>): number | undefined => {
    for (let n = p.length; n >= 0; n--) {
      const node: any = doc.getIn(p.slice(0, n) as (string | number)[], true);
      if (node?.range) return lc.linePos(node.range[0]).line;
    }
    return undefined;
  };
  for (const e of doc.errors) issues.push({level: 'error', path: '(YAML-Syntax)', line: e.pos?.[0] !== undefined ? lc.linePos(e.pos[0]).line : undefined, message: `YAML kann nicht gelesen werden: ${e.message.split('\n')[0]}`,
    hint: 'Prüfe Einrückung (nur Leerzeichen, keine Tabs), Doppelpunkte und Anführungszeichen.'});
  if (doc.errors.length) return {issues, doc, text};

  const raw = doc.toJS();
  const res = Story.safeParse(raw);
  if (!res.success) {
    for (const iss of res.error.issues) issues.push(describeIssue(iss, raw, lineOf));
    return {issues, raw, doc, text};
  }
  return {story: res.data, raw, issues, doc, text};
};

const valueAt = (raw: any, p: ReadonlyArray<PropertyKey>) => p.reduce((o, k) => (o == null ? undefined : o[k as any]), raw);

const describeIssue = (iss: any, raw: unknown, lineOf: (p: ReadonlyArray<PropertyKey>) => number | undefined): Issue => {
  const p: PropertyKey[] = iss.path ?? [];
  iss = {...iss, input: valueAt(raw, p)};
  const where = fmtPath(p);
  const line = lineOf(p);
  const base = {level: 'error' as const, path: where, line};
  const key = String(p[p.length - 1] ?? '');
  switch (iss.code) {
    case 'invalid_type':
      if (iss.input === undefined) return {...base, message: `Pflichtfeld "${key}" fehlt.`, hint: validKeys(p.slice(0, -1)).length ? `Felder an dieser Stelle: ${validKeys(p.slice(0, -1)).join(', ')}` : undefined};
      return {...base, message: `Falscher Typ bei "${key}": erwartet ${typeName(iss.expected)}, gefunden ${describeValue(iss.input)}.`};
    case 'unrecognized_keys': {
      const known = validKeys(p);
      const msgs = (iss.keys as string[]).map((k) => `"${k}"${suggest(k, known) ? ` (meintest du "${suggest(k, known)}"?)` : ''}`);
      return {...base, message: `Unbekannte${iss.keys.length > 1 ? ' Felder' : 's Feld'}: ${msgs.join(', ')}.`, hint: known.length ? `Gültige Felder hier: ${known.join(', ')}` : undefined};
    }
    case 'invalid_value': {
      const vals = (iss.values as unknown[]).map(String);
      return {...base, message: `Ungültiger Wert ${describeValue(iss.input)} bei "${key}".`, hint: typeof iss.input === 'string' ? didYouMean(iss.input, vals) : `Erlaubt: ${vals.join(', ')}`};
    }
    case 'too_small': return {...base, message: iss.origin === 'array' || iss.origin === 'string' ? `"${key}" ist zu kurz/leer (Minimum ${iss.minimum}).` : `Wert bei "${key}" ist zu klein (Minimum ${iss.minimum}), gefunden ${describeValue(iss.input)}.`};
    case 'too_big': return {...base, message: `Wert bei "${key}" ist zu groß (Maximum ${iss.maximum}), gefunden ${describeValue(iss.input)}.`};
    case 'invalid_format': return {...base, message: `Ungültiges Format bei "${key}": ${iss.message}.`};
    default: return {...base, message: iss.message};
  }
};
const typeName = (t: string) => ({string: 'Text', number: 'Zahl', boolean: 'Ja/Nein (true/false)', array: 'Liste', object: 'Block (Unterfelder)', record: 'Block'} as Record<string, string>)[t] ?? t;
const describeValue = (v: unknown) => (v === undefined ? '(nichts)' : typeof v === 'object' ? (Array.isArray(v) ? 'eine Liste' : 'einen Block') : JSON.stringify(v));

/* ───────────── Zeitabschätzung (ohne TTS) ───────────── */

export const CHARS_PER_SEC = 18; // gemessen an den Mondsplitter-Zeilen (Piper Thorsten, lengthScale 1.08)
export type LineTiming = {start: number; end: number; words: number; real: boolean};
export type SceneTiming = {start: number; duration: number; lines: Record<string, LineTiming>};

const estLine = (text: string, gap: number) => {
  const sentences = text.split(/(?<=[.!?])\s+/).length;
  return Math.max(0.8, text.length / CHARS_PER_SEC) + gap * (sentences - 1) * 0.3;
};

/** Szenenzeiten: echte Werte aus src/story/timeline.json, falls Zeile (id+Text) dort identisch existiert; sonst Schätzung. */
export const computeTiming = (story: StoryData, timelineFile?: string): {scenes: Record<string, SceneTiming>; total: number; realLines: number; estLines: number} => {
  const fps = story.format.fps;
  let real: any;
  try { if (timelineFile && fs.existsSync(timelineFile)) real = JSON.parse(fs.readFileSync(timelineFile, 'utf8')); } catch { /* ignorieren */ }
  const realLine = new Map<string, any>();
  const realScene = new Map<string, any>();
  for (const sc of real?.scenes ?? []) { realScene.set(sc.id, sc); for (const l of sc.lines) realLine.set(l.id, l); }
  const out: Record<string, SceneTiming> = {};
  let cursor = 0, realLines = 0, estLines = 0;
  for (const sc of story.scenes) {
    const rs = realScene.get(sc.id);
    const allReal = rs && sc.lines.every((l) => realLine.get(l.id)?.text === l.text);
    let t = sc.timing.pre;
    const lines: Record<string, LineTiming> = {};
    for (const l of sc.lines) {
      const r = allReal ? realLine.get(l.id) : undefined;
      const dur = r ? r.durationFrames / fps : estLine(l.text, 0.24);
      lines[l.id] = {start: r ? (r.startFrame - rs.startFrame) / fps : t, end: 0, words: l.text.split(/\s+/).length, real: !!r};
      lines[l.id].end = lines[l.id].start + dur;
      r ? realLines++ : estLines++;
      t = lines[l.id].end + story.timing.lineGap;
    }
    const duration = sc.lines.length ? t - story.timing.lineGap + sc.timing.post : sc.timing.pre + sc.timing.post;
    out[sc.id] = {start: cursor, duration: allReal ? rs.durationFrames / fps : duration, lines};
    cursor += out[sc.id].duration;
  }
  return {scenes: out, total: cursor, realLines, estLines};
};

/* ───────────── Querprüfungen ───────────── */

export type Options = {audioDir?: string; timelineFile?: string; lineOf?: (p: ReadonlyArray<PropertyKey>) => number | undefined};

const isRef = (v: any): v is {rel?: string; obj?: string} => v && typeof v === 'object' && !Array.isArray(v);

export const validateSemantics = (story: StoryData, opts: Options = {}): {issues: Issue[]; timing: ReturnType<typeof computeTiming>} => {
  const issues: Issue[] = [];
  const err = (path: string, message: string, hint?: string) => issues.push({level: 'error', path, message, hint});
  const warn = (path: string, message: string, hint?: string) => issues.push({level: 'warn', path, message, hint});
  const timing = computeTiming(story, opts.timelineFile);
  const fps = story.format.fps;

  const audioFiles = opts.audioDir && fs.existsSync(opts.audioDir)
    ? fs.readdirSync(opts.audioDir).filter((f) => f.endsWith('.wav') && !f.startsWith('vo_')).map((f) => f.replace(/\.wav$/, '')) : undefined;
  const castIds = Object.keys(story.cast), voiceIds = Object.keys(story.voices);

  /* Besetzung */
  for (const [id, c] of Object.entries(story.cast)) {
    const rig = RIGS[c.rig];
    if (!rig) err(`cast.${id}.rig`, `Unbekannte Figurenart "${c.rig}".`, didYouMean(c.rig, Object.keys(RIGS)));
    else if (rig.status === 'planned') warn(`cast.${id}.rig`, `Figurenart "${c.rig}" ist reserviert, aber noch nicht gebaut (Schritt 2+).`, 'Das Schema akzeptiert sie; gerendert werden kann sie erst nach der Umsetzung.');
    if (c.voice && !story.voices[c.voice]) err(`cast.${id}.voice`, `Stimmenprofil "${c.voice}" existiert nicht.`, didYouMean(c.voice, voiceIds));
    if (c.look) warn(`cast.${id}.look`, 'Aussehen (look) wird erst in Schritt 2 ausgewertet und hat bis dahin keine Wirkung.');
  }
  if (story.pronunciations) warn('pronunciations', 'Aussprache-Wörterbuch wird erst in Schritt 3 (TTS-Pipeline) ausgewertet.');

  /* Audio */
  const mu = story.audio.music;
  if (mu && audioFiles && !audioFiles.includes(mu.file)) err('audio.music.file', `Musikdatei "${mu.file}.wav" nicht in public/audio gefunden.`, didYouMean(mu.file, audioFiles));

  /* Eindeutige IDs */
  const seenScene = new Set<string>(), seenLine = new Map<string, string>();
  story.scenes.forEach((sc, si) => {
    const P = `scenes[${si}]`;
    if (seenScene.has(sc.id)) err(`${P}.id`, `Szenen-ID "${sc.id}" kommt doppelt vor.`);
    seenScene.add(sc.id);
    const st = timing.scenes[sc.id];

    sc.lines.forEach((l, li) => {
      if (seenLine.has(l.id)) err(`${P}.lines[${li}].id`, `Zeilen-ID "${l.id}" kommt doppelt vor (bereits in Szene "${seenLine.get(l.id)}").`, 'Zeilen-IDs müssen in der ganzen Geschichte eindeutig sein (sie benennen die Audiodateien).');
      seenLine.set(l.id, sc.id);
      const c = story.cast[l.who];
      if (!c) err(`${P}.lines[${li}].who`, `Sprecher "${l.who}" steht nicht in "cast".`, didYouMean(l.who, castIds));
      else if (!c.voice) err(`${P}.lines[${li}].who`, `Figur "${l.who}" hat keine Stimme (cast.${l.who}.voice fehlt).`);
      else if (!sc.actors.some((a) => a.cast === l.who)) warn(`${P}.lines[${li}].who`, `"${l.who}" spricht, kommt in dieser Szene aber nicht als Figur (actors) vor – nur Off-Stimme, kein Mundbewegen.`);
      if (l.text.length > 140) warn(`${P}.lines[${li}].text`, `Sehr lange Zeile (${l.text.length} Zeichen) – Untertitel und Takt wirken besser mit kürzeren Sätzen.`);
      if (/\d/.test(l.text)) warn(`${P}.lines[${li}].text`, 'Ziffern im Text: Die Sprachausgabe liest sie evtl. unnatürlich. Besser ausschreiben ("tausend" statt "1000").');
    });
    if (!sc.lines.length && sc.timing.pre + sc.timing.post < 1) warn(`${P}.timing`, 'Szene ohne Sprache und kürzer als 1 s – sie hätte kaum Länge.', 'Erhöhe timing.pre/post oder füge Zeilen hinzu.');

    /* Zeit-Auflösung für Reihenfolgeprüfung */
    const toSec = (v: number | string, where: string): number | undefined => {
      const pt = parseTime(v) as ParsedTime | null;
      if (!pt) return undefined;
      const u = (x: {value: number; unit: 's' | 'f'}) => (x.unit === 'f' ? x.value / fps : x.value);
      if (pt.kind === 'abs') return u(pt);
      if (pt.ref === 'scene') return (pt.point === 'start' ? 0 : st.duration) + u(pt.offset);
      const lt = st.lines[pt.ref];
      const errw = (m: string, h?: string) => { if (where) err(where, m, h); };
      if (!lt) {
        const other = seenLine.get(pt.ref) ?? story.scenes.find((s) => s.lines.some((l) => l.id === pt.ref))?.id;
        errw(other ? `Anker "${pt.ref}" gehört zu Szene "${other}", nicht zu dieser Szene ("${sc.id}").` : `Anker verweist auf unbekannte Zeile "${pt.ref}".`,
          `Zeilen dieser Szene: ${Object.keys(st.lines).join(', ') || '(keine)'}`);
        return undefined;
      }
      if (typeof pt.point === 'object') {
        const w = pt.point.word;
        if (w < 1 || w > lt.words) { errw(`Wort-Anker "${pt.ref}.word${w}": die Zeile hat nur ${lt.words} Wörter (zählt ab 1).`); return undefined; }
        return lt.start + ((lt.end - lt.start) * (w - 1)) / lt.words + u(pt.offset);
      }
      return (pt.point === 'start' ? lt.start : lt.end) + u(pt.offset);
    };
    const times = (list: {t?: any}[] | undefined, where: string, label: string) => {
      if (!list) return;
      let prev = -Infinity;
      list.forEach((k, i) => {
        const s = toSec(k.t, `${where}[${i}].t`);
        if (s === undefined) return;
        if (s < prev - 1e-6) warn(`${where}[${i}].t`, `${label}: Keyframes nicht in zeitlicher Reihenfolge (${s.toFixed(2)} s liegt vor dem vorigen).`, 'Wird in Schritt 2 sortiert, ist aber meist ein Tippfehler.');
        if (s > st.duration + 0.5) warn(`${where}[${i}].t`, `${label}: Zeit ${s.toFixed(2)} s liegt nach dem (geschätzten) Szenenende ${st.duration.toFixed(2)} s.`);
        prev = Math.max(prev, s);
      });
    };
    const checkTime = (v: any, where: string) => { if (v !== undefined) { const s = toSec(v, where); if (s !== undefined && s > st.duration + 0.5) warn(where, `Zeit ${s.toFixed(2)} s liegt nach dem (geschätzten) Szenenende ${st.duration.toFixed(2)} s.`); } };

    /* Referenzen auf Figuren/Objekte */
    const actorIds = sc.actors.map((a) => a.id), objIds = sc.objects.map((o) => o.id).filter(Boolean) as string[];
    const checkVec = (v: any, where: string) => {
      if (!isRef(v)) return;
      if (v.rel !== undefined) { const base = v.rel.split('.')[0]; if (!actorIds.includes(base)) err(where, `Verweis auf Figur "${v.rel}" – in dieser Szene gibt es keine Figur mit dieser ID.`, didYouMean(base, actorIds)); }
      if (v.obj !== undefined && !objIds.includes(v.obj)) err(where, `Verweis auf Objekt "${v.obj}" – in dieser Szene gibt es kein Objekt mit dieser ID.`, objIds.length ? didYouMean(v.obj, objIds) : 'Gib dem Objekt eine "id".');
    };

    /* Kulisse / Himmel */
    const set = SETS[sc.set.type];
    if (!set) err(`${P}.set.type`, `Unbekannte Kulisse "${sc.set.type}".`, didYouMean(sc.set.type, Object.keys(SETS)));
    else {
      if (set.status === 'planned') warn(`${P}.set.type`, `Kulisse "${sc.set.type}" ist reserviert, aber noch nicht gebaut (Schritt 2+).`);
      checkParams(sc.set.params, set.params, `${P}.set.params`, `Kulisse "${sc.set.type}"`, err, warn);
      for (const tn of Object.keys(sc.set.tracks ?? {})) if (!set.tracks.includes(tn)) err(`${P}.set.tracks.${tn}`, `Kulisse "${sc.set.type}" hat keinen Verlauf "${tn}".`, didYouMean(tn, set.tracks.length ? set.tracks : ['(keine)']));
    }
    if (sc.environment && !ENVIRONMENTS[sc.environment.type]) err(`${P}.environment.type`, `Unbekannter Himmel "${sc.environment.type}".`, didYouMean(sc.environment.type, Object.keys(ENVIRONMENTS)));

    /* Figuren */
    const seenActor = new Set<string>();
    sc.actors.forEach((a, ai) => {
      const AP = `${P}.actors[${ai}]`;
      if (seenActor.has(a.id)) err(`${AP}.id`, `Figuren-ID "${a.id}" kommt in der Szene doppelt vor.`);
      seenActor.add(a.id);
      const member = story.cast[a.cast];
      if (!member) { err(`${AP}.cast`, `"${a.cast}" steht nicht in "cast".`, didYouMean(a.cast, castIds)); return; }
      const rig = RIGS[member.rig];
      if (!a.at && !a.path) err(AP, `Figur "${a.id}" braucht eine Position: "at: [x, y, z]" oder "path".`);
      if (a.at && a.path) warn(AP, `Figur "${a.id}" hat "at" und "path" – "path" gewinnt.`);
      if (rig) {
        const names = (v: any, key: string) => (v === undefined ? [] : typeof v === 'string' ? [[v, ''] as const] : v.map((k: any, i: number) => [k[key], `[${i}].${key}`] as const));
        const checkNames = (field: 'pose' | 'face' | 'prop', valid: string[], label: string) => {
          for (const [n, sub] of names((a as any)[field], field)) {
            if (!valid.includes(n)) err(`${AP}.${field}${sub}`, `${label} "${n}" gibt es für die Figurenart "${member.rig}" nicht.`, valid.length ? didYouMean(n, valid) : `"${member.rig}" unterstützt kein "${field}".`);
          }
        };
        checkNames('pose', rig.poses, 'Pose'); checkNames('face', rig.faces, 'Gesichtsausdruck'); checkNames('prop', rig.props, 'Gegenstand');
        checkParams(a.params, rig.params, `${AP}.params`, `Figurenart "${member.rig}"`, err, warn);
        for (const tn of Object.keys(a.tracks ?? {})) if (!rig.tracks.includes(tn)) err(`${AP}.tracks.${tn}`, `Figurenart "${member.rig}" hat keinen Verlauf "${tn}".`, rig.tracks.length ? didYouMean(tn, rig.tracks) : `"${member.rig}" hat keine animierbaren Parameter.`);
      }
      times(typeof a.pose === 'object' ? a.pose : undefined, `${AP}.pose`, 'Pose');
      times(typeof a.face === 'object' ? a.face : undefined, `${AP}.face`, 'Gesicht');
      times(typeof a.prop === 'object' ? a.prop : undefined, `${AP}.prop`, 'Gegenstand');
      times(a.path, `${AP}.path`, 'Bewegung');
      for (const [tn, ks] of Object.entries(a.tracks ?? {})) times(ks, `${AP}.tracks.${tn}`, `Verlauf ${tn}`);
      checkTime(a.visible?.from, `${AP}.visible.from`); checkTime(a.visible?.to, `${AP}.visible.to`);
    });

    /* Objekte */
    const seenObj = new Set<string>();
    sc.objects.forEach((o, oi) => {
      const OP = `${P}.objects[${oi}]`;
      if (o.id) { if (seenObj.has(o.id)) err(`${OP}.id`, `Objekt-ID "${o.id}" kommt in der Szene doppelt vor.`); seenObj.add(o.id); }
      const def = OBJECTS[o.type];
      if (!def) { err(`${OP}.type`, `Unbekannter Objekttyp "${o.type}".`, didYouMean(o.type, Object.keys(OBJECTS))); return; }
      if (def.status === 'planned') warn(`${OP}.type`, `Objekttyp "${o.type}" ist reserviert, aber noch nicht gebaut.`);
      checkParams(o.params, def.params, `${OP}.params`, `Objekttyp "${o.type}"`, err, warn);
      for (const tn of Object.keys(o.tracks ?? {})) if (!def.tracks.includes(tn)) err(`${OP}.tracks.${tn}`, `Objekttyp "${o.type}" hat keinen Verlauf "${tn}".`, def.tracks.length ? didYouMean(tn, def.tracks) : undefined);
      if (o.path && !def.usesPath) warn(`${OP}.path`, `Objekttyp "${o.type}" wertet "path" nicht aus.`);
      checkVec(o.at, `${OP}.at`);
      for (const k of Object.values(o.params ?? {})) checkVec(k, `${OP}.params`);
      times(o.path, `${OP}.path`, 'Bewegung');
      checkTime(o.visible?.from, `${OP}.visible.from`); checkTime(o.visible?.to, `${OP}.visible.to`);
    });

    /* Kamera */
    const cam = sc.camera;
    if (cam.preset) warn(`${P}.camera.preset`, 'Kamera-Presets werden erst in Schritt 2 umgesetzt; bis dahin "keys"/"orbits" nutzen.');
    cam.keys.forEach((k, i) => { checkVec(k.pos, `${P}.camera.keys[${i}].pos`); checkVec(k.look, `${P}.camera.keys[${i}].look`); });
    cam.orbits.forEach((o, i) => { toSec(o.from, `${P}.camera.orbits[${i}].from`); toSec(o.to, `${P}.camera.orbits[${i}].to`); o.look.forEach((v, j) => checkVec(v, `${P}.camera.orbits[${i}].look[${j}]`)); });
    times(cam.keys, `${P}.camera.keys`, 'Kamera');
    const firstT = Math.min(...[...cam.keys.map((k) => toSec(k.t, '')), ...cam.orbits.map((o) => toSec(o.from, ''))].filter((x): x is number => x !== undefined));
    if (Number.isFinite(firstT) && firstT > 0.2) warn(`${P}.camera`, `Erster Kamerapunkt erst bei ${firstT.toFixed(2)} s – davor bleibt die Kamera an diesem Punkt stehen.`, 'Meist soll der erste Key bei t: 0 liegen.');
    cam.shake.forEach((s, i) => { checkTime(s.from, `${P}.camera.shake[${i}].from`); checkTime(s.to, `${P}.camera.shake[${i}].to`); });
    checkVec(sc.light.key.shadowAt, `${P}.light.key.shadowAt`);

    /* Soundeffekte */
    sc.sfx.forEach((s, i) => {
      const SP = `${P}.sfx[${i}]`;
      if (audioFiles && !audioFiles.includes(s.sound)) err(`${SP}.sound`, `Soundeffekt "${s.sound}" nicht in public/audio gefunden.`, didYouMean(s.sound, audioFiles));
      checkTime(s.at, `${SP}.at`);
    });

    /* Einblendungen */
    sc.captions.forEach((c, i) => {
      const CP = `${P}.captions[${i}]`;
      const a = toSec(c.from, `${CP}.from`);
      if (c.type === 'lower_third') { const b = toSec(c.to, `${CP}.to`); if (a !== undefined && b !== undefined && b <= a) err(CP, 'Namensschild: "to" liegt vor oder bei "from".'); }
    });
  });

  /* Gesamtdauer */
  const td = story.meta.targetDuration;
  if (td) {
    if (timing.total < td.min) warn('meta.targetDuration', `Geschätzte Länge ${timing.total.toFixed(1)} s liegt unter dem Minimum ${td.min} s.`, 'Mehr/längere Zeilen oder größere timing.pre/post.');
    if (timing.total > td.max) warn('meta.targetDuration', `Geschätzte Länge ${timing.total.toFixed(1)} s liegt über dem Maximum ${td.max} s.`);
  }
  return {issues, timing};
};

type ErrFn = (p: string, m: string, h?: string) => void;
const checkParams = (given: Record<string, any> | undefined, allowed: Record<string, string>, where: string, label: string, err: ErrFn, warn: ErrFn) => {
  for (const [k, v] of Object.entries(given ?? {})) {
    const type = allowed[k];
    if (!type) { err(`${where}.${k}`, `${label} kennt den Parameter "${k}" nicht.`, Object.keys(allowed).length ? didYouMean(k, Object.keys(allowed)) : `${label} hat keine Parameter.`); continue; }
    const ok = type === 'any' ? true : type === 'number' ? typeof v === 'number' : type === 'boolean' ? typeof v === 'boolean'
      : type === 'string' ? typeof v === 'string' : type === 'color' ? typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)
      : type === 'vec3' ? Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'number') : true;
    if (!ok) err(`${where}.${k}`, `Parameter "${k}" von ${label}: erwartet ${({number: 'Zahl', boolean: 'true/false', string: 'Text', color: 'Farbe "#rrggbb"', vec3: '[x, y, z]'} as any)[type]}, gefunden ${JSON.stringify(v)}.`);
  }
  void warn;
};

/** Alles in einem: laden → Schema → Querprüfungen. */
export const checkStoryFile = (file: string, root = process.cwd()): {loaded: Loaded; issues: Issue[]; timing?: ReturnType<typeof computeTiming>} => {
  const loaded = loadStory(file);
  const issues = [...loaded.issues];
  if (!loaded.story) return {loaded, issues};
  const lc = new LineCounter();
  const doc = parseDocument(loaded.text, {lineCounter: lc});
  const lineOf = (p: string) => {
    const segs = [...p.matchAll(/([A-Za-z_][\w-]*)|\[(\d+)\]/g)].map((m) => (m[2] !== undefined ? Number(m[2]) : m[1]));
    for (let n = segs.length; n >= 0; n--) { const node: any = doc.getIn(segs.slice(0, n) as (string | number)[], true); if (node?.range) return lc.linePos(node.range[0]).line; }
    return undefined;
  };
  const sem = validateSemantics(loaded.story, {audioDir: path.join(root, 'public/audio'), timelineFile: path.join(root, 'src/story/timeline.json')});
  for (const i of sem.issues) issues.push({...i, line: lineOf(i.path)});
  return {loaded, issues, timing: sem.timing};
};
