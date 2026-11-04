import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {CameraRig} from './CameraRig';
import {Figure} from './Figure';
import {Subtitles} from './Subtitles';

export const TikTokTest: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const hue = interpolate(frame, [0, 300], [260, 330]);

  return (
    <AbsoluteFill
      style={{background: `linear-gradient(180deg, hsl(${hue},70%,18%), hsl(${hue + 40},80%,38%))`}}
    >
      <ThreeCanvas width={width} height={height} camera={{fov: 40, position: [0, 2.5, 14]}}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 7]} intensity={2.2} />
        <pointLight position={[-6, 3, 4]} intensity={40} color="#25f4ee" />
        <CameraRig />
        <Figure />
        {/* Boden */}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[60, 60, 30, 30]} />
          <meshStandardMaterial color="#1b1340" wireframe />
        </mesh>
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color="#0d0a26" />
        </mesh>
      </ThreeCanvas>
      <Subtitles />
    </AbsoluteFill>
  );
};
