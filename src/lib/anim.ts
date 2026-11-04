import {Easing} from 'remotion';

export type V3 = [number, number, number];
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 0..1 Fortschritt zwischen zwei Frames (geklemmt) */
export const prog = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));

const E = {
  lin: Easing.linear,
  io: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.6, 0, 1, 0.6),
  out: Easing.bezier(0, 0.4, 0.3, 1),
  snap: Easing.bezier(0.9, 0, 0.1, 1),
};
export type EaseName = keyof typeof E;
export const ease = (name: EaseName, t: number) => E[name](clamp01(t));

export type Key = {f: number; pos: V3; look: V3; fov?: number; roll?: number; ease?: EaseName};
export type CamState = {pos: V3; look: V3; fov: number; roll: number};

/** Kamerapfad aus Keyframes (jedes Segment mit eigener Easing-Kurve). */
export const sampleKeys = (frame: number, keys: Key[]): CamState => {
  if (frame <= keys[0].f) return {pos: keys[0].pos, look: keys[0].look, fov: keys[0].fov ?? 50, roll: keys[0].roll ?? 0};
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (frame < b.f) {
      const k = ease(b.ease ?? 'io', (frame - a.f) / (b.f - a.f));
      return {
        pos: lerp3(a.pos, b.pos, k), look: lerp3(a.look, b.look, k),
        fov: lerp(a.fov ?? 50, b.fov ?? 50, k), roll: lerp(a.roll ?? 0, b.roll ?? 0, k),
      };
    }
  }
  const l = keys[keys.length - 1];
  return {pos: l.pos, look: l.look, fov: l.fov ?? 50, roll: l.roll ?? 0};
};

/** Handkamera-Wackeln (deterministisch, ohne Zufall). */
export const shake = (frame: number, amp: number, speed = 1): V3 => [
  (Math.sin(frame * 0.91 * speed) + 0.5 * Math.sin(frame * 2.13 * speed + 1.3)) * amp,
  (Math.sin(frame * 1.07 * speed + 2) + 0.5 * Math.sin(frame * 2.71 * speed + 0.4)) * amp,
  (Math.sin(frame * 0.77 * speed + 4) + 0.5 * Math.sin(frame * 1.93 * speed + 3.1)) * amp * 0.5,
];

export const orbit = (center: V3, radius: number, angle: number, height: number): V3 => [
  center[0] + Math.sin(angle) * radius, center[1] + height, center[2] + Math.cos(angle) * radius,
];
