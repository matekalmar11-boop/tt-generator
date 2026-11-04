/**
 * Requisiten für Erklärfilme (Meilenstein M1 „Die Truman Show“): versteckte Kamera, Studio-Scheinwerfer, künstlicher Himmel.
 * Alles aus Blöcken (RBox/Box/Glow) im Stil der Figur person2. Eigenständige Gestaltung, keine Nachbauten fremder Assets.
 */
import React from 'react';
import * as THREE from 'three';
import {random} from 'remotion';
import {Box, Glow} from '../lib/Box';
import {shade} from '../lib/color';
import {RBox} from './RBox';
import type {V3} from '../lib/anim';

/* ───────── Versteckte Kamera ─────────
 * host: hedge (Hecke) · lamp (Laternenpfahl) · mailbox (Briefkasten) · none (nur die Kamera).
 * Die Linse zeigt in +z; aim = Blickziel (Weltposition), die Kamera dreht sich dorthin. Rotes REC-Licht blinkt, Halo macht sie auffindbar. */
export const HiddenCamera: React.FC<{host?: string; aim?: V3; at?: V3; t: number; scale?: number; color?: string; yaw?: number}> =
  ({host = 'hedge', aim, at = [0, 0, 0], t, scale = 1, color = '#aab0c6', yaw = 0}) => {
    // Kameraposition in Gruppenkoordinaten (vor der Skalierung)
    const camP: V3 = host === 'hedge' ? [0, 1.55, 0.05] : host === 'lamp' ? [0.0, 4.15, 0.45] : host === 'mailbox' ? [0, 1.95, 0.3] : [0, 0, 0];
    let ry = yaw, rx = 0;
    if (aim) {
      const dx = aim[0] - (at[0] + camP[0] * scale), dz = aim[2] - (at[2] + camP[2] * scale), dy = aim[1] - (at[1] + camP[1] * scale);
      ry = Math.atan2(dx, dz); rx = -Math.atan2(dy, Math.hypot(dx, dz));
    }
    const blinkOn = Math.floor(t * 2.2) % 2 === 0 ? 1 : 0.25;
    const leaf = '#3f9a52';
    return (
      <group position={at} scale={scale}>
        {host === 'hedge' && (
          <group>
            <RBox p={[0, 0.55, 0]} s={[1.3, 1.1, 1.3]} c={leaf} r={0.25} outline={0.025} />
            {[[-0.3, -0.3], [0.3, -0.2], [-0.25, 0.3], [0.3, 0.3]].map(([x, z], i) => <RBox key={i} p={[x, 1.18 + (i % 2) * 0.08, z]} s={[0.6, 0.4, 0.6]} c={shade(leaf, i % 2 ? 1.12 : 0.92)} r={0.18} outline={0.02} />)}
          </group>
        )}
        {host === 'lamp' && (
          <group>
            <RBox p={[0, 2.0, -0.05]} s={[0.26, 4.0, 0.26]} c="#4b4f63" r={0.1} outline={0.02} />
            <RBox p={[0, 4.15, 0]} s={[0.9, 0.22, 0.9]} c="#4b4f63" r={0.08} outline={0.02} />
          </group>
        )}
        {host === 'mailbox' && (
          <group>
            <RBox p={[0, 0.75, -0.1]} s={[0.22, 1.5, 0.22]} c="#6b5a48" r={0.08} outline={0.02} />
            <RBox p={[0, 1.55, -0.1]} s={[0.95, 0.7, 0.7]} c="#3f78d9" r={0.18} outline={0.025} />
          </group>
        )}
        <group position={camP} rotation={new THREE.Euler(rx, ry, 0, 'YXZ')}>
          <RBox s={[0.62, 0.46, 0.7]} c={color} r={0.1} outline={0.02} />
          <mesh position={[0, 0, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.25, 0.28, 0.24, 14]} />
            <meshStandardMaterial color="#171a24" roughness={0.4} />
          </mesh>
          <Glow p={[0, 0, 0.55]} s={[0.34, 0.34, 0.02]} c="#6ec8ff" />
          <Glow p={[0.2, 0.2, 0.2]} s={[0.12, 0.12, 0.12]} c="#ff2a2a" opacity={blinkOn} />
          <mesh position={[0.2, 0.2, 0.2]}>
            <sphereGeometry args={[0.26, 10, 8]} />
            <meshBasicMaterial color="#ff3a3a" transparent opacity={0.28 * blinkOn} toneMapped={false} depthWrite={false} />
          </mesh>
        </group>
      </group>
    );
  };

/* ───────── Studio-Scheinwerfer ─────────
 * Hängt am Kabel (cable = sichtbare Länge nach oben). rot = [x,y,z]-Drehung (Taumeln beim Sturz), beam 0..1 = Lichtkegel/Licht. */
export const StageLight: React.FC<{scale?: number; cable?: number; rot?: V3; beam?: number; cone?: boolean}> =
  ({scale = 1, cable = 6, rot = [0, 0, 0], beam = 1, cone = true}) => (
    <group scale={scale} rotation={rot}>
      <RBox p={[0, 0.9, 0]} s={[0.16, cable, 0.16]} c="#20222c" r={0.05} outline={0.015} />
      <RBox p={[0, 0, -0.1]} s={[1.5, 0.18, 0.18]} c="#4a4d5c" r={0.06} outline={0.02} />
      <RBox p={[0, -0.05, 0]} s={[1.0, 1.0, 1.35]} c="#2a2c38" r={0.2} outline={0.03} />
      <RBox p={[0, -0.05, 0.72]} s={[1.12, 1.12, 0.14]} c="#4a4d5c" r={0.1} outline={0.02} />
      <Glow p={[0, -0.05, 0.8]} s={[0.78, 0.78, 0.04]} c="#fff4cf" opacity={0.35 + 0.65 * beam} />
      {[[0, 0.7], [0, -0.7], [0.7, 0], [-0.7, 0]].map(([x, y], i) => (
        <RBox key={i} p={[x * 0.9, y * 0.9 - 0.05, 0.98]} s={x ? [0.06, 1.0, 0.5] : [1.0, 0.06, 0.5]} c="#14151c" r={0.02} outline={0.01} rot={[y * -0.35, x * 0.35, 0]} />
      ))}
      {cone && beam > 0.02 && (
        <mesh position={[0, -0.05, 3.9]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[1.5, 6, 16, 1, true]} />
          <meshBasicMaterial color="#fff0b8" transparent opacity={0.16 * beam} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {beam > 0.02 && <pointLight position={[0, 0, 1.2]} color="#fff0c8" intensity={14 * beam} distance={14} />}
    </group>
  );

/* ───────── Künstlicher Himmel ─────────
 * Flache Himmelsplatte mit aufgemalten Wolken, Stahlträgern und einer Luke (hatch ≥ 0). Unterseite zeigt nach unten (−y). */
export const SkyPanel: React.FC<{size?: number; hatch?: number; sky?: string; seed?: string; clouds?: number}> = ({size = 70, hatch = 5, sky = '#4f9de0', seed = 'sky', clouds: nClouds = 26}) => {
  const clouds = React.useMemo(() => Array.from({length: nClouds}, (_, i) => ({
    x: (random(seed + 'x' + i) - 0.5) * size * 0.8, z: (random(seed + 'z' + i) - 0.5) * size * 0.8,
    w: 6 + random(seed + 'w' + i) * 7, d: 3 + random(seed + 'd' + i) * 3,
  })).filter((c) => Math.hypot(c.x, c.z) > hatch * 1.2), [seed, size, hatch, nClouds]);
  const half = size / 2, strip = (size - hatch) / 2;
  const T = 0.8;
  return (
    <group>
      {/* Platte als 4 Streifen um die Luke */}
      <Glow p={[0, 0, -(hatch / 2 + strip / 2)]} s={[size, T, strip]} c={sky} />
      <Glow p={[0, 0, hatch / 2 + strip / 2]} s={[size, T, strip]} c={sky} />
      <Glow p={[-(hatch / 2 + strip / 2), 0, 0]} s={[strip, T, hatch]} c={sky} />
      <Glow p={[hatch / 2 + strip / 2, 0, 0]} s={[strip, T, hatch]} c={sky} />
      {/* aufgemalte Wolken (flach unter der Platte) */}
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, -T / 2 - 0.03, c.z]}>
          <Glow p={[0, 0, 0]} s={[c.w, 0.06, c.d]} c="#ffffff" />
          <Glow p={[c.w * 0.18, -0.03, c.d * 0.35]} s={[c.w * 0.5, 0.06, c.d * 0.8]} c="#e8f3ff" />
        </group>
      ))}
      {/* Stahlträger und Rahmen: zeigt, dass der Himmel gebaut ist */}
      {[-0.4, -0.2, 0.2, 0.4].map((k, i) => <Box key={'x' + i} p={[k * size, -T / 2 - 0.35, 0]} s={[0.5, 0.7, size]} c="#2c3040" cast={false} recv={false} />)}
      {[-0.4, -0.25, -0.1, 0.1, 0.25, 0.4].map((k, i) => <Box key={'z' + i} p={[0, -T / 2 - 0.2, k * size]} s={[size, 0.4, 0.4]} c="#3a3f52" cast={false} recv={false} />)}
      <Box p={[0, -T / 2 - 0.1, -half]} s={[size, 0.9, 0.5]} c="#3a3f52" cast={false} recv={false} />
      <Box p={[0, -T / 2 - 0.1, half]} s={[size, 0.9, 0.5]} c="#3a3f52" cast={false} recv={false} />
      {/* Luke: Rahmen, dunkler Schacht, Klappen (nur bei hatch > 0; hatch 0 = geschlossene Platte, z. B. als Wand mit rot) */}
      {hatch > 0 && [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([x, z], i) => (
        <Box key={'h' + i} p={[x * (hatch / 2 + 0.15), -T / 2 - 0.15, z * (hatch / 2 + 0.15)]} s={x ? [0.3, 0.5, hatch + 0.6] : [hatch + 0.6, 0.5, 0.3]} c="#e0b236" cast={false} recv={false} />
      ))}
      {hatch > 0 && <Box p={[0, T / 2 + 0.6, 0]} s={[hatch, 0.2, hatch]} c="#0b0d14" cast={false} recv={false} />}
    </group>
  );
};

/* ───────── Segelboot (stilisiert, aus Blöcken) ─────────
 * Bug zeigt in −z (yaw 0), Heck bei +z (Steuermann bei z ≈ +1,3·scale). Ursprung = Mitte des Rumpfs auf der Wasserlinie; Deck bei y ≈ 0,72·scale.
 * bob = Stärke des Schaukelns (Sturm: 3), sails false = Segel und Mast weg (vertäutes Boot). Segel unbeleuchtet (hell, wie aufgemalt). */
export const SailBoat: React.FC<{t: number; scale?: number; hull?: string; sail?: string; bob?: number; yaw?: number; sails?: boolean}> =
  ({t, scale = 2.0, hull = '#d9534f', sail = '#fffaf0', bob = 1, yaw = 0, sails = true}) => (
    <group scale={scale} rotation={[0, yaw, 0]}>
      <group position={[0, Math.sin(t * 1.7) * 0.05 * bob, 0]} rotation={[Math.sin(t * 1.3) * 0.035 * bob, 0, Math.sin(t * 0.9) * 0.06 * bob]}>
        <RBox p={[0, 0.3, 0]} s={[1.5, 0.7, 3.4]} c={hull} r={0.28} outline={0.03} />
        <RBox p={[0, 0.3, -1.7]} s={[1.0, 0.65, 1.0]} c={hull} r={0.32} outline={0.03} />
        <RBox p={[0, 0.52, 0]} s={[1.54, 0.12, 3.44]} c="#ffffff" r={0.05} outline={0.02} />
        <RBox p={[0, 0.68, 0.1]} s={[1.2, 0.08, 3.0]} c="#d9b27a" r={0.03} outline={0.02} />
        {sails && <RBox p={[0, 2.5, -0.7]} s={[0.12, 3.6, 0.12]} c="#7a5a3a" r={0.04} outline={0.02} />}
        {sails && <RBox p={[0, 1.5, 0.35]} s={[0.1, 0.1, 2.1]} c="#7a5a3a" r={0.03} outline={0.015} />}
        {sails && <Glow p={[0, 2.95, 0.3]} s={[0.05, 2.6, 2.0]} c={sail} />}
        {sails && <Glow p={[0, 2.5, -1.15]} s={[0.05, 2.2, 0.7]} c="#ff7b6b" />}
        {sails && <Glow p={[0, 4.55, -0.7]} s={[0.02, 0.4, 0.6]} c="#ffd23d" />}
      </group>
    </group>
  );

/* ───────── Verlassenes Auto (stilisiert, abgerundet) ─────────
 * Fahrtrichtung = +z lokal (Front bei +z); yaw dreht das Auto. open = Fahrertür offen (0..1), lights = Scheinwerfer an. */
export const Car: React.FC<{color?: string; open?: number; lights?: boolean; scale?: number}> = ({color = '#d9534f', open = 0, lights = false, scale = 1.25}) => (
  <group scale={scale}>
    <RBox p={[0, 0.62, 0]} s={[1.9, 0.75, 4.2]} c={color} r={0.3} outline={0.03} />
    <RBox p={[0, 1.2, -0.25]} s={[1.65, 0.62, 2.2]} c={shade(color, 0.85)} r={0.26} outline={0.03} />
    <Glow p={[0, 1.22, 0.86]} s={[1.4, 0.4, 0.03]} c="#9fc8ff" />
    <Glow p={[0.84, 1.22, -0.25]} s={[0.03, 0.38, 1.7]} c="#9fc8ff" />
    <Glow p={[-0.84, 1.22, -0.25]} s={[0.03, 0.38, 1.7]} c="#9fc8ff" />
    {[[-0.95, -1.3], [0.95, -1.3], [-0.95, 1.3], [0.95, 1.3]].map(([x, z], k) => <RBox key={k} p={[x, 0.3, z]} s={[0.28, 0.6, 0.6]} c="#16161c" r={0.1} outline={0.015} />)}
    <Glow p={[-0.6, 0.7, 2.11]} s={[0.4, 0.22, 0.04]} c={lights ? '#fff6d0' : '#cfd6e6'} />
    <Glow p={[0.6, 0.7, 2.11]} s={[0.4, 0.22, 0.04]} c={lights ? '#fff6d0' : '#cfd6e6'} />
    <Glow p={[-0.6, 0.7, -2.11]} s={[0.35, 0.18, 0.04]} c="#ff4d4d" />
    <Glow p={[0.6, 0.7, -2.11]} s={[0.35, 0.18, 0.04]} c="#ff4d4d" />
    {open > 0.01 && <RBox p={[1.0 + open * 0.5, 0.95, 0.3]} s={[0.12, 0.7, 1.3]} c={shade(color, 0.9)} r={0.05} outline={0.02} rot={[0, open * 0.9, 0]} />}
    {lights && <pointLight position={[0, 0.8, 3.4]} color="#fff0c8" intensity={9} distance={9} decay={1.6} />}
  </group>
);

/* ───────── Telefonzelle mit klingelndem Telefon ─────────
 * ring 0..1 = Klingeln (Telefon rüttelt, Lämpchen pulsiert, orangefarbenes Licht). Offene Seite zeigt nach +z. */
export const PhoneBooth: React.FC<{t: number; ring?: number; color?: string; scale?: number; handset?: boolean}> = ({t, ring = 0, color = '#d93a3a', scale = 1, handset = true}) => {
  const shake = ring > 0 ? Math.sin(t * 55) * 0.04 * ring : 0;
  const pulse = ring > 0 ? (Math.floor(t * 6) % 2 === 0 ? 1 : 0.2) : 0;
  return (
    <group scale={scale}>
      <RBox p={[0, 0.15, 0]} s={[2.4, 0.3, 2.4]} c="#6d7285" r={0.08} outline={0.03} />
      {[[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]].map(([x, z], i) => <RBox key={i} p={[x, 2.8, z]} s={[0.22, 5.0, 0.22]} c={color} r={0.07} outline={0.03} />)}
      <RBox p={[0, 5.45, 0]} s={[2.6, 0.5, 2.6]} c={color} r={0.12} outline={0.03} />
      <RBox p={[0, 5.9, 0]} s={[1.8, 0.35, 1.8]} c={shade(color, 0.85)} r={0.1} outline={0.03} />
      <Glow p={[0, 5.46, 1.32]} s={[1.6, 0.3, 0.04]} c="#fff6d6" />
      {[[0, -1.1, 2.4, 0.04], [-1.1, 0, 0.04, 2.4], [1.1, 0, 0.04, 2.4]].map(([x, z, w, d], i) => <Glow key={i} p={[x, 2.8, z]} s={[w, 4.6, d]} c="#a8d4ff" opacity={0.12} />)}
      <RBox p={[0, 3.3, -0.85 + shake]} s={[1.0, 1.3, 0.4]} c="#b8902a" r={0.1} outline={0.03} rot={[0, 0, shake * 3]} />
      <RBox p={[0, 3.55 + shake, -0.62]} s={[0.78, 0.5, 0.06]} c="#1f2130" r={0.05} outline={0.02} />
      {[0, 1, 2].flatMap((cx) => [0, 1, 2].map((cy) => <RBox key={`k${cx}${cy}`} p={[(cx - 1) * 0.22, 3.05 - cy * 0.2 + shake, -0.64]} s={[0.15, 0.12, 0.05]} c="#e8e8f0" r={0.04} outline={0.01} />))}
      {handset && <RBox p={[-0.68 + shake, 3.35, -0.7]} s={[0.22, 1.1, 0.3]} c="#15161e" r={0.1} outline={0.03} rot={[0, 0, 0.1 + shake * 4]} />}
      <Glow p={[0, 3.9, -0.62]} s={[0.35, 0.16, 0.04]} c="#ff9f1a" opacity={0.3 + 0.7 * pulse} />
      {ring > 0 && <pointLight position={[0, 3.6, 0.6]} color="#ffa63a" intensity={ring * pulse * 26} distance={9} decay={1.6} />}
    </group>
  );
};
