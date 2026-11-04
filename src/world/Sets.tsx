import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {random, useCurrentFrame, useVideoConfig} from 'remotion';
import {useThree} from '@react-three/fiber';
import {Box, Glow} from '../lib/Box';
import {CamState, V3} from '../lib/anim';
import {Beam, Clouds, Crystal, Dust, Island, Moon, Mushroom, PineTree, Rock, Sky, Stars, VoxelGround} from './Nature';

const R = (seed: string, a = 0, b = 1) => a + random(seed) * (b - a);

/* ---------- Kamera ---------- */
export const Cam: React.FC<{shot: (f: number) => CamState}> = ({shot}) => {
  const f = useCurrentFrame();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const st = shot(f);
  camera.position.set(...st.pos);
  camera.up.set(0, 1, 0);
  camera.lookAt(...st.look);
  if (st.roll) camera.rotateZ(st.roll);
  camera.fov = st.fov;
  camera.near = 0.1; camera.far = 900;
  camera.updateProjectionMatrix();
  return null;
};

/* ---------- Licht + Nebel ---------- */
export const Lights: React.FC<{
  sky?: string; ground?: string; hemi?: number; key?: string; keyI?: number; keyPos?: V3; fog?: string; near?: number; far?: number; shadowAt?: V3; ambient?: number;
}> = ({sky = '#8aa0ff', ground = '#2a1f4a', hemi = 0.8, key = '#cdd8ff', keyI = 2.4, keyPos = [-8, 22, 12], fog = '#2a2250', near = 30, far = 140, shadowAt = [0, 0, 0], ambient = 0.15}) => (
  <>
    <color attach="background" args={[fog]} />
    <fog attach="fog" args={[fog, near, far]} />
    <hemisphereLight args={[sky, ground, hemi]} />
    <ambientLight intensity={ambient} />
    <directionalLight position={[shadowAt[0] + keyPos[0], shadowAt[1] + keyPos[1], shadowAt[2] + keyPos[2]]} intensity={keyI} color={key} castShadow
      shadow-mapSize={[1024, 1024]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9}
      shadow-camera-near={1} shadow-camera-far={70} shadow-bias={-0.0006} shadow-normalBias={0.04}>
      <object3D attach="target" position={shadowAt} />
    </directionalLight>
  </>
);

/* ---------- Nachthimmel mit Mond, Inseln, Wolken ---------- */
export const NightSky: React.FC<{t: number; moonPos?: V3; moonR?: number; crack?: number; islands?: boolean}> = ({t, moonPos = [24, 38, -90], moonR = 26, crack = 0, islands = true}) => (
  <group>
    <Sky top="#0a0626" mid="#3b2670" bottom="#1b1240" />
    <Stars rot={t * 0.01} />
    <Moon position={moonPos} radius={moonR} crack={crack} t={t} />
    <Clouds t={t} y={-9} color="#5a4a9a" seed="lowc" spread={100} count={16} />
    <Clouds t={t * 1.3} y={-3} color="#7d6fc4" seed="midc" spread={110} count={8} />
    {islands && (
      <>
        <Island p={[-34, 14, -50]} s={1.4} t={t} seed="a" />
        <Island p={[40, 20, -70]} s={1.8} t={t} seed="b" top="#4aa389" />
        <Island p={[-70, 34, -110]} s={2.4} t={t} seed="c" />
        <Island p={[16, 6, -34]} s={0.8} t={t} seed="d" top="#58b08a" />
        <Island p={[70, 5, -50]} s={1.5} t={t} seed="e" />
      </>
    )}
  </group>
);

/* ---------- Klippen-Plateau (Himmelsfels) ---------- */
export const Plateau: React.FC<{t: number; lantern?: boolean}> = ({t, lantern = true}) => (
  <group>
    <VoxelGround size={9} cell={1} colorA="#3f9f7a" colorB="#357f68" heightVar={0.3} seed="plat" />
    {/* Felsige Unterseite */}
    <Box p={[0, -3.6, 0]} s={[16, 4, 16]} c="#4d3d68" />
    <Box p={[0, -7, 0]} s={[11, 3.2, 11]} c="#3a2d55" />
    <Box p={[0, -10, 0]} s={[6, 3, 6]} c="#2d2345" />
    <Box p={[0, -12.5, 0]} s={[2.5, 2.5, 2.5]} c="#241c3a" />
    {/* Ruinen-Torbogen mit Runen */}
    <Box p={[-2.6, 2.3, -4]} s={[1, 4.6, 1]} c="#8b87a8" />
    <Box p={[2.6, 1.7, -4]} s={[1, 3.4, 1]} c="#8b87a8" />
    <Box p={[-1.6, 4.9, -4]} s={[3.6, 0.9, 1.1]} c="#9a96b8" r={[0, 0, 0.12]} />
    {[-2.6, 2.6].map((x, i) => <Glow key={i} p={[x, 1.4 + i * 0.6, -3.45]} s={[0.35, 1.5, 0.05]} c="#7fe8ff" />)}
    <Glow p={[0, 0.6, -3.5]} s={[0.4, 0.4, 0.05]} c="#b7f3ff" />
    {/* Laternenpfahl */}
    <Box p={[3.6, 1.5, 2]} s={[0.22, 3.0, 0.22]} c="#2d2d35" />
    <Box p={[3.6, 3.2, 2]} s={[0.7, 0.7, 0.7]} c="#ffe39a" e="#ffb347" ei={lantern ? 2.4 : 0} />
    <Box p={[3.6, 3.65, 2]} s={[0.9, 0.18, 0.9]} c="#2d2d35" />
    {lantern && <pointLight position={[3.6, 3.2, 2]} color="#ffb860" intensity={26} distance={14} decay={1.5} />}
    {/* Felsen, Gras, Blumen */}
    <Rock p={[-5, 0.5, 1]} s={[2, 1.4, 1.8]} />
    <Rock p={[5.5, 0.4, -1.5]} s={[1.6, 1.1, 1.6]} />
    <Rock p={[-3.5, 0.3, 5.2]} s={[1.3, 0.9, 1.2]} />
    {Array.from({length: 22}, (_, i) => (
      <Box key={i} p={[R('gx' + i, -7, 7), 0.45, R('gz' + i, -7, 7)]} s={[0.12, 0.4 + R('gh' + i) * 0.4, 0.12]} c="#6ee7a8" e={i % 4 === 0 ? '#63f2ff' : undefined} ei={0.8} cast={false} />
    ))}
    <PineTree p={[-6.5, 0.3, -2]} s={1.2} seed="p1" />
    <PineTree p={[6.8, 0.3, 3]} s={1.0} c="#2a7b6a" seed="p2" />
    <PineTree p={[-5.5, 0.3, -6]} s={1.5} seed="p3" />
    {/* Brücke zu Nachbarinsel */}
    {Array.from({length: 7}, (_, i) => <Box key={i} p={[8 + i * 1.1, -0.2 - i * 0.12 + Math.sin(t * 1.5 + i) * 0.03, -2 - i * 0.6]} s={[1, 0.15, 1.8]} c="#8a6a45" r={[0, 0.2, 0]} />)}
    <Dust t={t} count={50} center={[0, 3, 0]} spread={[16, 6, 16]} color="#ffe9a0" seed="ff1" />
  </group>
);

/* ---------- Kristallwald ---------- */
export const ForestSet: React.FC<{t: number}> = ({t}) => {
  const trees = useMemo(() => Array.from({length: 46}, (_, i) => {
    const side = i % 2 ? 1 : -1;
    return {p: [side * R('fx' + i, 3.2, 14), 0, R('fz' + i, 6, -48)] as V3, k: i % 5};
  }), []);
  return (
    <group>
      <VoxelGround size={26} cell={1.2} colorA="#27495a" colorB="#1f3b52" heightVar={0.35} seed="forest" center={[0, 0, -18]} />
      {trees.map((tr, i) =>
        tr.k === 0 ? <Mushroom key={i} p={tr.p} s={R('fs' + i, 1, 1.8)} seed={'fm' + i} c={i % 2 ? '#7a3fd1' : '#3f7ad1'} glowC={i % 2 ? '#c58bff' : '#8bc5ff'} />
        : tr.k === 1 ? <Crystal key={i} p={tr.p} s={R('fs' + i, 0.9, 1.7)} seed={'fk' + i} c={i % 2 ? '#46d8ff' : '#ff6ad5'} t={t} />
        : <PineTree key={i} p={tr.p} s={R('fs' + i, 1.1, 2.0)} c={i % 3 ? '#1d5d62' : '#2b4a8a'} seed={'fp' + i} />)}
      {/* Silberstaub-Spur */}
      <Dust t={t} count={90} center={[0, 0.5, -12]} spread={[3, 1.2, 40]} color="#e8f1ff" size={0.14} speed={0.8} seed="trail" rise={0.2} />
      <Dust t={t} count={70} center={[0, 3, -16]} spread={[22, 7, 50]} color="#ffe9a0" size={0.2} speed={0.4} seed="ffor" />
      <pointLight position={[-4, 2, -8]} color="#6ad8ff" intensity={30} distance={16} decay={1.5} />
      <pointLight position={[5, 2.5, -20]} color="#ff6ad5" intensity={30} distance={16} decay={1.5} />
      <pointLight position={[-3, 2.5, -32]} color="#8a7bff" intensity={30} distance={16} decay={1.5} />
    </group>
  );
};

/* ---------- Drachenhöhle ---------- */
export const CaveSet: React.FC<{t: number; beam?: number; runes?: number; floorGlow?: string; ground?: boolean; bc?: V3}> = ({t, beam = 1, runes = 0, floorGlow = '#7fe8ff', ground = true, bc = [0, 0, -2]}) => {
  const walls = useMemo(() => Array.from({length: 34}, (_, i) => {
    const a = (i / 34) * Math.PI * 2, r = 12 + R('wr' + i, 0, 2.5);
    return {p: [Math.cos(a) * r, 0, Math.sin(a) * r - 2] as V3, h: R('wh' + i, 9, 16), w: R('ww' + i, 3.5, 6), a};
  }), []);
  return (
    <group>
      <color attach="background" args={['#120c26']} />
      {ground && <VoxelGround size={11} cell={1.2} colorA="#4a4166" colorB="#3b3356" heightVar={0.25} seed="cave" center={[0, 0, -2]} />}
      {walls.map((w, i) => (
        <Box key={i} p={[w.p[0], w.h / 2 - 1, w.p[2]]} s={[w.w, w.h, w.w]} c={i % 3 ? '#2e2745' : '#3a3158'} r={[0, w.a + 0.3, 0]} />
      ))}
      {/* Stalaktiten */}
      {Array.from({length: 18}, (_, i) => {
        const a = R('sa' + i, 0, 6.28), r = R('sr' + i, 3, 11), h = R('sh' + i, 2, 5);
        return <mesh key={i} position={[Math.cos(a) * r, 15 - h / 2, Math.sin(a) * r - 2]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[R('sw' + i, 0.5, 1), h, 5]} /><meshStandardMaterial color="#3b3358" flatShading /></mesh>;
      })}
      {/* Kristalle */}
      <Crystal p={[-7, 0, -6]} s={2.1} c="#46d8ff" seed="c1" t={t} />
      <Crystal p={[7.5, 0, -3]} s={1.8} c="#ff6ad5" seed="c2" t={t} />
      <Crystal p={[-5.5, 0, 6]} s={1.3} c="#8a7bff" seed="c3" t={t} />
      <Crystal p={[6, 0, 7]} s={1.5} c="#46d8ff" seed="c4" t={t} />
      <Crystal p={[0, 0, -11]} s={2.6} c="#8a7bff" seed="c5" t={t} />
      {/* leuchtender Teich */}
      <mesh position={[bc[0], -0.05, bc[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.4, 6]} />
        <meshStandardMaterial color={floorGlow} emissive={floorGlow} emissiveIntensity={0.5 + Math.sin(t * 2) * 0.12} flatShading />
      </mesh>
      {/* Runenkreis */}
      {runes > 0 && Array.from({length: 12}, (_, i) => {
        const a = (i / 12) * Math.PI * 2 + t * 0.2;
        return <Glow key={i} p={[bc[0] + Math.cos(a) * 5.2, 0.06, bc[2] + Math.sin(a) * 5.2]} s={[0.5, 0.04, 0.2]} r={[0, -a, 0]} c="#ffb3f0" opacity={runes} />;
      })}
      {/* Mondlicht durch die Deckenöffnung */}
      {beam > 0 && <Beam p={bc} r={2.4} h={32} opacity={0.07 * beam} />}
      <pointLight position={[bc[0], 9, bc[2]]} color="#bcd0ff" intensity={35 * beam} distance={30} decay={1.4} />
      <pointLight position={[-7, 3, -6]} color="#46d8ff" intensity={30} distance={14} decay={1.5} />
      <pointLight position={[7.5, 3, -3]} color="#ff6ad5" intensity={26} distance={14} decay={1.5} />
      <Dust t={t} count={60} center={[0, 5, -2]} spread={[14, 10, 14]} color="#cfe0ff" size={0.12} speed={0.3} seed="cd" rise={0.5} />
    </group>
  );
};

/* ---------- Brechender Boden (jede Platte fällt individuell) ---------- */
export const CrackingGround: React.FC<{frame: number; start: number; size?: number}> = ({frame, start, size = 9}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = size * 2 + 1;
  const tiles = useMemo(() => {
    const a: {x: number; z: number; d: number; c: THREE.Color; r: number}[] = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = (i - size) * 1.2, z = (j - size) * 1.2 - 2;
      a.push({x, z, d: Math.hypot(x, z + 2), c: new THREE.Color(R('cg' + i + j) > 0.5 ? '#4a4166' : '#3b3356').multiplyScalar(0.85 + R('cb' + i + j) * 0.3), r: R('cr' + i + j, -1, 1)});
    }
    return a;
  }, [n, size]);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return;
    const o = new THREE.Object3D();
    const crackR = Math.max(0, (frame - start) * 0.28);
    tiles.forEach((it, i) => {
      const fall = Math.max(0, crackR - it.d) ; // Platten innerhalb des Risses lösen sich
      const lift = fall > 0 ? Math.min(fall, 3) * 0.6 : 0;
      const sink = fall > 0 ? Math.max(0, fall - 1.2) ** 2 * 0.9 : 0;
      o.position.set(it.x, -1 + 0.15 + lift - sink, it.z);
      o.rotation.set(fall * 0.4 * it.r, fall * 0.3 * it.r, fall * 0.35 * it.r);
      o.scale.set(1.18, 2.3, 1.18); o.updateMatrix();
      m.setMatrixAt(i, o.matrix); m.setColorAt(i, it.c);
    });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [frame, start, tiles]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, tiles.length]} castShadow receiveShadow frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial flatShading roughness={0.95} />
    </instancedMesh>
  );
};

/* ---------- Abgrund mit Lichtringen ---------- */
export const AbyssSet: React.FC<{frame: number}> = ({frame}) => {
  const rings = Array.from({length: 14}, (_, i) => {
    const y = -((i * 9 - frame * 1.6) % 126) + 18; // ziehen nach oben vorbei -> Fallgefühl
    return {y, i};
  });
  return (
    <group>
      <color attach="background" args={['#07041a']} />
      {rings.map(({y, i}) => (
        <group key={i} position={[0, y, 0]} rotation={[0, i * 0.5 + frame * 0.01, 0]}>
          {Array.from({length: 12}, (_, k) => {
            const a = (k / 12) * Math.PI * 2;
            return <Glow key={k} p={[Math.cos(a) * 7, 0, Math.sin(a) * 7]} s={[3.2, 0.55, 0.9]} r={[0, -a, 0]} c={i % 3 === 0 ? '#ff7ad9' : i % 3 === 1 ? '#7fe8ff' : '#b79bff'} opacity={0.9} />;
          })}
        </group>
      ))}
      {/* Felswände */}
      {Array.from({length: 26}, (_, i) => {
        const a = (i / 26) * Math.PI * 2, y = -((i * 7 - frame * 1.6) % 100) + 14;
        return <Box key={i} p={[Math.cos(a) * 15, y, Math.sin(a) * 15]} s={[4, 6, 3]} c="#2a2150" r={[0, -a, 0]} cast={false} />;
      })}
      {/* gleißendes Mondlicht unter Finn: kommt näher */}
      <group position={[0, -34 + frame * 0.22, 0]}>
        <Glow p={[0, 0, 0]} s={[46, 0.5, 46]} c="#dfe8ff" />
        <Glow p={[0, 1.2, 0]} s={[60, 2, 60]} c="#9fb4ff" opacity={0.25} />
      </group>
      <Dust t={frame / 30} count={120} center={[0, 0, 0]} spread={[16, 40, 16]} color="#b7c8ff" size={0.18} speed={0.5} seed="ab" rise={8} />
    </group>
  );
};

export {Beam};
export const useT = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {f, t: f / fps};
};
