import React from 'react';
import type {V3} from './anim';

type BoxProps = {
  p?: V3; s?: V3; c?: string; r?: V3; e?: string; ei?: number; cast?: boolean; recv?: boolean;
  opacity?: number; rough?: number; metal?: number; children?: React.ReactNode;
};

/** Standard-Block (flat shaded). */
export const Box: React.FC<BoxProps> = ({p = [0, 0, 0], s = [1, 1, 1], c = '#888', r, e, ei = 1, cast = true, recv = true, opacity, rough = 0.85, metal = 0, children}) => (
  <mesh position={p} rotation={r} castShadow={cast} receiveShadow={recv}>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} flatShading roughness={rough} metalness={metal}
      emissive={e ?? '#000'} emissiveIntensity={e ? ei : 0}
      transparent={opacity !== undefined && opacity < 1} opacity={opacity ?? 1} />
    {children}
  </mesh>
);

/** Leuchtender Block (unbeleuchtet, überstrahlt). */
export const Glow: React.FC<{p?: V3; s?: V3; c?: string; r?: V3; opacity?: number; shape?: 'box' | 'octa' | 'cone'}> = ({p = [0, 0, 0], s = [1, 1, 1], c = '#fff', r, opacity = 1, shape = 'box'}) => (
  <mesh position={p} rotation={r} scale={shape === 'box' ? undefined : s}>
    {shape === 'box' ? <boxGeometry args={s} /> : shape === 'octa' ? <octahedronGeometry args={[1, 0]} /> : <coneGeometry args={[1, 1, 5]} />}
    <meshBasicMaterial color={c} toneMapped={false} transparent={opacity < 1} opacity={opacity} />
  </mesh>
);
