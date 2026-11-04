/**
 * STUDIE (nicht Teil des Generators): verbesserte Person – abgerundete Blöcke, glatter Kunststoff-Look, Kontur,
 * Gesicht als gezeichnete Textur ("Decal", wie bei Roblox) mit denselben Face-/Pose-Daten wie die bestehende Person.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {lerp} from '../src/lib/anim';
import {shade} from '../src/lib/color';
import {Face, FaceName, PoseName, faceFor, mix, poseFor} from '../src/world/Finn';
import {PERSON_LOOK_DEFAULTS, type PersonLook} from '../src/world/Person';
import {RBox, QualityCtx} from './RBox';
import type {JointPose, Q4} from './retarget';

const drawFace = (ctx: CanvasRenderingContext2D, F: Face, eyeOpen: number, mouthOpen: number, hair: string, eyeCol: string) => {
  const W = 256;
  ctx.clearRect(0, 0, W, W);
  const ink = '#2a1d33';
  // Wangen
  if (F.smile > 0.4) { ctx.fillStyle = 'rgba(255,120,130,0.45)'; for (const x of [52, 204]) { ctx.beginPath(); ctx.ellipse(x, 150, 26, 14, 0, 0, 7); ctx.fill(); } }
  // Augen
  for (const sd of [-1, 1]) {
    const cx = 128 + sd * 56, cy = 104, h = Math.max(3, 40 * eyeOpen * (F.open > 1.1 ? 1.2 : 1));
    ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(cx, cy, 27, h, 0, 0, 7); ctx.fill(); ctx.stroke();
    if (eyeOpen > 0.25) {
      const px = cx + F.look * 6, pr = F.open > 1.1 ? 10 : 16;
      ctx.fillStyle = eyeCol; ctx.beginPath(); ctx.ellipse(px, cy + 2, pr, Math.min(h - 3, pr + 4), 0, 0, 7); ctx.fill();
      ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(px, cy + 2, pr * 0.55, Math.min(h - 4, pr * 0.8), 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - 5, cy - 6, 5, 0, 7); ctx.fill();
    }
    // Brauen: innen höher bei Sorge (brow > 0), innen tiefer bei Wut/Entschlossenheit (brow < 0)
    const by = 56 - F.browY * 160, inner = by - F.brow * 46, outer = by + F.brow * 10;
    ctx.strokeStyle = hair; ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - sd * 30, inner); ctx.lineTo(cx + sd * 30, outer); ctx.stroke();
  }
  // Mund
  const my = 188, w = 34 * F.mouthW;
  ctx.lineCap = 'round';
  if (mouthOpen > 0.07) {
    const h = 8 + mouthOpen * 150;
    ctx.fillStyle = '#7a1f2a'; ctx.strokeStyle = ink; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(128, my + h * 0.25 - F.smile * 4, w, h * 0.5 + 6, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff8fa0'; ctx.beginPath(); ctx.ellipse(128, my + h * 0.5, w * 0.55, h * 0.22, 0, 0, 7); ctx.fill();
  } else {
    ctx.strokeStyle = ink; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(128 - w, my - F.smile * 8); ctx.quadraticCurveTo(128, my + F.smile * 44, 128 + w, my - F.smile * 8); ctx.stroke();
  }
};

type Props = {quality?: 'hi' | 'lo'; joints?: JointPose; t: number; pose?: PoseName | [PoseName, PoseName, number]; face?: FaceName | [FaceName, FaceName, number]; talk?: number; position?: [number, number, number]; rotationY?: number; scale?: number; look?: PersonLook};

export const PersonV2: React.FC<Props> = ({quality = 'hi', joints, t, pose = 'idle', face = 'neutral', talk = 0, position = [0, 0, 0], rotationY = 0, scale = 1, look}) => {
  const L = {...PERSON_LOOK_DEFAULTS, ...look};
  const SKIN = L.skin, HAIR = L.hair;
  const pa = Array.isArray(pose) ? pose : [pose, pose, 0] as const;
  const P = mix(poseFor(pa[0], t), poseFor(pa[1], t), pa[2]);
  const fa = Array.isArray(face) ? face : [face, face, 0] as const;
  const A = faceFor(fa[0]), B = faceFor(fa[1]);
  const Fc: Face = Object.fromEntries(Object.keys(A).map((k) => [k, lerp((A as any)[k], (B as any)[k], fa[2])])) as Face;
  const bp = (t % 2.4) / 2.4, blink = bp > 0.93 ? 1 - Math.sin(((bp - 0.93) / 0.07) * Math.PI) : 1;
  const eyeOpen = Math.min(1.2, Fc.open) * blink;
  const mouthOpen = Math.max(0, (Fc.open - 1) * 0.9) + talk * 0.7;

  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 256; return c; }, []);
  const tex = useMemo(() => { const x = new THREE.CanvasTexture(canvas); x.colorSpace = THREE.SRGBColorSpace; return x; }, [canvas]);
  useLayoutEffect(() => { drawFace(canvas.getContext('2d')!, Fc, eyeOpen, mouthOpen, shade(HAIR, 0.8), L.eyes); tex.needsUpdate = true; });

  const pants = L.pants, shirt = L.shirt, shoe = L.shoes;
  // Gelenkdrehung: aus Retargeting (Quaternion) oder aus den Pose-Winkeln (Euler) – gleiche Gruppenstruktur
  const J = (q: Q4 | undefined, e: [number, number, number]) => (q ? {quaternion: q as any} : {rotation: e});
  return (
    <QualityCtx.Provider value={quality}>
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <group position={[0, 1.15 + (joints ? joints.bob : P.bob), 0]} {...J(joints?.hips, [0, P.hipsY, 0])}>
        <RBox s={[0.78, 0.36, 0.46]} c={pants} r={0.14} />
        {([[-1, P.legLx, P.kneeL], [1, P.legRx, P.kneeR]] as const).map(([side, lx, kn], i) => (
          <group key={i} position={[side * 0.21, -0.1, 0]} {...J(joints?.thigh[i], [lx, 0, 0])}>
            <RBox p={[0, -0.27, 0]} s={[0.36, 0.6, 0.38]} c={pants} r={0.13} />
            <group position={[0, -0.55, 0]} {...J(joints?.shin[i], [kn, 0, 0])}>
              <RBox p={[0, -0.27, 0]} s={[0.32, 0.58, 0.34]} c={pants} r={0.12} />
              <RBox p={[0, -0.58, 0.08]} s={[0.36, 0.22, 0.56]} c={shoe} r={0.1} />
            </group>
          </group>
        ))}
        <group position={[0, 0.15, 0]} {...J(joints?.torso, [P.torsoX, P.torsoY, P.torsoZ])}>
          <RBox p={[0, 0.5, 0]} s={[0.92, 1.02, 0.52]} c={shirt} r={0.18} />
          <RBox p={[0, 1.04, 0]} s={[0.3, 0.16, 0.3]} c={SKIN} r={0.07} />
          <group position={[0, 1.15, 0]} {...J(joints?.head, [P.headX, P.headY, P.headZ])}>
            <RBox p={[0, 0.44, 0]} s={[0.86, 0.8, 0.8]} c={SKIN} r={0.26} />
            <RBox p={[-0.45, 0.42, 0]} s={[0.1, 0.2, 0.16]} c={shade(SKIN, 0.9)} r={0.04} outline={0.02} />
            <RBox p={[0.45, 0.42, 0]} s={[0.1, 0.2, 0.16]} c={shade(SKIN, 0.9)} r={0.04} outline={0.02} />
            {L.hairStyle !== 'bald' && (<>
              <RBox p={[0, 0.86, -0.02]} s={[0.92, 0.3, 0.86]} c={HAIR} r={0.14} />
              <RBox p={[0, 0.62, -0.34]} s={[0.9, 0.62, 0.22]} c={HAIR} r={0.12} />
              <RBox p={[-0.45, 0.62, -0.05]} s={[0.1, 0.5, 0.62]} c={HAIR} r={0.05} outline={0.02} />
              <RBox p={[0.45, 0.62, -0.05]} s={[0.1, 0.5, 0.62]} c={HAIR} r={0.05} outline={0.02} />
              <RBox p={[0.12, 0.99, 0.32]} s={[0.46, 0.14, 0.2]} c={HAIR} r={0.06} rot={[0, 0, -0.2]} outline={0.02} />
            </>)}
            <mesh position={[0, 0.44, 0.405]}>
              <planeGeometry args={[0.76, 0.76]} />
              <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
            </mesh>
          </group>
          {([[-1, P.armLx, P.armLz, P.elbL], [1, P.armRx, P.armRz, P.elbR]] as const).map(([sd, ax, az, el], i) => (
            <group key={i} position={[sd * 0.62, 0.9, 0]} {...J(joints?.upper[i], [ax, 0, az])}>
              <RBox p={[0, -0.25, 0]} s={[0.32, 0.56, 0.32]} c={shirt} r={0.13} />
              <group position={[0, -0.5, 0]} {...J(joints?.fore[i], [el, 0, 0])}>
                <RBox p={[0, -0.23, 0]} s={[0.28, 0.5, 0.28]} c={SKIN} r={0.12} />
                <RBox p={[0, -0.55, 0]} s={[0.3, 0.24, 0.3]} c={SKIN} r={0.12} />
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
    </QualityCtx.Provider>
  );
};