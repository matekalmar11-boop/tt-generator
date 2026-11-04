/** Verweise auf Positionen: feste Koordinaten, {rel: Figur}, {obj: Objekt} + interne Formen für Presets/Kreisfahrten. */
import {lerp3, type V3} from '../lib/anim';
import type {VecRef} from './schema';

/** Interne Erweiterung (nicht im YAML): Überblendung zweier Verweise und Offset in den Achsen einer Figur. */
export type RefX = VecRef | {lerp: [RefX, RefX, number]} | {local: string; off: V3};

/** Was Verweise brauchen: Position, Kopf und Blickrichtung (yaw) einer Figur bzw. Position eines Objekts zu einem Frame. */
export type RefEnv = {
  actorPos: (id: string, frame: number) => V3;
  actorHead: (id: string, frame: number) => V3;
  actorYaw: (id: string, frame: number) => number;
  objectPos: (id: string, frame: number) => V3;
};

export class RefError extends Error {}

const add = (a: V3, b: V3 = [0, 0, 0]): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export const resolveRef = (r: RefX, env: RefEnv, frame: number): V3 => {
  if (Array.isArray(r)) return r as V3;
  if ('lerp' in r) return lerp3(resolveRef(r.lerp[0], env, frame), resolveRef(r.lerp[1], env, frame), r.lerp[2]);
  if ('local' in r) { // Offset in den Achsen der Figur: z + = vorn (Blickrichtung), x + = links der Figur
    const y = env.actorYaw(r.local, frame), c = Math.cos(y), s = Math.sin(y);
    return add(env.actorPos(r.local, frame), [r.off[0] * c + r.off[2] * s, r.off[1], -r.off[0] * s + r.off[2] * c]);
  }
  if ('rel' in r) {
    const [id, part] = r.rel.split('.');
    if (part === undefined) return add(env.actorPos(id, frame), r.off);
    if (part === 'head') return add(env.actorHead(id, frame), r.off);
    throw new RefError(`Unbekannter Figurenteil "${r.rel}" (erlaubt: "<id>" oder "<id>.head")`);
  }
  return add(env.objectPos(r.obj, frame), r.off);
};

/** Verweis um einen festen Weltoffset verschieben (folgt weiter der Figur/dem Objekt). */
export const addOff = (r: RefX, off: V3): RefX => {
  if (Array.isArray(r)) return add(r as V3, off);
  if ('lerp' in r) return {lerp: [addOff(r.lerp[0], off), addOff(r.lerp[1], off), r.lerp[2]]};
  if ('local' in r) return {local: r.local, off: add(r.off, off)};
  return {...r, off: add(r.off ?? [0, 0, 0], off)} as RefX;
};

export const lerpRef = (a: RefX, b: RefX, k: number): RefX =>
  Array.isArray(a) && Array.isArray(b) ? lerp3(a as V3, b as V3, k) : {lerp: [a, b, k]};
