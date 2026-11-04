import React from 'react';
import {useThree} from '@react-three/fiber';
import {Easing, interpolate, useCurrentFrame} from 'remotion';

type Shot = {
  from: number; // Frame
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
};

// Schnelle Schnitte/Fahrten: alle ~1,3 s ein neuer Kamerapunkt
const SHOTS: Shot[] = [
  {from: 0, pos: [0, 2.5, 14], look: [0, 2.2, 0], fov: 40},
  {from: 20, pos: [5, 3, 6], look: [0, 3, 0], fov: 50},
  {from: 50, pos: [-6, 1.5, 5], look: [0, 2.5, 0], fov: 55},
  {from: 80, pos: [0, 7, 7], look: [0, 2, 0], fov: 60},
  {from: 110, pos: [0, 3.5, 3.5], look: [0, 3.5, 0], fov: 45},
  {from: 140, pos: [7, 1, -6], look: [0, 2.5, 0], fov: 55},
  {from: 175, pos: [-3, 5, 9], look: [0, 2.5, 0], fov: 70},
  {from: 210, pos: [3, 0.6, 5], look: [0, 3, 0], fov: 65},
  {from: 250, pos: [0, 3, 8], look: [0, 2.8, 0], fov: 40},
  {from: 300, pos: [0, 3, 12], look: [0, 2.8, 0], fov: 38},
];

export const CameraRig: React.FC = () => {
  const frame = useCurrentFrame();
  const camera = useThree((s) => s.camera) as import('three').PerspectiveCamera;

  const frames = SHOTS.map((s) => s.from);
  const ease = {easing: Easing.bezier(0.7, 0, 0.2, 1), extrapolateRight: 'clamp' as const};
  const lerp = (pick: (s: Shot) => number) =>
    interpolate(frame, frames, SHOTS.map(pick), ease);

  camera.position.set(
    lerp((s) => s.pos[0]),
    lerp((s) => s.pos[1]),
    lerp((s) => s.pos[2]),
  );
  camera.lookAt(lerp((s) => s.look[0]), lerp((s) => s.look[1]), lerp((s) => s.look[2]));
  camera.fov = lerp((s) => s.fov);
  // leichtes Handkamera-Wackeln
  camera.rotation.z += Math.sin(frame / 4) * 0.01;
  camera.updateProjectionMatrix();
  return null;
};
