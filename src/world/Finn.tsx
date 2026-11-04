import React from 'react';
import {Box, Glow} from '../lib/Box';
import {lerp} from '../lib/anim';

/* ---------- Posen ---------- */
export type Pose = {
  armLx: number; armLz: number; elbL: number; armRx: number; armRz: number; elbR: number;
  legLx: number; kneeL: number; legRx: number; kneeR: number;
  torsoX: number; torsoY: number; torsoZ: number; headX: number; headY: number; headZ: number;
  hipsY: number; bob: number;
};
const P0: Pose = {armLx: 0, armLz: 0.08, elbL: -0.15, armRx: 0, armRz: -0.08, elbR: -0.15, legLx: 0, kneeL: 0, legRx: 0, kneeR: 0,
  torsoX: 0, torsoY: 0, torsoZ: 0, headX: 0, headY: 0, headZ: 0, hipsY: 0, bob: 0};
export type PoseName = 'idle' | 'walk' | 'sneak' | 'run' | 'lantern' | 'sword' | 'swing' | 'shock' | 'fall' | 'power' | 'point';

export const poseFor = (name: PoseName, t: number, k = 0): Pose => {
  const w = (spd: number, ph = 0) => Math.sin(t * spd * Math.PI * 2 + ph);
  switch (name) {
    case 'idle': {
      const b = w(0.45);
      return {...P0, armLx: b * 0.04, armRx: -b * 0.04, torsoX: b * 0.02, headY: w(0.2) * 0.12, bob: b * 0.015};
    }
    case 'lantern': { // Laterne in der linken Hand, Wind im Haar
      const b = w(0.45);
      return {...P0, armLx: -0.95, elbL: -1.1, armLz: 0.15, armRx: b * 0.05, torsoX: 0.02 + b * 0.02, headY: w(0.15) * 0.15 - 0.1, bob: b * 0.015};
    }
    case 'walk': case 'sneak': case 'run': {
      const sp = name === 'run' ? 2.4 : name === 'sneak' ? 1.2 : 1.7;
      const amp = name === 'run' ? 1.0 : name === 'sneak' ? 0.5 : 0.65;
      const ph = w(sp), ph2 = Math.sin(t * sp * Math.PI * 2 + Math.PI);
      const lean = name === 'run' ? 0.35 : name === 'sneak' ? 0.3 : 0.08;
      return {...P0, legLx: ph * amp, legRx: ph2 * amp, kneeL: Math.max(0, -Math.cos(t * sp * Math.PI * 2)) * amp * 1.2 + (name === 'sneak' ? 0.5 : 0),
        kneeR: Math.max(0, Math.cos(t * sp * Math.PI * 2)) * amp * 1.2 + (name === 'sneak' ? 0.5 : 0),
        armLx: ph2 * amp * 0.8, armRx: ph * amp * 0.8, elbL: -0.3 - (name === 'run' ? 0.9 : 0), elbR: -0.3 - (name === 'run' ? 0.9 : 0),
        torsoX: lean, headX: -lean * 0.6, torsoY: ph * 0.12 * amp, bob: Math.abs(Math.cos(t * sp * Math.PI * 2)) * 0.08 * amp - (name === 'sneak' ? 0.22 : 0), hipsY: -ph * 0.1 * amp};
    }
    case 'sword': // Schwert gezogen, kampfbereit
      return {...P0, armRx: -1.35, armRz: -0.1, elbR: -0.5, armLx: -0.5, armLz: 0.5, elbL: -0.9, legLx: -0.35, legRx: 0.4, kneeL: 0.5, kneeR: 0.2,
        torsoX: 0.12, torsoY: -0.25, headY: 0.2, bob: -0.12 + w(0.8) * 0.02};
    case 'swing': { // Schwerthieb, k = 0..1
      const a = lerp(-2.7, -0.6, k);
      return {...P0, armRx: a, elbR: -0.3, armLx: -0.4, armLz: 0.6, elbL: -1.0, torsoX: lerp(-0.15, 0.4, k), torsoY: lerp(0.35, -0.5, k),
        legLx: -0.4, legRx: 0.5, kneeL: 0.6, kneeR: 0.2, bob: -0.12, headX: 0.1};
    }
    case 'shock': { // erschrocken: Arme hoch, Oberkörper zurück, zittert
      const tr = w(9) * 0.03;
      return {...P0, armLx: -0.6, armLz: 1.0, elbL: -0.8, armRx: -0.6, armRz: -1.0, elbR: -0.8, torsoX: -0.2 + tr, headX: -0.15, legLx: 0.2, legRx: -0.15, kneeL: 0.3, bob: 0.03 + tr};
    }
    case 'power': { // Arme gespreizt, schwebt leicht (Augen glühen)
      const b = w(0.6);
      return {...P0, armLz: 1.35 + b * 0.05, armRz: -1.35 - b * 0.05, armLx: 0, armRx: 0, elbL: -0.1, elbR: -0.1, torsoX: -0.12, headX: -0.4, legLx: 0.12, legRx: -0.12, bob: 0.35 + b * 0.08};
    }
    case 'fall': { // Fallen mit rudernden Gliedern
      return {...P0, armLx: -2.4 + w(1.7) * 0.5, armLz: 0.9, elbL: -0.4, armRx: -2.4 + w(1.7, 2) * 0.5, armRz: -0.9, elbR: -0.4,
        legLx: w(1.9) * 0.7, legRx: w(1.9, 3) * 0.7, kneeL: 0.5 + w(1.9) * 0.4, kneeR: 0.5 + w(1.9, 3) * 0.4, torsoX: -0.2, headX: -0.3};
    }
    case 'point': // zeigt nach vorne
      return {...P0, armRx: -1.55, elbR: -0.05, armLx: 0.1, torsoX: 0.05, headY: 0.1, bob: w(0.5) * 0.01};
  }
};

const mix = (a: Pose, b: Pose, k: number): Pose =>
  Object.fromEntries(Object.keys(a).map((key) => [key, lerp((a as any)[key], (b as any)[key], k)])) as Pose;

/* ---------- Gesicht ---------- */
export type Face = {open: number; brow: number; browY: number; smile: number; mouthW: number; look: number};
const F0: Face = {open: 1, brow: 0, browY: 0, smile: 0, mouthW: 1, look: 0};
export type FaceName = 'neutral' | 'smile' | 'worry' | 'shock' | 'determined' | 'glow' | 'grin';
export const faceFor = (n: FaceName): Face => ({
  neutral: F0,
  smile: {...F0, smile: 0.9, brow: 0.05, open: 0.95},
  grin: {...F0, smile: 1.4, brow: -0.1, open: 0.8, mouthW: 1.3},
  worry: {...F0, brow: 0.35, browY: 0.02, smile: -0.7, mouthW: 0.8},
  shock: {...F0, brow: 0.1, browY: 0.1, open: 1.25, mouthW: 0.6},
  determined: {...F0, brow: -0.4, open: 0.8, smile: -0.2},
  glow: {...F0, brow: -0.15, browY: 0.04, open: 1.1, smile: 0},
}[n]);

type Props = {
  t: number; // Sekunden
  pose?: PoseName | [PoseName, PoseName, number]; // [von, nach, Mischung]
  face?: FaceName | [FaceName, FaceName, number];
  talk?: number; // 0..1 Mundöffnung durch Sprache
  glow?: number; // 0..1 silbern leuchtende Augen
  swingK?: number;
  prop?: 'lantern' | 'sword' | 'none';
  lanternOn?: boolean;
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
  blinkSeed?: number;
  ghost?: boolean; // durchscheinende Silhouette (Rückblick)
};

const SKIN = '#f2c29b', SKIN_D = '#d9a07a', HAIR = '#5b3a29', TUNIC = '#3f56b5', TRIM = '#f2b134',
  PANTS = '#2b3050', BOOT = '#6b4226', SCARF = '#ff7a3d', LEATHER = '#4b3425';

export const Finn: React.FC<Props> = ({t, pose = 'idle', face = 'neutral', talk = 0, glow = 0, swingK = 0, prop = 'none', lanternOn = true,
  position = [0, 0, 0], rotationY = 0, scale = 1, blinkSeed = 0, ghost = false}) => {
  const pa = Array.isArray(pose) ? pose : [pose, pose, 0] as const;
  const P = mix(poseFor(pa[0], t, swingK), poseFor(pa[1], t, swingK), pa[2]);
  const fa = Array.isArray(face) ? face : [face, face, 0] as const;
  const A = faceFor(fa[0]), B = faceFor(fa[1]);
  const Fc: Face = Object.fromEntries(Object.keys(A).map((k) => [k, lerp((A as any)[k], (B as any)[k], fa[2])])) as Face;

  // Blinzeln alle ~2.4 s für 5 Frames
  const bp = ((t + blinkSeed) % 2.4) / 2.4;
  const blink = bp > 0.93 ? 1 - Math.sin(((bp - 0.93) / 0.07) * Math.PI) : 1;
  const eyeOpen = Math.min(1.2, Fc.open) * blink;
  const mouthOpen = 0.02 + Math.max(0, (Fc.open - 1) * 0.12) + talk * 0.16;
  const sc = (n: number) => n; // lesbar
  const eyeCol = glow > 0.01 ? '#e9f4ff' : '#ffffff';
  const wing = Math.sin(t * 5);
  const mat = ghost ? 0.35 : undefined;
  const sk = ghost ? '#bcd8ff' : SKIN;

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <group position={[0, 1.15 + P.bob, 0]} rotation={[0, P.hipsY, 0]}>
        {/* Becken */}
        <Box s={[0.74, 0.3, 0.42]} c={ghost ? '#bcd8ff' : PANTS} opacity={mat} />
        {/* Beine */}
        {([[-1, P.legLx, P.kneeL], [1, P.legRx, P.kneeR]] as const).map(([side, lx, kn], i) => (
          <group key={i} position={[side * 0.2, -0.1, 0]} rotation={[lx, 0, 0]}>
            <Box p={[0, -0.27, 0]} s={[0.32, 0.56, 0.34]} c={ghost ? '#bcd8ff' : PANTS} opacity={mat} />
            <group position={[0, -0.55, 0]} rotation={[kn, 0, 0]}>
              <Box p={[0, -0.26, 0]} s={[0.28, 0.54, 0.3]} c={ghost ? '#bcd8ff' : PANTS} opacity={mat} />
              <Box p={[0, -0.45, 0]} s={[0.3, 0.2, 0.32]} c={ghost ? '#bcd8ff' : BOOT} opacity={mat} />{/* Stiefelschaft */}
              <Box p={[0, -0.56, 0.07]} s={[0.32, 0.16, 0.5]} c={ghost ? '#bcd8ff' : BOOT} opacity={mat} />
            </group>
          </group>
        ))}
        {/* Oberkörper */}
        <group position={[0, 0.15, 0]} rotation={[P.torsoX, P.torsoY, P.torsoZ]}>
          <Box p={[0, 0.5, 0]} s={[0.84, 0.95, 0.48]} c={ghost ? '#bcd8ff' : TUNIC} opacity={mat} />
          <Box p={[0, 0.5, 0.245]} s={[0.18, 0.95, 0.03]} c={TRIM} e={TRIM} ei={0.25} opacity={mat} />{/* Zierstreifen */}
          <Box p={[0, 0.02, 0]} s={[0.88, 0.14, 0.52]} c={LEATHER} opacity={mat} />{/* Gürtel */}
          <Box p={[0, 0.02, 0.27]} s={[0.17, 0.15, 0.04]} c="#ffd25a" e="#ffb300" ei={0.6} />{/* Schnalle */}
          <Box p={[-0.5, 0.0, 0.1]} s={[0.2, 0.28, 0.22]} c={LEATHER} />{/* Tasche */}
          {/* Schulterpolster */}
          <Box p={[-0.55, 0.93, 0]} s={[0.34, 0.16, 0.42]} c={LEATHER} />
          <Box p={[0.55, 0.93, 0]} s={[0.34, 0.16, 0.42]} c={LEATHER} />
          {/* Schal */}
          <Box p={[0, 1.02, 0]} s={[0.56, 0.2, 0.5]} c={SCARF} e={SCARF} ei={0.15} />
          {[0, 1, 2].map((i) => (
            <group key={i} position={[0.15, 1.0 - i * 0.02, -0.28 - i * 0.3]} rotation={[Math.sin(t * 4 + i * 0.8) * 0.25 + 0.15 * i, Math.sin(t * 3 + i) * 0.2, 0]}>
              <Box s={[0.22, 0.12, 0.34]} c={SCARF} e={SCARF} ei={0.15} />
            </group>
          ))}
          {/* Umhang */}
          <group position={[0, 0.95, -0.27]} rotation={[0.1 + Math.sin(t * 2.2) * 0.07 + P.torsoX * 0.5, 0, 0]}>
            <Box p={[0, -0.55, -0.02]} s={[0.78, 1.1, 0.06]} c="#7a2230" opacity={mat} />
            <group position={[0, -1.1, 0]} rotation={[Math.sin(t * 3) * 0.15, 0, 0]}>
              <Box p={[0, -0.18, 0]} s={[0.78, 0.36, 0.06]} c="#5d1927" opacity={mat} />
            </group>
          </group>
          {/* Hals + Kopf */}
          <Box p={[0, 1.1, 0]} s={[0.22, 0.16, 0.22]} c={sk} opacity={mat} />
          <group position={[0, 1.15, 0]} rotation={[P.headX, P.headY, P.headZ]}>
            <Box p={[0, 0.4, 0]} s={[0.74, 0.72, 0.72]} c={sk} opacity={mat} />
            {/* Ohren */}
            <Box p={[-0.39, 0.38, 0]} s={[0.06, 0.18, 0.14]} c={SKIN_D} />
            <Box p={[0.39, 0.38, 0]} s={[0.06, 0.18, 0.14]} c={SKIN_D} />
            {/* Haare */}
            <Box p={[0, 0.78, -0.02]} s={[0.8, 0.2, 0.78]} c={HAIR} />
            <Box p={[0, 0.68, -0.3]} s={[0.8, 0.5, 0.2]} c={HAIR} />
            <Box p={[-0.4, 0.55, 0]} s={[0.06, 0.4, 0.6]} c={HAIR} />
            <Box p={[0.4, 0.55, 0]} s={[0.06, 0.4, 0.6]} c={HAIR} />
            <Box p={[0.12, 0.78, 0.4]} s={[0.4, 0.14, 0.1]} c={HAIR} r={[0, 0, -0.2]} />
            <Box p={[-0.2, 0.79, 0.4]} s={[0.3, 0.12, 0.1]} c={HAIR} r={[0, 0, 0.25]} />
            <Box p={[0, 0.97, -0.05]} s={[0.14, 0.2, 0.3]} c={HAIR} r={[0.3, 0, 0]} />
            <Box p={[0.18, 0.92, -0.1]} s={[0.12, 0.18, 0.26]} c={HAIR} r={[0.2, 0, 0.3]} />
            <Box p={[-0.2, 0.9, 0]} s={[0.12, 0.14, 0.24]} c={glow > 0.3 ? '#dfe9ff' : '#8a6a52'} e={glow > 0.3 ? '#9fc4ff' : undefined} ei={glow * 1.5} />
            {/* Brille auf der Stirn */}
            <Box p={[0, 0.7, 0.03]} s={[0.78, 0.09, 0.76]} c={LEATHER} />
            <Box p={[-0.17, 0.72, 0.4]} s={[0.2, 0.2, 0.06]} c="#c8963c" metal={0.6} />
            <Box p={[0.17, 0.72, 0.4]} s={[0.2, 0.2, 0.06]} c="#c8963c" metal={0.6} />
            <Glow p={[-0.17, 0.72, 0.435]} s={[0.13, 0.13, 0.02]} c="#6fe3ff" />
            <Glow p={[0.17, 0.72, 0.435]} s={[0.13, 0.13, 0.02]} c="#6fe3ff" />
            {/* Augen */}
            {[-1, 1].map((sd) => (
              <group key={sd} position={[sd * 0.18, 0.4, 0.365]}>
                <Box s={[0.19, 0.22 * eyeOpen + 0.01, 0.03]} c={eyeCol} cast={false} />
                {glow > 0.01
                  ? <Glow p={[Fc.look * 0.02, 0, 0.02]} s={[0.15 + glow * 0.04, 0.2 * eyeOpen + 0.01, 0.03]} c="#cfe6ff" />
                  : <Box p={[Fc.look * 0.02, -0.005, 0.02]} s={[0.1, 0.14 * eyeOpen + 0.005, 0.03]} c="#1d3f5a" cast={false} />}
                {/* Augenbraue */}
                <Box p={[0, 0.2 + Fc.browY, 0.02]} s={[0.22, 0.05, 0.04]} c={HAIR} r={[0, 0, -sd * Fc.brow]} cast={false} />
              </group>
            ))}
            {/* Wangen + Nase */}
            <Box p={[-0.25, 0.25, 0.365]} s={[0.12, 0.07, 0.02]} c="#ee8f88" cast={false} />
            <Box p={[0.25, 0.25, 0.365]} s={[0.12, 0.07, 0.02]} c="#ee8f88" cast={false} />
            <Box p={[0, 0.3, 0.4]} s={[0.08, 0.1, 0.07]} c={SKIN_D} cast={false} />
            {/* Mund */}
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
              <Box p={[0, -0.25, 0]} s={[0.26, 0.5, 0.26]} c={ghost ? '#bcd8ff' : TUNIC} opacity={mat} />
              <group position={[0, -0.5, 0]} rotation={[el, 0, 0]}>
                <Box p={[0, -0.23, 0]} s={[0.23, 0.46, 0.23]} c={ghost ? '#bcd8ff' : '#2a3a82'} opacity={mat} />
                <Box p={[0, -0.12, 0]} s={[0.27, 0.12, 0.27]} c={LEATHER} />{/* Armschiene */}
                <Box p={[0, -0.54, 0]} s={[0.24, 0.2, 0.24]} c={sk} opacity={mat} />
                {sd === 1 && prop === 'sword' && (
                  <group position={[0, -0.55, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
                    <Box p={[0, 0.0, 0]} s={[0.09, 0.3, 0.09]} c={LEATHER} />
                    <Box p={[0, 0.18, 0]} s={[0.5, 0.07, 0.14]} c="#c8963c" metal={0.7} />
                    <Box p={[0, 0.9, 0]} s={[0.12, 1.4, 0.04]} c="#dfeeff" metal={0.9} rough={0.2} e="#7fd0ff" ei={0.6} />
                    <Glow p={[0, 0.9, 0]} s={[0.05, 1.38, 0.05]} c="#bfe9ff" opacity={0.7} />
                  </group>
                )}
                {sd === -1 && prop === 'lantern' && (
                  <group position={[0, -0.7, 0.05]} rotation={[-P.armLx - P.elbL - 0.05 + Math.sin(t * 2) * 0.05, 0, 0]}>
                    <Box p={[0, 0.3, 0]} s={[0.04, 0.4, 0.04]} c="#333" cast={false} />
                    <Box p={[0, 0.0, 0]} s={[0.34, 0.06, 0.34]} c="#2d2d2d" />
                    <Box p={[0, 0.5 - 0.5, 0]} s={[0.3, 0.38, 0.3]} c="#ffe39a" e="#ffb347" ei={lanternOn ? 2.2 : 0} opacity={0.9} cast={false} />
                    <Box p={[0, -0.22, 0]} s={[0.36, 0.06, 0.36]} c="#2d2d2d" />
                    {lanternOn && <pointLight position={[0, 0, 0.1]} color="#ffb860" intensity={14} distance={11} decay={1.6} />}
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
