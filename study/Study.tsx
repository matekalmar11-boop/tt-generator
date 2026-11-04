/** STUDIE: dieselbe Szene (Bühne, Licht, Kamera) mit bis zu drei Figuren-Varianten zum Vergleich. */
import React, {useLayoutEffect, useRef} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Cam, Lights} from '../src/world/Sets';
import {EmptyStage} from '../src/world/Interiors';
import {Sky} from '../src/world/Nature';
import {Person} from '../src/world/Person';
import {PersonV2} from './PersonV2';
import {GlbCharacter} from './GlbCharacter';
import {RBox} from './RBox';
import type {FaceName, PoseName} from '../src/world/Finn';
import type {V3} from '../src/lib/anim';

export type StudyProps = {
  who: ('base' | 'v2' | 'glb')[]; xs?: number[]; shot: 'lineup' | 'face' | 'body' | 'medium'; pose: PoseName; face: FaceName; t: number; clip: string; talk?: number; chair?: boolean; yaw?: number; camY?: number;
};

const SHOTS: Record<StudyProps['shot'], {pos: V3; look: V3; fov: number}> = {
  lineup: {pos: [0, 2.3, 11], look: [0, 1.55, 0], fov: 36},
  medium: {pos: [0, 2.2, 7], look: [0, 1.7, 0], fov: 34},
  body: {pos: [0, 1.9, 8.2], look: [0, 1.55, 0], fov: 32},
  face: {pos: [0, 2.9, 3.6], look: [0, 2.75, 0], fov: 25},
};
const LOOK = {skin: '#f2c29b', hair: '#4a3426', shirt: '#4aa3a0', pants: '#3a3f5c', shoes: '#2b2b2b'};

const Stats: React.FC<{name: string; children: React.ReactNode}> = ({name, children}) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    let meshes = 0, tris = 0;
    ref.current?.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.visible) { meshes++; const g = m.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
    console.log('STUDY_STATS ' + JSON.stringify({name, meshes, tris: Math.round(tris)}));
  });
  return <group ref={ref}>{children}</group>;
};

export const Study: React.FC<StudyProps> = ({who, xs, shot, pose, face, t, clip, talk = 0, chair, yaw = 0, camY}) => {
  const S0 = SHOTS[shot];
  const S = camY === undefined ? S0 : {...S0, pos: [S0.pos[0], camY, S0.pos[2]] as V3, look: [S0.look[0], camY, S0.look[2]] as V3};
  const {width, height} = useVideoConfig();
  const X = xs ?? (who.length === 1 ? [0] : who.map((_, i) => (i - (who.length - 1) / 2) * 3.4));
  return (
    <AbsoluteFill style={{background: '#101426'}}>
      <ThreeCanvas width={width} height={height} shadows camera={{fov: 50, position: [0, 3, 10], near: 0.1, far: 900}} gl={{antialias: true}}>
        <Lights fog="#222a4a" near={30} far={110} hemi={1.0} keyI={2.0} keyPos={[-5, 14, 10]} shadowAt={[0, 0, 0]} />
        <Cam shot={() => ({pos: S.pos, look: S.look, fov: S.fov, roll: 0})} />
        <Sky top="#2a3560" mid="#3d4a7a" bottom="#161b34" />
        <EmptyStage floor="#34415f" />
        {chair && <RBox p={[0, 0.3, -0.12]} s={[1.1, 0.12, 1.0]} c="#8a5a35" rot={[0, 0, 0]} />}
        {chair && <RBox p={[0, 0.9, -0.58]} s={[1.1, 1.1, 0.12]} c="#8a5a35" />}
        {who.map((w, i) => {
          const pos: V3 = [X[i], 0, 0];
          if (w === 'base') return <Stats key={w} name="Person (bisher)"><Person t={t} pose={pose} face={face} talk={talk} position={pos} rotationY={yaw} look={LOOK} /></Stats>;
          if (w === 'v2') return <Stats key={w} name="Person v2 (Studie)"><PersonV2 t={t} pose={pose} face={face} talk={talk} position={pos} rotationY={yaw} look={LOOK} /></Stats>;
          return <Stats key={w} name="GLB KayKit Rogue"><GlbCharacter url="study/Rogue.glb" clip={clip} t={t} position={pos} rotationY={yaw} /></Stats>;
        })}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
