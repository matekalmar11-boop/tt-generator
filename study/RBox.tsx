import React, {useMemo} from 'react';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type {V3} from '../src/lib/anim';

const OUT = '#1b1230';
/** Abgerundeter Block mit glatter Schattierung ("Kunststoff") und gleichmäßig dicker Kontur (umgestülpte Hülle). */
export const RBox: React.FC<{p?: V3; s: V3; c: string; r?: number; rot?: V3; outline?: number; rough?: number; children?: React.ReactNode}> =
  ({p = [0, 0, 0], s, c, r = 0.1, rot, outline = 0.035, rough = 0.5, children}) => {
    const rr = Math.min(r, Math.min(...s) / 2 - 0.002);
    const geo = useMemo(() => new RoundedBoxGeometry(s[0], s[1], s[2], 4, rr), [s[0], s[1], s[2], rr]);
    const hull = useMemo(() => (outline > 0 ? new RoundedBoxGeometry(s[0] + outline * 2, s[1] + outline * 2, s[2] + outline * 2, 3, rr + outline) : null), [s[0], s[1], s[2], rr, outline]);
    return (
      <mesh position={p} rotation={rot} geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color={c} roughness={rough} metalness={0} />
        {hull && <mesh geometry={hull}><meshBasicMaterial color={OUT} side={THREE.BackSide} /></mesh>}
        {children}
      </mesh>
    );
  };
