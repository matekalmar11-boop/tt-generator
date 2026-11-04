import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';

const Block: React.FC<{
  size: [number, number, number];
  pos: [number, number, number];
  color: string;
}> = ({size, pos, color}) => (
  <mesh position={pos} castShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} flatShading />
  </mesh>
);

/** Einfache blockartige Figur (Kopf, Körper, Arme, Beine) mit Tanz-Animation. */
export const Figure: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const beat = t * Math.PI * 2 * 2; // 2 Zyklen pro Sekunde
  const swing = Math.sin(beat) * 0.9;
  const bounce = Math.abs(Math.sin(beat / 2)) * 0.25;
  const spin = Math.sin(t * 1.2) * 0.6;

  return (
    <group position={[0, bounce, 0]} rotation={[0, spin, 0]}>
      {/* Körper */}
      <Block size={[1.2, 1.6, 0.7]} pos={[0, 2, 0]} color="#ff2d75" />
      {/* Kopf */}
      <group position={[0, 3.45, 0]} rotation={[0, 0, Math.sin(beat / 2) * 0.12]}>
        <Block size={[1, 1, 1]} pos={[0, 0, 0]} color="#ffd9a8" />
        <Block size={[0.16, 0.2, 0.05]} pos={[-0.25, 0.1, 0.51]} color="#111" />
        <Block size={[0.16, 0.2, 0.05]} pos={[0.25, 0.1, 0.51]} color="#111" />
        <Block size={[0.45, 0.1, 0.05]} pos={[0, -0.25, 0.51]} color="#c0392b" />
        <Block size={[1.1, 0.3, 1.1]} pos={[0, 0.55, 0]} color="#25f4ee" />
      </group>
      {/* Arme (Pivot an der Schulter) */}
      <group position={[-0.85, 2.7, 0]} rotation={[0, 0, 2.3 + swing * 0.6]}>
        <Block size={[0.4, 1.4, 0.4]} pos={[0, -0.6, 0]} color="#ffd9a8" />
      </group>
      <group position={[0.85, 2.7, 0]} rotation={[0, 0, -2.3 + swing * 0.6]}>
        <Block size={[0.4, 1.4, 0.4]} pos={[0, -0.6, 0]} color="#ffd9a8" />
      </group>
      {/* Beine */}
      <group position={[-0.35, 1.2, 0]} rotation={[swing * 0.5, 0, 0]}>
        <Block size={[0.5, 1.2, 0.5]} pos={[0, -0.6, 0]} color="#2c3e9e" />
      </group>
      <group position={[0.35, 1.2, 0]} rotation={[-swing * 0.5, 0, 0]}>
        <Block size={[0.5, 1.2, 0.5]} pos={[0, -0.6, 0]} color="#2c3e9e" />
      </group>
    </group>
  );
};
