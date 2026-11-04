import React, {useMemo} from 'react';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type {V3} from '../lib/anim';

const OUT = '#1b1230';
/** Figur-Kontext: ghost = durchscheinende Silhouette (Rückblick), ohne Kontur. */
export const FigureCtx = React.createContext<{ghost: boolean}>({ghost: false});
const geoCache = new Map<string, RoundedBoxGeometry>();
const rgeo = (w: number, h: number, d: number, seg: number, r: number) => {
  const k = [w, h, d, seg, r].map((x) => x.toFixed(3)).join('_');
  let g = geoCache.get(k);
  if (!g) { g = new RoundedBoxGeometry(w, h, d, seg, r); geoCache.set(k, g); }
  return g;
};

/**
 * Abgerundeter Block, glatte Kunststoff-Schattierung, gleichmäßig dicke Kontur (umgestülpte Hülle).
 * Optimiert: 2 Segmente je Rundung, Hülle abgeschrägt (1 Segment), Geometrie je Maß zwischengespeichert.
 */
export const RBox: React.FC<{p?: V3; s: V3; c: string; r?: number; rot?: V3; outline?: number; rough?: number; children?: React.ReactNode}> =
  ({p = [0, 0, 0], s, c, r = 0.1, rot, outline = 0.035, rough = 0.5, children}) => {
    const {ghost} = React.useContext(FigureCtx);
    const rr = Math.min(r, Math.min(...s) / 2 - 0.002);
    const geo = useMemo(() => rgeo(s[0], s[1], s[2], 2, rr), [s[0], s[1], s[2], rr]);
    const hull = useMemo(() => (outline > 0 && !ghost ? rgeo(s[0] + outline * 2, s[1] + outline * 2, s[2] + outline * 2, 1, rr + outline) : null), [s[0], s[1], s[2], rr, outline, ghost]);
    return (
      <mesh position={p} rotation={rot} geometry={geo} castShadow={!ghost} receiveShadow={!ghost}>
        <meshStandardMaterial color={ghost ? '#bcd8ff' : c} roughness={rough} metalness={0} transparent={ghost} opacity={ghost ? 0.35 : 1} />
        {hull && <mesh geometry={hull}><meshBasicMaterial color={OUT} side={THREE.BackSide} /></mesh>}
        {children}
      </mesh>
    );
  };
