/**
 * Rig "person2": abgerundete Blockfigur im modernen Kunststoff-Look mit Kontur und gezeichnetem Gesicht (Decal).
 * Gleiche YAML-Eigenschaften wie "person" (Posen, Gesichter, Gegenstände, look), dazu prozedurale Bewegung:
 * Atmen/Idle, Blinzeln, Blickführung, Kopf- und Gestenimpulse beim Sprechen, weiche Posenübergänge, Gehzyklus mit Fußkontakt,
 * Mundformen aus Phonemen. Die alten Rigs (Finn, Person) bleiben unverändert; Posen-/Gesichtsdaten werden nur gelesen.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {lerp} from '../lib/anim';
import {shade} from '../lib/color';
import {Face, FaceName, Pose, PoseName, faceFor, mix, poseFor} from './Finn';
import {PERSON_LOOK_DEFAULTS, type PersonLook} from './Person';
import {FigureCtx, RBox} from './RBox';
import {ANKLE, L1, L2, PIVOT, RUN, STAND_HIPS, WALK, blinkAmount, gaitPose, idleLayer, smoother} from './person2Motion';
import type {Mouth} from '../story/visemes';

export type Gaze = {yaw: number; pitch: number};
export type Person2Props = {
  t: number;
  pose?: PoseName | [PoseName, PoseName, number];
  face?: FaceName | [FaceName, FaceName, number];
  talk?: number;                 // Mundöffnung aus der Sprach-Hüllkurve (Rückfall, wenn keine Phoneme vorliegen)
  mouth?: Mouth;                 // Mundform aus Phonemen
  prop?: 'none' | 'phone' | 'cup';
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
  ghost?: boolean;
  look?: PersonLook;
  seed?: number;                 // je Figur anderer Atem-/Blinzeltakt
  gaze?: Gaze;                   // Blickrichtung relativ zur Figur (Radiant)
  beat?: number;                 // 0..1 Gestenimpuls beim Sprechen
  beatIdx?: number;              // wechselt je Wort (wählt Arm/Stärke)
  gait?: {walk: {phase: number; D: number}; run: {phase: number; D: number}; speed: number};   // Schrittphase (Zyklen), Schrittlänge D und Tempo (Einheiten/s)
  energy?: number;               // Lebendigkeit der Idle-Ebene, 0 = aus
};

/* ───────────── Gesicht (Decal) ───────────── */
type Eyes = {open: number; lookX: number; lookY: number};
const drawFace = (ctx: CanvasRenderingContext2D, F: Face, eyes: Eyes, m: Mouth, hair: string, eyeCol: string) => {
  const W = 256, ink = '#2a1d33';
  ctx.clearRect(0, 0, W, W);
  if (F.smile > 0.4) { ctx.fillStyle = 'rgba(255,120,130,0.45)'; for (const x of [52, 204]) { ctx.beginPath(); ctx.ellipse(x, 150, 26, 14, 0, 0, 7); ctx.fill(); } }
  for (const sd of [-1, 1]) {
    const cx = 128 + sd * 56, cy = 104, h = Math.max(3, 40 * eyes.open * (F.open > 1.1 ? 1.2 : 1));
    ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(cx, cy, 27, h, 0, 0, 7); ctx.fill(); ctx.stroke();
    if (eyes.open > 0.22) {
      const px = cx + eyes.lookX * 9, py = cy + 2 + eyes.lookY * 8, pr = F.open > 1.1 ? 10 : 16;
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, 25, Math.max(2, h - 2), 0, 0, 7); ctx.clip();
      ctx.fillStyle = eyeCol; ctx.beginPath(); ctx.ellipse(px, py, pr, pr + 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(px, py, pr * 0.55, pr * 0.8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - 5, py - 8, 5, 0, 7); ctx.fill();
      ctx.restore();
    }
    const by = 56 - F.browY * 160, inner = by - F.brow * 46, outer = by + F.brow * 10;
    ctx.strokeStyle = hair; ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - sd * 30, inner); ctx.lineTo(cx + sd * 30, outer); ctx.stroke();
  }
  // Mund: Grundform aus dem Ausdruck (smile/mouthW) + Mundform der Sprache (open/wide/round/teeth/fv)
  const my = 188, open = m.open, w = 34 * F.mouthW * (1 + 0.35 * m.wide) * (1 - 0.5 * m.round);
  ctx.lineCap = 'round';
  if (open > 0.07) {
    const h = (8 + open * 120) * (1 + 0.25 * m.round), ry = h * 0.5 + 6;
    ctx.fillStyle = '#7a1f2a'; ctx.strokeStyle = ink; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(128, my + h * 0.22 - F.smile * 4, w, ry, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.ellipse(128, my + h * 0.22 - F.smile * 4, w - 3, ry - 3, 0, 0, 7); ctx.clip();
    if (m.teeth > 0.3 && open > 0.12) { ctx.fillStyle = '#fff'; ctx.fillRect(128 - w, my + h * 0.22 - F.smile * 4 - ry, w * 2, 12 + 6 * m.teeth); }
    if (open > 0.45 && m.round < 0.5) { ctx.fillStyle = '#ff8fa0'; ctx.beginPath(); ctx.ellipse(128, my + h * 0.5, w * 0.55, h * 0.2, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  } else {
    ctx.strokeStyle = ink; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(128 - w, my - F.smile * 8); ctx.quadraticCurveTo(128, my + F.smile * 44, 128 + w, my - F.smile * 8); ctx.stroke();
    if (m.fv > 0.5) { ctx.fillStyle = '#fff'; ctx.fillRect(128 - w * 0.6, my - 6, w * 1.2, 11); }
  }
};

const MOUTH_REST: Mouth = {open: 0, wide: 0, round: 0, teeth: 0, fv: 0};
const GESTURE_POSES = new Set<PoseName>(['idle', 'sit']);
const lerpQ = lerp;

export const Person2: React.FC<Person2Props> = ({
  t, pose = 'idle', face = 'neutral', talk = 0, mouth, prop = 'none', position = [0, 0, 0], rotationY = 0, scale = 1, ghost = false, look, seed = 0, gaze, beat = 0, beatIdx = 0, gait, energy = 1,
}) => {
  const L = {...PERSON_LOOK_DEFAULTS, ...look};
  const SKIN = L.skin, HAIR = L.hair, sleeve = L.coat ?? L.shirt;

  /* ── Pose: weicher Übergang (smootherstep); "walk"/"run" nutzen unten den Gehzyklus statt der Winkel-Schwingung ── */
  const pa = Array.isArray(pose) ? pose : [pose, pose, 0] as const;
  const kk = smoother(pa[2]);
  const gaitKind = (n: PoseName) => (n === 'walk' ? WALK : n === 'run' ? RUN : null);
  const gA = gaitKind(pa[0]), gB = gaitKind(pa[1]);
  const wGait = (gA ? 1 - kk : 0) + (gB ? kk : 0);
  const baseName = (n: PoseName): PoseName => (n === 'walk' || n === 'run' ? 'idle' : n);
  const P: Pose = {...mix(poseFor(baseName(pa[0]), t), poseFor(baseName(pa[1]), t), kk)};

  /* ── Ebenen: Atmen/Idle ── */
  const I = idleLayer(t, seed, energy);
  const idleW = 1 - wGait * 0.7;
  P.torsoX += I.torsoX * idleW; P.torsoZ += I.torsoZ * idleW; P.headX += I.headX; P.headY += I.headY; P.headZ += I.headZ; P.hipsY += I.hipsYaw * idleW;

  /* ── Blickführung: Kopf folgt dem Ziel zu ~65 %, Augen eilen voraus ── */
  const gz = gaze ?? {yaw: 0, pitch: 0};
  const headYaw = Math.max(-0.9, Math.min(0.9, gz.yaw)) * 0.65, bodyYaw = gz.yaw * 0.12;
  P.headY += headYaw; P.headX += gz.pitch * 0.5; P.torsoY += bodyYaw;
  const eyeX = Math.max(-1, Math.min(1, (gz.yaw - headYaw) / 0.45)), eyeY = Math.max(-1, Math.min(1, gz.pitch * 1.6));

  /* ── Gesten beim Sprechen: Nicken + kleine Handbewegung (nur in ruhigen Posen) ── */
  const canGesture = beat > 0 && GESTURE_POSES.has(pa[0]) && GESTURE_POSES.has(pa[1]);
  if (canGesture) {
    const strong = 0.55 + 0.45 * ((beatIdx * 7) % 3) / 2, right = beatIdx % 2 === 0;
    P.headX += 0.07 * beat; P.torsoX += 0.02 * beat;
    if (right) { P.armRx += -0.5 * beat * strong; P.elbR += -0.7 * beat * strong; P.armRz += -0.12 * beat; }
    else { P.armLx += -0.4 * beat * strong; P.elbL += -0.6 * beat * strong; P.armLz += 0.12 * beat; }
  }
  // Gegenstand in der rechten Hand hebt den Arm (wie bei "person")
  if (prop !== 'none' && !(['wave', 'point', 'shock', 'run', 'walk'] as PoseName[]).some((n) => n === pa[0] || n === pa[1])) {
    const k = prop === 'phone' ? 1 : 0.8;
    P.armRx = lerpQ(P.armRx, -0.7, k); P.elbR = lerpQ(P.elbR, -1.35, k); P.armRz = lerpQ(P.armRz, -0.12, k);
  }

  /* ── Gehzyklus: Beine per IK mit Bodenkontakt, Hüfthöhe aus den Standbeinen ── */
  const sitW = (pa[0] === 'sit' ? 1 - kk : 0) + (pa[1] === 'sit' ? kk : 0);   // Sitzfläche 0.6: Becken passend zu den längeren Beinen
  let hipsY = STAND_HIPS + P.bob - 0.1 * sitW, hipsX = I.hipsX * idleW;
  let legs: {th: number; kn: number}[] = [{th: P.legLx, kn: P.kneeL}, {th: P.legRx, kn: P.kneeR}];
  if (wGait > 0.001) {
    const base = gA && kk < 0.5 ? gA : gB ?? gA ?? WALK, kind = base === RUN ? 'run' : 'walk';
    const speed = gait?.speed ?? 1.4;
    const move = smoother(Math.min(1, speed / 0.35));       // Stillstand → Gehzyklus blendet aus (Füße bleiben nicht mitten im Schritt)
    const w = wGait * move;
    const g = {...base, D: gait ? gait[kind].D : base.D};
    const gp = gaitPose(gait ? gait[kind].phase : t * (1.4 / g.D), g);
    hipsY = lerp(hipsY, gp.pivotH + PIVOT, w); hipsX += gp.hipsX * w;
    legs = legs.map((l, i) => ({th: lerp(l.th, gp.legs[i].th, w), kn: lerp(l.kn, gp.legs[i].kn, w)}));
    P.armLx = lerp(P.armLx, gp.armL, w); P.armRx = lerp(P.armRx, gp.armR, w);
    P.elbL = lerp(P.elbL, -gp.elbow * 0.6, w); P.elbR = lerp(P.elbR, -gp.elbow * 0.6, w);
    P.torsoY = lerp(P.torsoY, P.torsoY + gp.torsoY, w); P.torsoX = lerp(P.torsoX, P.torsoX + gp.torsoX, w); P.hipsY = lerp(P.hipsY, P.hipsY + gp.hipsYaw, w);
    P.headY -= gp.torsoY * w * 0.8;      // Kopf bleibt ruhig
  }

  /* ── Gesicht ── */
  const fa = Array.isArray(face) ? face : [face, face, 0] as const;
  const A = faceFor(fa[0]), B = faceFor(fa[1]), fk = smoother(fa[2]);
  const Fc: Face = Object.fromEntries(Object.keys(A).map((k) => [k, lerp((A as any)[k], (B as any)[k], fk)])) as Face;
  const closure = blinkAmount(t, seed);
  const eyes: Eyes = {open: Math.min(1.2, Fc.open) * (1 - closure), lookX: eyeX + Fc.look, lookY: eyeY};
  const surprise = Math.max(0, (Fc.open - 1) * 0.9);
  const m0 = mouth ?? {...MOUTH_REST, open: talk * 0.8, wide: 0.1};
  const m: Mouth = {...m0, open: Math.max(surprise, m0.open)};

  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 256; return c; }, []);
  const tex = useMemo(() => { const x = new THREE.CanvasTexture(canvas); x.colorSpace = THREE.SRGBColorSpace; return x; }, [canvas]);
  useLayoutEffect(() => { drawFace(canvas.getContext('2d')!, Fc, eyes, m, shade(HAIR, 0.8), L.eyes); tex.needsUpdate = true; });

  const pants = L.pants, shirt = L.shirt, shoe = L.shoes;
  const chestS: [number, number, number] = [1, 1 + I.chest * 0.6, 1 + I.chest];
  return (
    <FigureCtx.Provider value={{ghost}}>
      <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
        <group position={[hipsX, hipsY, 0]} rotation={[0, P.hipsY, 0]}>
          <RBox s={[0.78, 0.36, 0.46]} c={pants} r={0.14} />
          {[-1, 1].map((side, i) => {
            const th = legs[i].th, kn = legs[i].kn, foot = -(th + kn);       // Fuß bleibt flach (Knöchel gleicht aus)
            return (
              <group key={i} position={[side * 0.21, -PIVOT, 0]} rotation={[th, 0, 0]}>
                <RBox p={[0, -L1 / 2, 0]} s={[0.36, L1 + 0.05, 0.38]} c={pants} r={0.13} />
                <group position={[0, -L1, 0]} rotation={[kn, 0, 0]}>
                  <RBox p={[0, -L2 / 2, 0]} s={[0.32, L2 + 0.04, 0.34]} c={pants} r={0.12} />
                  <group position={[0, -L2, 0]} rotation={[foot, 0, 0]}>
                    <RBox p={[0, -ANKLE + 0.11, 0.08]} s={[0.36, 0.22, 0.56]} c={shoe} r={0.1} />
                  </group>
                </group>
              </group>
            );
          })}
          <group position={[0, 0.15, 0]} rotation={[P.torsoX, P.torsoY, P.torsoZ]}>
            <group scale={chestS} position={[0, 0.5, 0]}><RBox s={[0.92, 1.02, 0.52]} c={shirt} r={0.18} /></group>
            {L.coat && <>
              <RBox p={[0, 0.5, -0.02]} s={[0.98, 1.0, 0.58]} c={L.coat} r={0.18} />
              <RBox p={[0, -0.32, -0.02]} s={[1.0, 0.62, 0.6]} c={L.coat} r={0.16} />
              <RBox p={[-0.2, 0.62, 0.285]} s={[0.12, 0.85, 0.05]} c={shirt} r={0.02} outline={0.015} />
            </>}
            {L.apron && <>
              <RBox p={[0, 0.62, 0.3]} s={[0.6, 0.64, 0.04]} c={L.apron} r={0.03} outline={0.015} />
              <RBox p={[0, -0.02, 0.31]} s={[0.84, 0.5, 0.04]} c={L.apron} r={0.04} outline={0.015} />
            </>}
            <RBox p={[0, 1.04, 0]} s={[0.3, 0.16, 0.3]} c={SKIN} r={0.07} />
            <group position={[0, 1.15 + I.shoulder * 0.3, 0]} rotation={[P.headX, P.headY, P.headZ]}>
              <RBox p={[0, 0.44, 0]} s={[0.86, 0.8, 0.8]} c={SKIN} r={0.26} />
              <RBox p={[-0.45, 0.42, 0]} s={[0.1, 0.2, 0.16]} c={shade(SKIN, 0.9)} r={0.04} outline={0.02} />
              <RBox p={[0.45, 0.42, 0]} s={[0.1, 0.2, 0.16]} c={shade(SKIN, 0.9)} r={0.04} outline={0.02} />
              {L.hairStyle !== 'bald' && <>
                <RBox p={[0, 0.86, -0.02]} s={[0.92, 0.3, 0.86]} c={HAIR} r={0.14} />
                <RBox p={[0, 0.62, -0.34]} s={[0.9, 0.62, 0.22]} c={HAIR} r={0.12} />
                <RBox p={[-0.45, 0.62, -0.05]} s={[0.1, 0.5, 0.62]} c={HAIR} r={0.05} outline={0.02} />
                <RBox p={[0.45, 0.62, -0.05]} s={[0.1, 0.5, 0.62]} c={HAIR} r={0.05} outline={0.02} />
                <RBox p={[0.12, 0.99, 0.32]} s={[0.46, 0.14, 0.2]} c={HAIR} r={0.06} rot={[0, 0, -0.2]} outline={0.02} />
              </>}
              {L.hairStyle === 'long' && <>
                <RBox p={[0, 0.2, -0.34]} s={[0.9, 0.95, 0.2]} c={HAIR} r={0.1} />
                <RBox p={[-0.47, 0.18, -0.05]} s={[0.1, 0.8, 0.6]} c={HAIR} r={0.05} outline={0.02} />
                <RBox p={[0.47, 0.18, -0.05]} s={[0.1, 0.8, 0.6]} c={HAIR} r={0.05} outline={0.02} />
              </>}
              {L.hat && <>
                <RBox p={[0, 0.98, 0]} s={[0.96, 0.2, 0.92]} c={L.hat} r={0.1} />
                <RBox p={[0, 0.84, 0.5]} s={[0.96, 0.06, 0.34]} c={shade(L.hat, 0.8)} r={0.03} outline={0.02} />
                <RBox p={[0, 1.1, 0]} s={[0.8, 0.12, 0.78]} c={L.hat} r={0.08} />
              </>}
              {L.glasses && <>
                <RBox p={[-0.18, 0.46, 0.41]} s={[0.26, 0.22, 0.03]} c="#222" r={0.01} outline={0.012} />
                <RBox p={[0.18, 0.46, 0.41]} s={[0.26, 0.22, 0.03]} c="#222" r={0.01} outline={0.012} />
              </>}
              <mesh position={[0, 0.44, 0.405]}>
                <planeGeometry args={[0.76, 0.76]} />
                <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} opacity={ghost ? 0.4 : 1} />
              </mesh>
            </group>
            {([[-1, P.armLx, P.armLz, P.elbL], [1, P.armRx, P.armRz, P.elbR]] as const).map(([sd, ax, az, el], i) => (
              <group key={i} position={[sd * 0.62, 0.9 + I.shoulder, 0]} rotation={[ax, 0, az]}>
                <RBox p={[0, -0.25, 0]} s={[0.32, 0.56, 0.32]} c={sleeve} r={0.13} />
                <group position={[0, -0.5, 0]} rotation={[el, 0, 0]}>
                  <RBox p={[0, -0.23, 0]} s={[0.28, 0.5, 0.28]} c={L.coat ? sleeve : SKIN} r={0.12} />
                  <RBox p={[0, -0.55, 0]} s={[0.3, 0.24, 0.3]} c={SKIN} r={0.12} />
                  {sd === 1 && prop === 'phone' && (
                    <group position={[0, -0.62, 0.14]} rotation={[0.2, 0, 0]}>
                      <RBox s={[0.2, 0.34, 0.05]} c="#1c1c22" r={0.03} outline={0.015} />
                      <mesh position={[0, 0, 0.028]}><planeGeometry args={[0.16, 0.28]} /><meshBasicMaterial color="#9fd8ff" toneMapped={false} /></mesh>
                    </group>
                  )}
                  {sd === 1 && prop === 'cup' && (
                    <group position={[0, -0.64, 0.12]}>
                      <RBox s={[0.22, 0.26, 0.22]} c="#f4f1ea" r={0.05} outline={0.015} />
                      <RBox p={[0.15, 0, 0]} s={[0.07, 0.14, 0.05]} c="#f4f1ea" r={0.02} outline={0.01} />
                    </group>
                  )}
                </group>
              </group>
            ))}
          </group>
        </group>
      </group>
    </FigureCtx.Provider>
  );
};
