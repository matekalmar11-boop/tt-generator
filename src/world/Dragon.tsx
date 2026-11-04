import React from 'react';
import {Box, Glow} from '../lib/Box';
import type {V3} from '../lib/anim';

type Props = {
  t: number;
  position?: V3;
  rotationY?: number;
  scale?: number;
  talk?: number; // 0..1 Maulöffnung
  roar?: number; // 0..1 zusätzlicher Brüll-Effekt
  coil?: number; // 0 = gestreckt/fliegend, 1 = zusammengerollt
  flap?: number; // Flügelschlag-Tempo
  shard?: boolean; // Mondsplitter im Maul
  lights?: boolean;
};

const N = 9;
/** Pfad der Körpersegmente (lokal): Kopf bei s=0, Schwanz bei s=1 */
export const dragonPath = (t: number, coil: number, s: number): V3 => {
  const wave = Math.sin(t * 1.8 - s * 5) * (0.25 + s * 0.6) * (1 - coil);
  const ang = s * 7.0 * coil + 0.3;
  const rad = (1.6 - s * 0.9) * coil;
  const fly: V3 = [wave, 1.6 + Math.sin(t * 1.8 - s * 4) * 0.25 - s * 0.2, s * 4.2];
  const curl: V3 = [Math.cos(ang) * rad, 0.6 + s * 0.7 + Math.sin(t * 1.2) * 0.05, Math.sin(ang) * rad];
  return [fly[0] * (1 - coil) + curl[0] * coil, fly[1] * (1 - coil) + curl[1] * coil, fly[2] * (1 - coil) + curl[2] * coil];
};

/** Kopfposition + Blickrichtung in Weltkoordinaten (für Kamerafahrten). */
export const dragonHead = (t: number, coil: number, base: V3, rotY: number, scale = 1) => {
  const h = dragonPath(t, coil, 0), n = dragonPath(t, coil, 0.04);
  const rot = (v: V3): V3 => [(v[0] * Math.cos(rotY) + v[2] * Math.sin(rotY)) * scale, v[1] * scale, (-v[0] * Math.sin(rotY) + v[2] * Math.cos(rotY)) * scale];
  const hp = rot(h);
  const fw = rot([h[0] - n[0], h[1] - n[1], h[2] - n[2]]);
  const l = Math.hypot(...fw) || 1;
  return {pos: [base[0] + hp[0], base[1] + hp[1], base[2] + hp[2]] as V3, fwd: [fw[0] / l, fw[1] / l, fw[2] / l] as V3};
};

const BODY = '#fff0b8', GLOWC = '#ffc94d', CYAN = '#7ff3ff';

/** Drache aus Licht: Schlangenkörper aus Blöcken, Flügel, Hörner, Mondsplitter im Maul. */
export const Dragon: React.FC<Props> = ({t, position = [0, 0, 0], rotationY = 0, scale = 1, talk = 0, roar = 0, coil = 0, flap = 1, shard = false, lights = true}) => {
  const path = (q: number) => dragonPath(t, coil, q);
  const segs = Array.from({length: N}, (_, i) => {
    const s = i / (N - 1);
    const a = path(s), b = path(Math.min(1, s + 0.04)), c = path(Math.max(0, s - 0.04));
    const d: V3 = [c[0] - b[0], c[1] - b[1], c[2] - b[2]]; // Richtung: Schwanz -> Kopf (zeigt nach vorn)
    const yaw = Math.atan2(d[0], d[2]);
    const pitch = -Math.atan2(d[1], Math.hypot(d[0], d[2]));
    return {i, s, p: a, yaw, pitch, size: 0.95 - s * 0.62};
  });
  const head = path(0);
  const hs = segs[0];
  const jaw = 0.1 + talk * 0.5 + roar * 0.6;
  const fl = Math.sin(t * 6 * flap) * 0.55 * (1 - coil * 0.6);
  const pulse = 1 + Math.sin(t * 5) * 0.12;

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {segs.slice(1).map((sg) => (
        <group key={sg.i} position={sg.p} rotation={[sg.pitch, sg.yaw, 0]}>
          <Box s={[sg.size, sg.size * 0.9, sg.size * 1.15]} c={BODY} e={GLOWC} ei={0.5 * pulse} cast={false} />
          <Box p={[0, sg.size * 0.55, 0]} s={[sg.size * 0.2, sg.size * 0.3, sg.size * 0.5]} c={CYAN} e={CYAN} ei={1.2} cast={false} />
        </group>
      ))}
      {/* Kopf */}
      <group position={head} rotation={[hs.pitch * 0.5 - 0.1, hs.yaw, 0]}>
        <Box s={[0.95, 0.75, 1.0]} c={BODY} e={GLOWC} ei={0.55 * pulse} cast={false} />
        <Box p={[0, 0.02, 0.75]} s={[0.7, 0.45, 0.6]} c={BODY} e={GLOWC} ei={0.55} cast={false} />
        {/* Unterkiefer */}
        <group position={[0, -0.22, 0.45]} rotation={[jaw, 0, 0]}>
          <Box p={[0, -0.04, 0.3]} s={[0.62, 0.17, 0.85]} c="#ffe08a" e={GLOWC} ei={0.5} cast={false} />
          <Box p={[-0.22, 0.09, 0.55]} s={[0.07, 0.12, 0.07]} c="#fff" cast={false} />
          <Box p={[0.22, 0.09, 0.55]} s={[0.07, 0.12, 0.07]} c="#fff" cast={false} />
        </group>
        <Box p={[-0.22, -0.2, 1.0]} s={[0.07, 0.14, 0.07]} c="#fff" cast={false} />
        <Box p={[0.22, -0.2, 1.0]} s={[0.07, 0.14, 0.07]} c="#fff" cast={false} />
        {shard && (
          <group position={[0, -0.18, 0.95]} rotation={[0.3, t * 0.8, 0.2]}>
            <Glow shape="octa" s={[0.22, 0.5, 0.18]} c="#ffffff" />
            <Glow shape="octa" s={[0.34, 0.74, 0.28]} c="#cfe0ff" opacity={0.25} />
          </group>
        )}
        {/* Augen */}
        <Glow p={[-0.5, 0.15, 0.3]} s={[0.06, 0.2, 0.22]} c="#34e0ff" />
        <Glow p={[0.5, 0.15, 0.3]} s={[0.06, 0.2, 0.22]} c="#34e0ff" />
        {/* Hörner & Stacheln */}
        <Glow shape="cone" p={[-0.3, 0.6, -0.2]} s={[0.14, 0.7, 0.14]} r={[-0.5, 0, 0.25]} c="#ffffff" />
        <Glow shape="cone" p={[0.3, 0.6, -0.2]} s={[0.14, 0.7, 0.14]} r={[-0.5, 0, -0.25]} c="#ffffff" />
        <Box p={[0, 0.5, -0.3]} s={[0.12, 0.25, 0.3]} c={CYAN} e={CYAN} ei={1.2} cast={false} />
        {lights && <pointLight color="#ffd27a" intensity={10} distance={12} decay={1.5} position={[0, 0.5, 1]} />}
      </group>
      {/* Flügel */}
      {[-1, 1].map((sd) => {
        const bp = segs[2].p;
        return (
          <group key={sd} position={[bp[0] + sd * 0.4, bp[1] + 0.4, bp[2]]} rotation={[0, 0, sd * (0.5 + fl)]}>
            <group position={[sd * 0.9, 0, 0]}>
              <Box p={[0, 0, 0]} s={[1.8, 0.1, 0.35]} c="#ffe9a8" e={GLOWC} ei={0.5} cast={false} />
              <Box p={[sd * 0.1, 0, 0.75]} s={[1.6, 0.05, 1.1]} c={CYAN} e={CYAN} ei={0.55} opacity={0.75} cast={false} />
              <Box p={[sd * 0.5, 0, 1.4]} s={[1.0, 0.04, 0.7]} c={CYAN} e={CYAN} ei={0.55} opacity={0.65} cast={false} />
            </group>
          </group>
        );
      })}
    </group>
  );
};
