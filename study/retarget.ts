/**
 * STUDIE: KayKit-Skelettanimation → Gelenke der v2-Figur ("Retargeting").
 * Torso/Kopf/Hüfte: Weltrotation relativ zur T-Pose (gleiche Achsen). Gliedmaßen: Richtung Gelenk→Gelenk im KayKit-Skelett,
 * v2-Segment (hängt nach −y) wird per kürzester Drehung darauf ausgerichtet (kein Verdrehen um die Längsachse – bei runden Gliedern unsichtbar).
 * Läuft komplett im Render-Körper (deterministisch pro Zeit t), kein Zustand.
 */
import {useMemo} from 'react';
import * as THREE from 'three';
import {useLoader} from '@react-three/fiber';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {staticFile} from 'remotion';

export type Q4 = [number, number, number, number];
export type JointPose = {bob: number; hips: Q4; torso: Q4; head: Q4; thigh: [Q4, Q4]; shin: [Q4, Q4]; upper: [Q4, Q4]; fore: [Q4, Q4]};  // je [links(x<0), rechts(x>0)]

const DOWN = new THREE.Vector3(0, -1, 0);
const q4 = (q: THREE.Quaternion): Q4 => [q.x, q.y, q.z, q.w];
const aim = (d: THREE.Vector3) => new THREE.Quaternion().setFromUnitVectors(DOWN, d.clone().normalize());

type Rest = {q: THREE.Quaternion; pos: THREE.Vector3};

export const useKayKitRig = (url: string, clipName: string, t: number): JointPose => {
  const gltf = useLoader(GLTFLoader, staticFile(url));
  const ctx = useMemo(() => {
    const root = clone(gltf.scene);
    root.updateMatrixWorld(true);
    const bones: Record<string, THREE.Object3D> = {};
    root.traverse((o) => { if ((o as THREE.Bone).isBone) bones[o.name] = o; });
    const wq = (o: THREE.Object3D) => o.getWorldQuaternion(new THREE.Quaternion());
    const wp = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
    const rest = (n: string): Rest => ({q: wq(bones[n]), pos: wp(bones[n])});
    const names = ['hips', 'chest', 'head'];
    const restB = Object.fromEntries(names.map((n) => [n, rest(n)]));
    // Seite über die x-Koordinate in Ruhepose bestimmen (links = x < 0 wie in der v2-Figur)
    const side = (base: string): [string, string] => {
      const a = `${base}l`, b = `${base}r`;   // three.js entfernt Punkte aus Knochennamen (upperarm.l → upperarml)
      return wp(bones[a]).x < wp(bones[b]).x ? [a, b] : [b, a];
    };
    return {root, bones, wq, wp, restB, mixer: new THREE.AnimationMixer(root), sides: {up: side('upperarm'), lo: side('lowerarm'), wr: side('wrist'), ul: side('upperleg'), ll: side('lowerleg'), ft: side('foot')}};
  }, [gltf]);

  const clip = gltf.animations.find((a) => a.name === clipName);
  if (!clip) throw new Error(`Animation "${clipName}" nicht im Modell`);
  const {root, wq, wp, restB, mixer, sides} = ctx;
  mixer.stopAllAction(); mixer.clipAction(clip, root).play(); mixer.setTime(t); root.updateMatrixWorld(true);

  const delta = (n: string) => wq(ctx.bones[n]).multiply(restB[n].q.clone().invert());
  const Qh = delta('hips'), Qt = delta('chest'), Qhd = delta('head');
  const local = (parent: THREE.Quaternion, world: THREE.Quaternion) => parent.clone().invert().multiply(world);
  const dir = (a: string, b: string) => wp(ctx.bones[b]).sub(wp(ctx.bones[a]));

  // abduct: seitliches Abspreizen der Arme dämpfen – die KayKit-Arme sind für einen schmalen Chibi-Körper animiert und würden am breiten v2-Torso abstehen
  const limb = (parentW: THREE.Quaternion, p0: string, p1: string, p2: string, abduct = 1): [Q4, Q4] => {
    const d1 = dir(p0, p1), d2 = dir(p1, p2); d1.x *= abduct; d2.x *= abduct;
    const Q1 = aim(d1), Q2 = aim(d2);
    return [q4(local(parentW, Q1)), q4(local(Q1, Q2))];
  };
  const L = (k: [string, string], i: 0 | 1) => k[i];
  const legs = [0, 1].map((i) => limb(Qh, L(sides.ul, i as 0 | 1), L(sides.ll, i as 0 | 1), L(sides.ft, i as 0 | 1)));
  const arms = [0, 1].map((i) => limb(Qt, L(sides.up, i as 0 | 1), L(sides.lo, i as 0 | 1), L(sides.wr, i as 0 | 1), 0.4));
  const hipsY = wp(ctx.bones.hips).y - restB.hips.pos.y;
  return {
    bob: hipsY * (1.15 / restB.hips.pos.y),   // Hüfthöhe der v2-Figur im Verhältnis zur KayKit-Hüfthöhe
    hips: q4(Qh), torso: q4(local(Qh, Qt)), head: q4(local(Qt, Qhd)),
    thigh: [legs[0][0], legs[1][0]], shin: [legs[0][1], legs[1][1]], upper: [arms[0][0], arms[1][0]], fore: [arms[0][1], arms[1][1]],
  };
};
