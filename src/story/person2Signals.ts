/**
 * Steuersignale für das Rig "person2" aus der Geschichte: Blickziel (Kopf zum Sprecher), Gestenimpulse aus den Wort-Timings,
 * Gehstrecke aus dem Pfad. Reine Funktionen von (Szene, Frame) – kein Zustand, daher bei jedem Bild/FPS gleich.
 */
import type {V3} from '../lib/anim';
import type {SceneData} from './schema';
import {angle, samplePath, toFrames, type Clock, type RefEnv} from './resolve';
import type {Gaze} from '../world/Person2';

type ActorD = SceneData['actors'][number];
const smooth = (x: number) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Schrittlänge (Einheiten je Zyklus) wächst mit dem Tempo – wie beim echten Gehen/Laufen. */
export const strideD = (kind: 'walk' | 'run', speed: number) => (kind === 'walk' ? Math.min(2.4, Math.max(1.3, 0.95 + 0.5 * speed)) : Math.min(4.2, Math.max(2.4, 1.4 + 0.6 * speed)));

export type GaitTrack = {walk: number[]; run: number[]; speed: number[]};
/** Schrittphase (Zyklen) je Frame: Phase wächst um Strecke / Schrittlänge(Tempo) – dadurch bleibt der Bodenkontakt auch bei wechselndem Tempo stimmig.
 *  Figuren ohne Pfad gehen auf der Stelle mit konstantem Tempo. */
export const gaitTrack = (a: ActorD, frames: number, c: Clock, speedDefault: number): GaitTrack => {
  const n = Math.ceil(frames) + 2, walk = new Array<number>(n).fill(0), run = new Array<number>(n).fill(0), speed = new Array<number>(n).fill(speedDefault);
  if (!a.path) { for (let i = 0; i < n; i++) { const d = (speedDefault * i) / c.fps; walk[i] = d / strideD('walk', speedDefault); run[i] = d / strideD('run', speedDefault); } return {walk, run, speed}; }
  const keys = a.path.map((k) => ({f: toFrames(k.t, c), v: k.pos as V3, ease: k.ease}));
  const pos = Array.from({length: n}, (_, i) => samplePath(keys, i));
  for (let i = 0; i < n; i++) { // Tempo über ±2 Frames geglättet
    const j0 = Math.max(0, i - 2), j1 = Math.min(n - 1, i + 2);
    speed[i] = (Math.hypot(pos[j1][0] - pos[j0][0], pos[j1][1] - pos[j0][1], pos[j1][2] - pos[j0][2]) / (j1 - j0)) * c.fps;
  }
  for (let i = 1; i < n; i++) {
    const step = Math.hypot(pos[i][0] - pos[i - 1][0], pos[i][1] - pos[i - 1][1], pos[i][2] - pos[i - 1][2]);
    walk[i] = walk[i - 1] + step / strideD('walk', speed[i]);
    run[i] = run[i - 1] + step / strideD('run', speed[i]);
  }
  return {walk, run, speed};
};

export const gaitSignal = (g: GaitTrack, f: number) => {
  const i = Math.max(0, Math.min(g.walk.length - 2, Math.floor(f))), k = f - i, l = (arr: number[]) => arr[i] + (arr[i + 1] - arr[i]) * k;
  const speed = l(g.speed);
  return {walk: {phase: l(g.walk), D: strideD('walk', speed)}, run: {phase: l(g.run), D: strideD('run', speed)}, speed};
};

export type SignalCtx = {scene: SceneData; clock: Clock; env: RefEnv; fps: number; camPos: (f: number) => V3};

/** Blickführung: Zuhörer schauen zum Sprecher (Augen eilen dem Kopf voraus), Sprecher schauen teils zum Gegenüber bzw. in die Kamera. */
export const gazeSignal = (a: ActorD, f: number, x: SignalCtx): Gaze => {
  const mode = typeof a.params?.gaze === 'string' ? (a.params.gaze as string) : 'auto';
  if (mode === 'off') return {yaw: 0, pitch: 0};
  const ap = x.env.actorPos(a.id, f), ay = angle(a.yaw);
  const rel = (p: V3) => wrap(Math.atan2(p[0] - ap[0], p[2] - ap[2]) - ay);
  if (mode === 'camera') return {yaw: rel(x.camPos(f)), pitch: 0};
  const others = x.scene.actors.filter((o) => o.id !== a.id);
  if (mode !== 'auto') { const t = others.find((o) => o.id === mode); return t ? {yaw: rel(x.env.actorPos(t.id, f)), pitch: 0} : {yaw: 0, pitch: 0}; }
  let sum = 0, yaw = 0;
  for (const l of x.scene.lines) {
    const cl = x.clock.lines[l.id];
    if (!cl) continue;
    const w = smooth((f - (cl.start - 6)) / 8) * (1 - smooth((f - cl.end) / 14));
    if (w <= 0) continue;
    const speaker = x.scene.actors.find((o) => o.cast === l.who);
    if (!speaker) continue;
    if (speaker.id !== a.id) { sum += w; yaw += w * rel(x.env.actorPos(speaker.id, f)); }
    else { // eigene Zeile: gelegentlich zum Gegenüber (nächste Figur) oder in die Kamera, nur leicht
      const near = others.map((o) => ({o, d: Math.hypot(...[0, 2].map((k) => x.env.actorPos(o.id, f)[k] - ap[k]))})).sort((p, q) => p.d - q.d)[0];
      sum += w * 0.45; yaw += w * 0.45 * rel(near ? x.env.actorPos(near.o.id, f) : x.camPos(f));
    }
  }
  return {yaw: sum > 1 ? yaw / sum : yaw, pitch: 0};
};

/** Gestenimpulse: je Wort ein kurzer Impuls (stärker bei langen Wörtern und Satzende), abklingend. */
export const beatSignal = (a: ActorD, f: number, x: SignalCtx): {beat: number; idx: number} => {
  if (a.params?.gestures === false) return {beat: 0, idx: 0};
  let best = 0, idx = 0, li = 0;
  for (const l of x.scene.lines) {
    li++;
    if (a.cast !== l.who) continue;
    const cl = x.clock.lines[l.id];
    if (!cl || f < cl.start - 2 || f > cl.end + 20) continue;
    const toks = l.text.split(/\s+/).filter(Boolean);
    cl.words.forEach((w, j) => {
      const dt = f - w.start;
      if (dt < 0 || dt > 18) return;
      const tok = toks[j] ?? '', len = tok.replace(/\W/g, '').length;
      const amp = Math.min(1, 0.35 + 0.09 * len) * (/[.!?]$/.test(tok) ? 1 : /[,;:]$/.test(tok) ? 0.85 : 0.7) * (len <= 2 ? 0.4 : 1);
      const v = amp * (dt < 2 ? dt / 2 : Math.exp(-(dt - 2) / 6));
      if (v > best) { best = v; idx = li * 13 + j; }
    });
  }
  return {beat: Math.min(1, best), idx};
};
