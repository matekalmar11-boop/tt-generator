/**
 * Auflösung der YAML-Daten zur Laufzeit (Schritt 2): Zeiten/Anker → Frames, Keyframe-Verläufe, Verweise ({rel}/{obj}),
 * Kamerapfad. Reine Funktionen ohne React – dadurch ohne Rendering testbar (tools/test-resolve.ts).
 * Frames sind immer SZENEN-lokal (0 = erster Frame der Szene).
 */
import {ease, lerp, lerp3, orbit, shake, type EaseName, type V3} from '../lib/anim';
import {parseAngle, parseTime, type VecRef} from './schema';
import type {SceneData} from './schema';

export type LineClock = {start: number; end: number; words: {start: number; end: number}[]};
/** Zeitbasis einer Szene in Frames: Länge + Lage der Sprechzeilen (aus der TTS-Timeline). */
export type Clock = {fps: number; durationFrames: number; lines: Record<string, LineClock>};

export class StoryError extends Error {}

/** Zeitangabe ("40f", 1.5, "l06.start+22f", "l06.word2+0.1s", "scene.end-2f") → Frames. */
export const toFrames = (v: unknown, c: Clock): number => {
  const p = parseTime(v);
  if (!p) throw new StoryError(`Ungültige Zeitangabe ${JSON.stringify(v)}`);
  if (p.kind === 'abs') return p.unit === 'f' ? p.value : p.value * c.fps;
  const off = p.offset.unit === 'f' ? p.offset.value : p.offset.value * c.fps;
  if (p.ref === 'scene') {
    if (p.point === 'start') return off;
    if (p.point === 'end') return c.durationFrames + off;
    throw new StoryError(`"scene" kennt keine Wort-Anker: ${JSON.stringify(v)}`);
  }
  const line = c.lines[p.ref];
  if (!line) throw new StoryError(`Anker "${p.ref}" ist keine Sprechzeile dieser Szene (${JSON.stringify(v)})`);
  if (p.point === 'start') return line.start + off;
  if (p.point === 'end') return line.end + off;
  const w = line.words[p.point.word - 1];
  if (!w) throw new StoryError(`Zeile "${p.ref}" hat kein Wort ${p.point.word} (${JSON.stringify(v)})`);
  return w.start + off;
};

export const angle = (v: unknown): number => {
  const a = parseAngle(v);
  if (a === null) throw new StoryError(`Ungültiger Winkel ${JSON.stringify(v)}`);
  return a;
};

/* ───────────── Keyframe-Verläufe ───────────── */

/** Easing inkl. hartem Sprung ("cut": 0 bis zum Zielkey, dann 1). */
export const easeK = (name: string | undefined, p: number, dflt: EaseName): number => {
  if (name === 'cut') return p >= 1 ? 1 : 0;
  return ease((name ?? dflt) as EaseName, p);
};

type Timed = {f: number; ease?: string};
/** Findet das Segment a→b und den (eased) Fortschritt k. Vor dem ersten Key: a=b=0, k=0; nach dem letzten: letztes Segment, k=1. */
export const locate = (keys: Timed[], frame: number, dflt: EaseName): {a: number; b: number; k: number} => {
  const n = keys.length;
  if (n === 1 || frame <= keys[0].f) return {a: 0, b: 0, k: 0};
  for (let i = 0; i < n - 1; i++) {
    if (frame < keys[i + 1].f) return {a: i, b: i + 1, k: easeK(keys[i + 1].ease, (frame - keys[i].f) / (keys[i + 1].f - keys[i].f), dflt)};
  }
  return {a: n - 2, b: n - 1, k: 1};
};

export type NumKey = {f: number; v: number; ease?: string};
export const sampleNum = (keys: NumKey[] | undefined, frame: number, dflt: number): number => {
  if (!keys?.length) return dflt;
  const {a, b, k} = locate(keys, frame, 'lin');
  return lerp(keys[a].v, keys[b].v, k);
};
export type PathKey = {f: number; v: V3; ease?: string};
export const samplePath = (keys: PathKey[], frame: number): V3 => {
  const {a, b, k} = locate(keys, frame, 'lin');
  return lerp3(keys[a].v, keys[b].v, k);
};

/** Pose/Gesicht: einzelner Name oder [von, nach, Mischung]. `mix` am Zielkey = Stärke der Zielpose. */
export type NameKey = {f: number; name: string; mix?: number; ease?: string};
export const sampleName = (keys: NameKey[], frame: number): string | [string, string, number] => {
  const {a, b, k} = locate(keys, frame, 'lin');
  const A = keys[a].name, B = keys[b].name;
  if (A === B) return A;
  const m = k * (keys[b].mix ?? 1);
  return m <= 0 ? A : m >= 1 ? B : [A, B, m];
};
/** Gegenstand: wechselt hart beim jeweils letzten erreichten Key. */
export const sampleHard = (keys: {f: number; name: string}[], frame: number, dflt: string): string => {
  let cur = dflt;
  for (const k of keys) if (frame >= k.f) cur = k.name;
  return cur;
};

export const visibleAt = (v: {from?: unknown; to?: unknown} | undefined, frame: number, c: Clock): boolean => {
  if (!v) return true;
  if (v.from !== undefined && frame < toFrames(v.from, c)) return false;
  if (v.to !== undefined && frame >= toFrames(v.to, c)) return false;
  return true;
};

/* ───────────── Verweise ───────────── */

/** Was Verweise brauchen: Position einer Figur (und ihres Kopfes) bzw. eines Objekts zu einem Frame. */
export type RefEnv = {
  actorPos: (id: string, frame: number) => V3;
  actorHead: (id: string, frame: number) => V3;
  objectPos: (id: string, frame: number) => V3;
};
const add = (a: V3, b: V3 = [0, 0, 0]): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export const resolveRef = (r: VecRef, env: RefEnv, frame: number): V3 => {
  if (Array.isArray(r)) return r as V3;
  if ('rel' in r) {
    const [id, part] = r.rel.split('.');
    if (part === undefined) return add(env.actorPos(id, frame), r.off);
    if (part === 'head') return add(env.actorHead(id, frame), r.off);
    throw new StoryError(`Unbekannter Figurenteil "${r.rel}" (erlaubt: "<id>" oder "<id>.head")`);
  }
  return add(env.objectPos(r.obj, frame), r.off);
};

/* ───────────── Kamera ───────────── */

export type CamKeyR = {f: number; pos: VecRef; look: VecRef; fov: number; roll: number; ease?: string; cut?: boolean};

/** keys + ausgerollte orbits → eine nach Zeit sortierte Keyliste (bei gleicher Zeit bleibt die YAML-Reihenfolge). */
export const buildCameraKeys = (cam: SceneData['camera'], c: Clock): CamKeyR[] => {
  const out: CamKeyR[] = [];
  for (const o of cam.orbits) {
    const from = toFrames(o.from, c), to = toFrames(o.to, c);
    const [l0, l1] = o.look;
    if (!Array.isArray(l0) || !Array.isArray(l1)) throw new StoryError('orbits.look: nur feste Koordinaten [x,y,z] werden unterstützt (noch keine {rel}/{obj}-Verweise).');
    const [a0, a1] = [angle(o.angle[0]), angle(o.angle[1])];
    for (let i = 0; i <= o.steps; i++) {
      const k = i / o.steps;
      out.push({
        f: Math.round(from + k * (to - from)),
        pos: orbit(o.center as V3, lerp(o.radius[0], o.radius[1], k), lerp(a0, a1, k), lerp(o.height[0], o.height[1], k)),
        look: lerp3(l0 as V3, l1 as V3, k), fov: lerp(o.fov[0], o.fov[1], k), roll: 0, ease: o.ease,
      });
    }
  }
  for (const k of cam.keys) out.push({f: toFrames(k.t, c), pos: k.pos, look: k.look, fov: k.fov, roll: angle(k.roll), ease: k.ease, cut: k.cut});
  return out.map((k, i) => ({k, i})).sort((x, y) => x.k.f - y.k.f || x.i - y.i).map((x) => x.k);
};

export type CamState = {pos: V3; look: V3; fov: number; roll: number};

export const sampleCamera = (keys: CamKeyR[], frame: number, env: RefEnv): CamState => {
  const at = (k: CamKeyR) => ({pos: resolveRef(k.pos, env, frame), look: resolveRef(k.look, env, frame), fov: k.fov, roll: k.roll});
  const {a, b, k} = locate(keys.map((x) => ({f: x.f, ease: x.cut ? 'cut' : x.ease})), frame, 'io');
  const A = at(keys[a]), B = at(keys[b]);
  return {pos: lerp3(A.pos, B.pos, k), look: lerp3(A.look, B.look, k), fov: lerp(A.fov, B.fov, k), roll: lerp(A.roll, B.roll, k)};
};

/** Handkamera-Wackeln der gerade aktiven Abschnitte (gleiche Formel wie der Referenzcode). */
export const applyShake = (s: CamState, segs: SceneData['camera']['shake'], frame: number, c: Clock): CamState => {
  let out = s;
  for (const g of segs) {
    if (g.from !== undefined && frame < toFrames(g.from, c)) continue;
    if (g.to !== undefined && frame >= toFrames(g.to, c)) continue;
    const sh = shake(frame, g.amp, g.speed);
    out = {...out, pos: [out.pos[0] + sh[0], out.pos[1] + sh[1], out.pos[2] + sh[2]], look: [out.look[0] + sh[1] * 0.5, out.look[1] + sh[0] * 0.5, out.look[2]]};
  }
  return out;
};
