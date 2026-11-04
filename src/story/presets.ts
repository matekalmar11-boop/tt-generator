/**
 * Kamera-Presets (camera.shots): jedes Preset wird zu normalen Kamera-Keys (und ggf. Wackeln) ausgerollt.
 * Positionen bleiben Verweise ({rel}, lokale Figurenachsen) und folgen deshalb bewegten Figuren.
 */
import {ease, lerp, type EaseName, type V3} from '../lib/anim';
import {parseAngle, type SceneData} from './schema';
import {addOff, lerpRef, type RefX} from './refs';

export type CamKeyR = {f: number; pos: RefX; look: RefX; fov: number; roll: number; ease?: string; cut?: boolean};
export type ShakeSeg = {from: string; to: string; amp: number; speed: number};
type Shot = SceneData['camera']['shots'][number];
export class PresetError extends Error {}

const pair = (v: number | [number, number] | undefined, d: [number, number]): [number, number] =>
  v === undefined ? d : typeof v === 'number' ? [v, v] : v;
const scaleV = (v: V3, k: number): V3 => [v[0] * k, v[1] * k, v[2] * k];
const need = <T>(v: T | undefined, shot: Shot, field: string): T => {
  if (v === undefined) throw new PresetError(`Preset "${shot.preset}": Feld "${field}" fehlt`);
  return v;
};

/** Löst einen Shot zu Keys auf. `tf` rechnet Zeitangaben in Frames um. */
export const expandShot = (s: Shot, tf: (v: unknown) => number): {keys: CamKeyR[]; shake: ShakeSeg[]} => {
  const f0 = tf(s.from), f1 = tf(s.to);
  if (f1 <= f0) throw new PresetError(`Preset "${s.preset}": "to" (${f1.toFixed(1)} f) muss nach "from" (${f0.toFixed(1)} f) liegen`);
  const cut = s.transition === 'cut';
  const mk = (f: number, pos: RefX, look: RefX, fov: number, e?: string): CamKeyR => ({f, pos, look, fov, roll: 0, ease: e, cut});
  const keys: CamKeyR[] = [];
  const shake: ShakeSeg[] = [];
  const lo: V3 = s.look_offset ?? [0, 0, 0];
  const look = (target: RefX): RefX => addOff(target, lo);

  switch (s.preset) {
    case 'push_in': {
      const t = need(s.target, s, 'target'), off = s.offset ?? [0.9, 0.4, 6], push = s.push ?? 0.45, [a, b] = pair(s.fov, [46, 34]);
      keys.push(mk(f0, addOff(t, off), look(t), a), mk(f1, addOff(t, scaleV(off, 1 - push)), look(t), b, s.ease ?? 'io'));
      break;
    }
    case 'orbit_in': {
      const t = need(s.target, s, 'target'), [r0, r1] = s.distance ?? [7, 4.5], [h0, h1] = s.height ?? [1.2, 0.3], [fa, fb] = pair(s.fov, [56, 42]);
      const [a0, a1] = s.angle ? [parseAngle(s.angle[0])!, parseAngle(s.angle[1])!] : [-0.9, 0.5];
      const N = 8;
      for (let i = 0; i <= N; i++) {
        const k = i / N, r = lerp(r0, r1, k), a = lerp(a0, a1, k);
        keys.push(mk(Math.round(lerp(f0, f1, k)), addOff(t, [Math.sin(a) * r, lerp(h0, h1, k), Math.cos(a) * r]), look(t), lerp(fa, fb, k), s.ease ?? 'lin'));
      }
      break;
    }
    case 'whip_to': {
      const t = need(s.target, s, 'target'), from = need(s.look_from, s, 'look_from'), off = s.offset ?? [2.5, 0.5, 6], [fa, fb] = pair(s.fov, [52, 38]);
      const at = s.at !== undefined ? tf(s.at) : (f0 + f1) / 2, dur = s.duration !== undefined ? tf(s.duration) : 8;
      if (at < f0 || at + dur > f1) throw new PresetError('Preset "whip_to": "at" + "duration" muss innerhalb von from…to liegen');
      const pos = addOff(t, off);
      keys.push(mk(f0, pos, from, fa), mk(at, pos, from, fa, 'lin'), mk(at + dur, pos, look(t), fb, 'snap'), mk(f1, addOff(t, scaleV(off, 0.9)), look(t), fb - 3, s.ease ?? 'lin'));
      break;
    }
    case 'over_shoulder': {
      const sub = need(s.subject, s, 'subject'), t = need(s.target, s, 'target'), off = s.offset ?? [-0.8, 2.15, -2.7], [a, b] = pair(s.fov, [40, 36]);
      const lk = addOff(t, s.look_offset ?? [0, 1.55, 0]);
      keys.push(mk(f0, {local: sub, off}, lk, a), mk(f1, {local: sub, off}, lk, b, s.ease ?? 'lin'));
      break;
    }
    case 'crane_down': {
      const t = need(s.target, s, 'target'), o0 = s.offset ?? [3, 16, 9], o1 = s.to_offset ?? [1.5, 1.8, 6], [a, b] = pair(s.fov, [58, 42]);
      keys.push(mk(f0, addOff(t, o0), look(t), a), mk(f1, addOff(t, o1), look(t), b, s.ease ?? 'io'));
      break;
    }
    case 'track_behind': {
      const sub = need(s.subject, s, 'subject'), off = s.offset ?? [0.6, 1.7, -4.2], [a, b] = pair(s.fov, [50, 50]);
      const lk: RefX = {local: sub, off: s.look_offset ?? [0, 1.5, 1.5]};
      keys.push(mk(f0, {local: sub, off}, lk, a), mk(f1, {local: sub, off}, lk, b, s.ease ?? 'lin'));
      break;
    }
    case 'dolly_zoom': {
      const t = need(s.target, s, 'target'), o = s.offset ?? [0, 0.8, 8], len = Math.hypot(...o), dir = scaleV(o, 1 / len);
      const [d0, d1] = s.distance ?? [8, 3], fov0 = pair(s.fov, [30, 30])[0];
      const N = 12, tan0 = Math.tan((fov0 * Math.PI) / 360);
      for (let i = 0; i <= N; i++) {
        const k = i / N, d = lerp(d0, d1, ease((s.ease ?? 'io') as EaseName, k));
        // Zielgröße im Bild bleibt gleich: d · tan(fov/2) = konstant
        keys.push(mk(Math.round(lerp(f0, f1, k)), addOff(t, scaleV(dir, d)), look(t), (2 * Math.atan((tan0 * d0) / d) * 180) / Math.PI, 'lin'));
      }
      break;
    }
    case 'handheld': {
      const t = need(s.target, s, 'target'), o0 = s.offset ?? [1.2, 1.4, 5], o1 = s.to_offset ?? o0, [a, b] = pair(s.fov, [46, 46]);
      keys.push(mk(f0, addOff(t, o0), look(t), a), mk(f1, addOff(t, o1), look(t), b, s.ease ?? 'lin'));
      shake.push({from: `${f0}f`, to: `${f1}f`, amp: s.amp ?? 0.06, speed: s.speed ?? 1.6});
      break;
    }
  }
  void lerpRef;
  return {keys, shake};
};
