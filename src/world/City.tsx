/**
 * Kulisse "city_street": Straße entlang z (Tiefe), Gehwege, Häuserfronten mit beleuchteten Fenstern, Laternen, Autos, Bäume, Skyline.
 * Maße: Fahrbahn x ±4 (Oberfläche y = −0.12), Gehwege |x| 4…7 (Oberfläche y = 0 → Figuren hier mit y = 0), Häuser ab |x| = 7,
 * Länge z +30 … −90, ferne Skyline bei z ≈ −100. Kamera üblicherweise bei +z, Blick nach −z; Nebel der Szene erzeugt die Tiefenwirkung.
 * Alles aus Blöcken (Box/Glow); alle Fenster in EINEM InstancedMesh.
 */
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {random} from 'remotion';
import {Box, Glow} from '../lib/Box';
import {shade} from '../lib/color';
import type {V3} from '../lib/anim';

const R = (seed: string, a = 0, b = 1) => a + random(seed) * (b - a);

export type CityParams = {building?: string; road?: string; sidewalk?: string; accent?: string; lamps?: boolean; cars?: boolean; trees?: boolean; windows?: number; seed?: string};

type Bld = {x: number; z: number; w: number; d: number; h: number; c: string; side: number; awning: string};
type Win = {p: V3; s: V3; c: THREE.Color};

const Z_NEAR = 30, Z_FAR = -90;

export const CityStreet: React.FC<CityParams> = ({
  building = '#5d6385', road = '#2b2d3a', sidewalk = '#8b8fa3', accent = '#ff9f43', lamps = true, cars = true, trees = true, windows = 0.55, seed = 'city',
}) => {
  const {blds, wins} = useMemo(() => {
    const palette = [building, shade(building, 1.15), shade(building, 0.85), '#7a6a7a', '#6a7a7a'];
    const blds: Bld[] = [];
    for (const side of [-1, 1]) {
      let z = Z_NEAR;
      let i = 0;
      while (z > Z_FAR) {
        const w = R(`${seed}w${side}${i}`, 5, 9), d = R(`${seed}d${side}${i}`, 6, 10);
        const far = (Z_NEAR - z) / (Z_NEAR - Z_FAR); // weiter weg = höher (Straßenschlucht)
        const h = R(`${seed}h${side}${i}`, 9, 18) + far * 10;
        blds.push({x: side * (7 + d / 2), z: z - w / 2, w, d, h, c: palette[Math.floor(R(`${seed}c${side}${i}`) * palette.length)], side,
          awning: [accent, '#d9534f', '#3fb6a8', '#e8c547'][Math.floor(R(`${seed}a${side}${i}`) * 4)]});
        z -= w + R(`${seed}g${side}${i}`, 0, 0.3);
        i++;
      }
    }
    const wins: Win[] = [];
    const dark = new THREE.Color('#1f2540'), lit = [new THREE.Color('#ffd98a'), new THREE.Color('#ffc46b'), new THREE.Color('#fff1c4')];
    blds.forEach((b, bi) => {
      const x = b.side * 6.96; // Fassade zur Straße
      const cols = Math.max(2, Math.floor((b.w - 0.8) / 1.7)), rows = Math.floor((b.h - 4) / 2.3);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const on = R(`${seed}win${bi}_${r}_${c}`) < windows;
        wins.push({p: [x, 4 + r * 2.3, b.z + (c - (cols - 1) / 2) * 1.7], s: [0.08, 1.0, 1.0], c: on ? lit[Math.floor(R(`${seed}wc${bi}_${r}_${c}`) * 3)] : dark});
      }
    });
    return {blds, wins};
  }, [building, accent, windows, seed]);

  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    wins.forEach((w, i) => {
      o.position.set(...w.p); o.scale.set(...w.s); o.updateMatrix();
      m.setMatrixAt(i, o.matrix); m.setColorAt(i, w.c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [wins]);

  const len = Z_NEAR - Z_FAR, mid = (Z_NEAR + Z_FAR) / 2;
  const lampZ = Array.from({length: 11}, (_, i) => Z_NEAR - 6 - i * 10);
  return (
    <group>
      {/* Fahrbahn, Bordsteine, Gehwege */}
      <Box p={[0, -0.22, mid]} s={[8, 0.2, len]} c={road} cast={false} />
      {[-1, 1].map((sd) => (
        <React.Fragment key={sd}>
          <Box p={[sd * 5.5, -0.15, mid]} s={[3, 0.3, len]} c={sidewalk} cast={false} />
          <Box p={[sd * 4.05, -0.06, mid]} s={[0.12, 0.12, len]} c={shade(sidewalk, 1.15)} cast={false} />
          {Array.from({length: 40}, (_, i) => <Box key={i} p={[sd * 5.5, 0.001, Z_NEAR - 1 - i * 3]} s={[3, 0.004, 0.06]} c={shade(sidewalk, 0.8)} cast={false} recv={false} />)}
        </React.Fragment>
      ))}
      {/* Mittellinie + Zebrastreifen bei z = 6 */}
      {Array.from({length: 28}, (_, i) => <Box key={i} p={[0, -0.115, Z_NEAR - 2 - i * 4]} s={[0.2, 0.01, 2]} c="#e8e2c4" cast={false} recv={false} />)}
      {Array.from({length: 7}, (_, i) => <Box key={i} p={[-3 + i, -0.115, 6]} s={[0.55, 0.01, 3]} c="#f2f2f2" cast={false} recv={false} />)}

      {/* Häuser */}
      {blds.map((b, i) => (
        <group key={i}>
          <Box p={[b.x, b.h / 2 - 0.1, b.z]} s={[b.d, b.h, b.w]} c={b.c} />
          <Box p={[b.side * 6.9, b.h - 0.1, b.z]} s={[0.3, 0.5, b.w + 0.1]} c={shade(b.c, 0.7)} />{/* Dachkante */}
          <Box p={[b.side * 6.85, 1.2, b.z]} s={[0.3, 2.4, b.w - 0.4]} c={shade(b.c, 0.6)} />{/* Sockel/Erdgeschoss */}
          <Glow p={[b.side * 6.97, 1.4, b.z]} s={[0.05, 1.5, Math.max(2, b.w - 2)]} c="#ffe2a0" />{/* Schaufenster */}
          <Box p={[b.side * 6.4, 2.55, b.z]} s={[1.2, 0.18, Math.max(2.4, b.w - 1.6)]} c={b.awning} r={[0, 0, b.side * 0.25]} />{/* Markise */}
        </group>
      ))}
      <instancedMesh ref={ref} args={[undefined, undefined, wins.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* ferne Skyline */}
      {Array.from({length: 16}, (_, i) => {
        const x = -45 + i * 6 + R(`${seed}sx${i}`, -1.5, 1.5), h = R(`${seed}sh${i}`, 25, 55);
        return (
          <group key={i}>
            <Box p={[x, h / 2, -105 - R(`${seed}sz${i}`, 0, 12)]} s={[R(`${seed}sw${i}`, 5, 8), h, 6]} c={shade(building, 0.55)} cast={false} />
            <Glow p={[x, h * 0.6, -101]} s={[0.6, 0.6, 0.05]} c="#ffd98a" />
          </group>
        );
      })}

      {/* Laternen (die nächsten vier mit echtem Licht) */}
      {lamps && [-1, 1].flatMap((sd) => lampZ.map((z, i) => (
        <group key={`${sd}_${i}`} position={[sd * 4.4, 0, sd > 0 ? z : z - 5]}>
          <Box p={[0, 2.6, 0]} s={[0.14, 5.2, 0.14]} c="#2a2c36" />
          <Box p={[-sd * 0.45, 5.15, 0]} s={[0.9, 0.1, 0.12]} c="#2a2c36" />
          <Glow p={[-sd * 0.85, 5.0, 0]} s={[0.4, 0.22, 0.4]} c="#ffe2a0" />
          {i < 4 && <pointLight position={[-sd * 0.85, 4.7, 0]} color="#ffd89a" intensity={16} distance={14} decay={1.6} />}
        </group>
      )))}

      {/* Bäume */}
      {trees && [-1, 1].flatMap((sd) => Array.from({length: 7}, (_, i) => (
        <group key={`${sd}_${i}`} position={[sd * 6.4, 0, Z_NEAR - 12 - i * 14 - (sd > 0 ? 0 : 7)]}>
          <Box p={[0, 0.9, 0]} s={[0.3, 1.8, 0.3]} c="#5a3a22" />
          <Box p={[0, 2.5, 0]} s={[1.6, 1.4, 1.6]} c="#3f7a58" />
          <Box p={[0, 3.4, 0]} s={[1.0, 0.9, 1.0]} c="#4d8f68" />
        </group>
      )))}

      {/* geparkte Autos */}
      {cars && ([[-2.7, 18, '#d9534f'], [2.7, 4, '#3f6fb5'], [-2.7, -14, '#e8c547'], [2.7, -30, '#3fb6a8'], [-2.7, -46, '#9aa0b5']] as const).map(([x, z, c], i) => (
        <group key={i} position={[x, -0.02, z]}>
          <Box p={[0, 0.55, 0]} s={[1.9, 0.75, 4.2]} c={c} />
          <Box p={[0, 1.1, -0.2]} s={[1.7, 0.6, 2.2]} c={shade(c, 0.85)} />
          <Glow p={[0, 1.12, 0.92]} s={[1.5, 0.4, 0.03]} c="#bcd8ff" />
          {[[-0.95, -1.3], [0.95, -1.3], [-0.95, 1.3], [0.95, 1.3]].map(([wx, wz], k) => <Box key={k} p={[wx, 0.28, wz]} s={[0.25, 0.56, 0.56]} c="#16161c" />)}
          <Glow p={[-0.6, 0.6, 2.12]} s={[0.35, 0.2, 0.04]} c="#fff2c0" />
          <Glow p={[0.6, 0.6, 2.12]} s={[0.35, 0.2, 0.04]} c="#fff2c0" />
          <Glow p={[-0.6, 0.6, -2.12]} s={[0.3, 0.15, 0.04]} c="#ff4d4d" />
          <Glow p={[0.6, 0.6, -2.12]} s={[0.3, 0.15, 0.04]} c="#ff4d4d" />
        </group>
      ))}
    </group>
  );
};
