/**
 * Allgemeine Blockperson (Rig "person") für Alltag-, Krimi-, Sci-Fi- und Erklär-Geschichten.
 * Nutzt dasselbe Posen- und Gesichtssystem wie Finn (poseFor/faceFor/mix) und dieselben Proportionen,
 * damit Kamera-Presets, Posen-Keyframes und Lippensync identisch funktionieren. Aussehen über `look`.
 */
import React from 'react';
import {Box} from '../lib/Box';
import {lerp} from '../lib/anim';
import {shade} from '../lib/color';
import {Face, FaceName, PoseName, faceFor, mix, poseFor} from './Finn';

export type PersonLook = {
  skin?: string; hair?: string; hairStyle?: 'short' | 'long' | 'bald'; eyes?: string;
  shirt?: string; pants?: string; shoes?: string;
  coat?: string; apron?: string; hat?: string; glasses?: boolean;
};
export const PERSON_LOOK_DEFAULTS: Required<Pick<PersonLook, 'skin' | 'hair' | 'hairStyle' | 'eyes' | 'shirt' | 'pants' | 'shoes' | 'glasses'>> =
  {skin: '#f2c29b', hair: '#4a3426', hairStyle: 'short', eyes: '#2c4a63', shirt: '#4aa3a0', pants: '#3a3f5c', shoes: '#2b2b2b', glasses: false};

type Props = {
  t: number;
  pose?: PoseName | [PoseName, PoseName, number];
  face?: FaceName | [FaceName, FaceName, number];
  talk?: number;
  prop?: 'none' | 'phone' | 'cup';
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
  blinkSeed?: number;
  ghost?: boolean;
  look?: PersonLook;
};

export const Person: React.FC<Props> = ({t, pose = 'idle', face = 'neutral', talk = 0, prop = 'none', position = [0, 0, 0], rotationY = 0, scale = 1, blinkSeed = 0, ghost = false, look}) => {
  const L = {...PERSON_LOOK_DEFAULTS, ...look};
  const SKIN = ghost ? '#bcd8ff' : L.skin, SKIN_D = shade(L.skin, 0.85), HAIR = L.hair;
  const top = ghost ? '#bcd8ff' : L.shirt, PANTS = ghost ? '#bcd8ff' : L.pants, SHOE = ghost ? '#bcd8ff' : L.shoes;
  const sleeve = L.coat ?? L.shirt;
  const mat = ghost ? 0.35 : undefined;

  const pa = Array.isArray(pose) ? pose : [pose, pose, 0] as const;
  const P = {...mix(poseFor(pa[0], t), poseFor(pa[1], t), pa[2])};
  // Handy/Tasse: der rechte Arm hebt sich (nur bei ruhigen Posen, nicht bei winken/zeigen/schocken/rennen)
  if (prop !== 'none' && !['wave', 'point', 'shock', 'run'].some((n) => n === pa[0] || n === pa[1])) {
    const k = prop === 'phone' ? 1 : 0.8;
    P.armRx = lerp(P.armRx, -0.7, k); P.elbR = lerp(P.elbR, -1.35, k); P.armRz = lerp(P.armRz, -0.12, k);
  }
  const fa = Array.isArray(face) ? face : [face, face, 0] as const;
  const A = faceFor(fa[0]), B = faceFor(fa[1]);
  const Fc: Face = Object.fromEntries(Object.keys(A).map((k) => [k, lerp((A as any)[k], (B as any)[k], fa[2])])) as Face;
  const bp = ((t + blinkSeed) % 2.4) / 2.4;
  const blink = bp > 0.93 ? 1 - Math.sin(((bp - 0.93) / 0.07) * Math.PI) : 1;
  const eyeOpen = Math.min(1.2, Fc.open) * blink;
  const mouthOpen = 0.02 + Math.max(0, (Fc.open - 1) * 0.12) + talk * 0.16;

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <group position={[0, 1.15 + P.bob, 0]} rotation={[0, P.hipsY, 0]}>
        <Box s={[0.74, 0.3, 0.42]} c={PANTS} opacity={mat} />
        {/* Beine */}
        {([[-1, P.legLx, P.kneeL], [1, P.legRx, P.kneeR]] as const).map(([side, lx, kn], i) => (
          <group key={i} position={[side * 0.2, -0.1, 0]} rotation={[lx, 0, 0]}>
            <Box p={[0, -0.27, 0]} s={[0.32, 0.56, 0.34]} c={PANTS} opacity={mat} />
            <group position={[0, -0.55, 0]} rotation={[kn, 0, 0]}>
              <Box p={[0, -0.26, 0]} s={[0.28, 0.54, 0.3]} c={PANTS} opacity={mat} />
              <Box p={[0, -0.56, 0.07]} s={[0.32, 0.18, 0.5]} c={SHOE} opacity={mat} />
            </group>
          </group>
        ))}
        {/* Oberkörper */}
        <group position={[0, 0.15, 0]} rotation={[P.torsoX, P.torsoY, P.torsoZ]}>
          <Box p={[0, 0.5, 0]} s={[0.84, 0.95, 0.48]} c={L.coat && !ghost ? L.shirt : top} opacity={mat} />
          <Box p={[0, 1.0, 0.02]} s={[0.46, 0.1, 0.5]} c={shade(top, 0.85)} opacity={mat} />{/* Kragen */}
          {L.coat && !ghost && (
            <>
              <Box p={[-0.33, 0.5, 0.02]} s={[0.22, 1.0, 0.54]} c={L.coat} />{/* Mantelblenden vorn */}
              <Box p={[0.33, 0.5, 0.02]} s={[0.22, 1.0, 0.54]} c={L.coat} />
              <Box p={[0, 0.55, -0.02]} s={[0.84, 0.95, 0.5]} c={L.coat} />{/* Rückenteil */}
              <Box p={[0, -0.32, -0.02]} s={[0.9, 0.6, 0.54]} c={L.coat} />{/* Mantelschoß */}
            </>
          )}
          {L.apron && !ghost && (
            <>
              <Box p={[0, 0.62, 0.26]} s={[0.56, 0.62, 0.03]} c={L.apron} />
              <Box p={[0, -0.02, 0.27]} s={[0.78, 0.46, 0.03]} c={L.apron} />
              <Box p={[0, 0.02, 0.0]} s={[0.9, 0.06, 0.52]} c={shade(L.apron, 0.8)} />
            </>
          )}
          <Box p={[0, 1.1, 0]} s={[0.22, 0.16, 0.22]} c={SKIN} opacity={mat} />
          {/* Kopf */}
          <group position={[0, 1.15, 0]} rotation={[P.headX, P.headY, P.headZ]}>
            <Box p={[0, 0.4, 0]} s={[0.74, 0.72, 0.72]} c={SKIN} opacity={mat} />
            <Box p={[-0.39, 0.38, 0]} s={[0.06, 0.18, 0.14]} c={SKIN_D} />
            <Box p={[0.39, 0.38, 0]} s={[0.06, 0.18, 0.14]} c={SKIN_D} />
            {/* Haare */}
            {L.hairStyle !== 'bald' && (
              <>
                <Box p={[0, 0.78, -0.02]} s={[0.8, 0.2, 0.78]} c={HAIR} />
                <Box p={[0, 0.68, -0.3]} s={[0.8, 0.5, 0.2]} c={HAIR} />
                <Box p={[-0.4, 0.55, 0]} s={[0.06, 0.4, 0.6]} c={HAIR} />
                <Box p={[0.4, 0.55, 0]} s={[0.06, 0.4, 0.6]} c={HAIR} />
                <Box p={[0, 0.8, 0.38]} s={[0.78, 0.12, 0.1]} c={HAIR} />
              </>
            )}
            {L.hairStyle === 'long' && (
              <>
                <Box p={[0, 0.2, -0.32]} s={[0.84, 0.95, 0.18]} c={HAIR} />
                <Box p={[-0.42, 0.18, -0.05]} s={[0.1, 0.8, 0.6]} c={HAIR} />
                <Box p={[0.42, 0.18, -0.05]} s={[0.1, 0.8, 0.6]} c={HAIR} />
              </>
            )}
            {L.hat && (
              <>
                <Box p={[0, 0.88, 0]} s={[0.84, 0.18, 0.84]} c={L.hat} />
                <Box p={[0, 0.78, 0.5]} s={[0.84, 0.05, 0.3]} c={shade(L.hat, 0.8)} />{/* Krempe vorn */}
                <Box p={[0, 1.0, 0]} s={[0.7, 0.1, 0.7]} c={L.hat} />
              </>
            )}
            {L.glasses && (
              <>
                <Box p={[-0.18, 0.42, 0.375]} s={[0.24, 0.2, 0.03]} c="#222" />
                <Box p={[0.18, 0.42, 0.375]} s={[0.24, 0.2, 0.03]} c="#222" />
                <Box p={[0, 0.44, 0.375]} s={[0.1, 0.03, 0.03]} c="#222" />
              </>
            )}
            {[-1, 1].map((sd) => (
              <group key={sd} position={[sd * 0.18, 0.4, 0.365]}>
                <Box s={[0.19, 0.22 * eyeOpen + 0.01, 0.03]} c="#ffffff" cast={false} />
                <Box p={[Fc.look * 0.02, -0.005, 0.02]} s={[0.1, 0.14 * eyeOpen + 0.005, 0.03]} c={L.eyes} cast={false} />
                <Box p={[0, 0.2 + Fc.browY, 0.02]} s={[0.22, 0.05, 0.04]} c={HAIR} r={[0, 0, -sd * Fc.brow]} cast={false} />
              </group>
            ))}
            <Box p={[-0.25, 0.25, 0.365]} s={[0.12, 0.07, 0.02]} c="#ee8f88" cast={false} />
            <Box p={[0.25, 0.25, 0.365]} s={[0.12, 0.07, 0.02]} c="#ee8f88" cast={false} />
            <Box p={[0, 0.3, 0.4]} s={[0.08, 0.1, 0.07]} c={SKIN_D} cast={false} />
            <group position={[0, 0.13, 0.365]}>
              <Box s={[0.2 * Fc.mouthW, 0.03 + mouthOpen, 0.03]} c="#7a1f2a" cast={false} />
              {mouthOpen > 0.07 && <Box p={[0, 0.012 + mouthOpen / 2 - 0.02, 0.012]} s={[0.17 * Fc.mouthW, 0.03, 0.02]} c="#fff" cast={false} />}
              <Box p={[-0.11 * Fc.mouthW, Fc.smile * 0.03, 0]} s={[0.05, 0.04, 0.03]} c="#7a1f2a" cast={false} />
              <Box p={[0.11 * Fc.mouthW, Fc.smile * 0.03, 0]} s={[0.05, 0.04, 0.03]} c="#7a1f2a" cast={false} />
            </group>
          </group>
          {/* Arme */}
          {([[-1, P.armLx, P.armLz, P.elbL], [1, P.armRx, P.armRz, P.elbR]] as const).map(([sd, ax, az, el], i) => (
            <group key={i} position={[sd * 0.57, 0.9, 0]} rotation={[ax, 0, az]}>
              <Box p={[0, -0.25, 0]} s={[0.26, 0.5, 0.26]} c={ghost ? '#bcd8ff' : sleeve} opacity={mat} />
              <group position={[0, -0.5, 0]} rotation={[el, 0, 0]}>
                <Box p={[0, -0.23, 0]} s={[0.23, 0.46, 0.23]} c={ghost ? '#bcd8ff' : sleeve} opacity={mat} />
                <Box p={[0, -0.54, 0]} s={[0.24, 0.2, 0.24]} c={SKIN} opacity={mat} />
                {sd === 1 && prop === 'phone' && (
                  <group position={[0, -0.6, 0.12]} rotation={[0.2, 0, 0]}>
                    <Box s={[0.2, 0.34, 0.04]} c="#1c1c22" />
                    <Box p={[0, 0, 0.025]} s={[0.17, 0.29, 0.01]} c="#9fd8ff" e="#6fc0ff" ei={0.8} cast={false} />
                  </group>
                )}
                {sd === 1 && prop === 'cup' && (
                  <group position={[0, -0.62, 0.1]}>
                    <Box s={[0.22, 0.26, 0.22]} c="#f4f1ea" />
                    <Box p={[0, 0.1, 0]} s={[0.17, 0.05, 0.17]} c="#6b4226" cast={false} />
                    <Box p={[0.15, 0, 0]} s={[0.07, 0.14, 0.05]} c="#f4f1ea" />
                  </group>
                )}
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
};
