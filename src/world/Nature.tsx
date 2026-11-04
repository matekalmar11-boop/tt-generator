import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {random} from 'remotion';
import {Box, Glow} from '../lib/Box';
import type {V3} from '../lib/anim';

const R = (seed: string, a = 0, b = 1) => a + random(seed) * (b - a);

/* ---------- Himmel ---------- */
export const Sky: React.FC<{top: string; mid: string; bottom: string; rot?: number}> = ({top, mid, bottom}) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {top: {value: new THREE.Color(top)}, mid: {value: new THREE.Color(mid)}, bottom: {value: new THREE.Color(bottom)}},
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h>0.0 ? mix(mid, top, pow(h,0.55)) : mix(mid, bottom, pow(-h,0.5)); gl_FragColor = vec4(c,1.0);}',
  }), [top, mid, bottom]);
  return <mesh scale={400} material={mat}><sphereGeometry args={[1, 24, 16]} /></mesh>;
};

export const Stars: React.FC<{count?: number; rot?: number; radius?: number}> = ({count = 450, rot = 0, radius = 350}) => {
  const geo = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = R('su' + i) * 2 - 1, a = R('sa' + i) * Math.PI * 2, r = Math.sqrt(1 - u * u);
      arr.set([Math.cos(a) * r * radius, Math.abs(u) * radius * 0.9 + 10, Math.sin(a) * r * radius], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3)); return g;
  }, [count, radius]);
  return <points geometry={geo} rotation={[0, rot, 0]}><pointsMaterial size={2.4} sizeAttenuation={false} color="#ffffff" fog={false} toneMapped={false} /></points>;
};

/* ---------- Mond (Low-Poly) mit Rissen ---------- */
export const Moon: React.FC<{position?: V3; radius?: number; crack?: number; t?: number}> = ({position = [0, 0, 0], radius = 20, crack = 0, t = 0}) => {
  const craters = useMemo(() => Array.from({length: 14}, (_, i) => {
    const th = R('mt' + i) * Math.PI * 2, ph = Math.acos(R('mp' + i) * 1.2 - 0.6); // bevorzugt Vorderseite (+z)
    const v = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
    return {v, s: R('ms' + i, 0.08, 0.2)};
  }), []);
  return (
    <group position={position} rotation={[0, t * 0.02, 0]}>
      <mesh>
        <icosahedronGeometry args={[radius, 3]} />
        <meshStandardMaterial color="#dfe5ff" emissive="#cfd9ff" emissiveIntensity={0.55} flatShading roughness={1} fog={false} />
      </mesh>
      {craters.map((c, i) => {
        const p = c.v.clone().multiplyScalar(radius * 0.985);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), c.v);
        return (
          <mesh key={i} position={p} quaternion={q} scale={[radius * c.s, radius * c.s, 0.4]}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
            <meshStandardMaterial color="#8d97cf" emissive="#6f7bc0" emissiveIntensity={0.35} flatShading fog={false} />
          </mesh>
        );
      })}
      {/* leuchtende Risse */}
      {crack > 0 && [0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.sin(i * 1.7) * radius * 0.22, Math.cos(i * 2.1) * radius * 0.25, radius * 0.97]}
          rotation={[0, 0, i * 0.9 + 0.3]} scale={[1, crack, 1]}>
          <boxGeometry args={[0.35, radius * 0.7, 0.4]} />
          <meshBasicMaterial color="#ff9ad5" toneMapped={false} fog={false} />
        </mesh>
      ))}
      {/* Halo */}
      <mesh scale={1.18}><sphereGeometry args={[radius, 24, 16]} /><meshBasicMaterial color="#9fb4ff" transparent opacity={0.12} side={THREE.BackSide} depthWrite={false} fog={false} toneMapped={false} /></mesh>
      <mesh scale={1.45}><sphereGeometry args={[radius, 24, 16]} /><meshBasicMaterial color="#7f94ff" transparent opacity={0.07} side={THREE.BackSide} depthWrite={false} fog={false} toneMapped={false} /></mesh>
    </group>
  );
};

/* ---------- Partikel: Glühwürmchen / Silberstaub ---------- */
export const Dust: React.FC<{t: number; count?: number; center?: V3; spread?: V3; color?: string; size?: number; speed?: number; seed?: string; rise?: number}> =
  ({t, count = 70, center = [0, 3, 0], spread = [12, 5, 12], color = '#ffe9a0', size = 0.16, speed = 0.4, seed = 'd', rise = 0}) => {
    const base = useMemo(() => Array.from({length: count}, (_, i) => [R(seed + 'x' + i) - 0.5, R(seed + 'y' + i) - 0.5, R(seed + 'z' + i) - 0.5, R(seed + 'p' + i) * 6.28] as const), [count, seed]);
    const arr = new Float32Array(count * 3);
    base.forEach(([x, y, z, ph], i) => {
      arr[i * 3] = center[0] + x * spread[0] + Math.sin(t * speed + ph) * 0.6;
      arr[i * 3 + 1] = center[1] + y * spread[1] + Math.sin(t * speed * 1.3 + ph * 2) * 0.4 + ((t * rise + (y + 0.5) * spread[1] * 1) % spread[1]) * (rise ? 1 : 0);
      arr[i * 3 + 2] = center[2] + z * spread[2] + Math.cos(t * speed + ph) * 0.6;
    });
    return (
      <points key={count}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[arr, 3]} /></bufferGeometry>
        <pointsMaterial size={size} color={color} sizeAttenuation toneMapped={false} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    );
  };

/* ---------- Wolken ---------- */
export const Clouds: React.FC<{t: number; y?: number; count?: number; spread?: number; color?: string; seed?: string}> = ({t, y = -6, count = 14, spread = 90, color = '#7a6fb8', seed = 'c'}) => (
  <group>
    {Array.from({length: count}, (_, i) => {
      const x = ((R(seed + 'x' + i) * spread * 2 - spread + t * (0.4 + R(seed + 's' + i))) % (spread * 2) + spread * 2) % (spread * 2) - spread;
      const z = R(seed + 'z' + i, -spread, spread * 0.3);
      const s = R(seed + 'k' + i, 3, 8);
      return (
        <group key={i} position={[x, y + R(seed + 'y' + i, -2, 3), z]}>
          <Box s={[s * 2, s * 0.5, s]} c={color} cast={false} recv={false} opacity={0.85} />
          <Box p={[s * 0.5, s * 0.3, 0]} s={[s, s * 0.5, s * 0.8]} c={color} cast={false} recv={false} opacity={0.85} />
          <Box p={[-s * 0.6, s * 0.2, s * 0.2]} s={[s * 0.8, s * 0.4, s * 0.7]} c={color} cast={false} recv={false} opacity={0.85} />
        </group>
      );
    })}
  </group>
);

/* ---------- Schwebende Inseln ---------- */
export const Island: React.FC<{p: V3; s?: number; t?: number; seed?: string; lit?: boolean; top?: string}> = ({p, s = 1, t = 0, seed = 'i', lit = true, top = '#3f9f7a'}) => {
  const bob = Math.sin(t * 0.6 + R(seed) * 6) * 0.35;
  const layers = [[9, 1.1, '#5c4a7a'], [7.2, 1.3, '#4d3d68'], [5.2, 1.5, '#403357'], [3.4, 1.6, '#352a49'], [1.8, 1.4, '#2b2240']] as const;
  let y = -0.5;
  return (
    <group position={[p[0], p[1] + bob, p[2]]} scale={s}>
      <Box p={[0, 0.2, 0]} s={[9.4, 0.5, 9.4]} c={top} />
      {layers.map(([w, h, c], i) => { y -= h / 2 + (i ? layers[i - 1][1] / 2 : 0.5 / 2 + 0.3); return <Box key={i} p={[R(seed + i) * 0.4 - 0.2, y + 0.2, 0]} s={[w, h, w]} c={c} />; })}
      {/* Häuschen / Baum / Laterne */}
      <Box p={[-1.8, 1.4, 1]} s={[1.8, 1.6, 1.8]} c="#e9d8b7" />
      <Box p={[-1.8, 2.5, 1]} s={[2.3, 0.7, 2.3]} c="#c0392b" />
      <Box p={[-1.8, 1.2, 1.95]} s={[0.5, 0.5, 0.05]} c="#ffd27a" e="#ffb347" ei={lit ? 2 : 0} />
      <Box p={[2, 1.2, -1]} s={[0.6, 1.6, 0.6]} c="#6b4226" />
      <Box p={[2, 2.6, -1]} s={[2.2, 1.6, 2.2]} c="#2f8f6b" />
      <Box p={[2, 3.7, -1]} s={[1.4, 1.1, 1.4]} c="#3aa57d" />
      {lit && <Box p={[0.5, 0.9, 2.5]} s={[0.2, 1.3, 0.2]} c="#333"><Glow p={[0, 0.8, 0]} s={[0.4, 0.4, 0.4]} c="#ffd27a" /></Box>}
    </group>
  );
};

/* ---------- Voxel-Boden (Instanced) ---------- */
export const VoxelGround: React.FC<{size?: number; cell?: number; colorA: string; colorB: string; heightVar?: number; seed?: string; hole?: number; center?: V3}> =
  ({size = 22, cell = 1, colorA, colorB, heightVar = 0.35, seed = 'g', hole = 0, center = [0, 0, 0]}) => {
    const ref = useRef<THREE.InstancedMesh>(null);
    const n = size * 2 + 1;
    const items = useMemo(() => {
      const arr: {x: number; z: number; h: number; c: THREE.Color}[] = [];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = (i - size) * cell, z = (j - size) * cell;
        if (Math.hypot(x, z) < hole) continue;
        const h = R(seed + i + '_' + j) * heightVar;
        arr.push({x, z, h, c: new THREE.Color(R(seed + 'c' + i + j) > 0.5 ? colorA : colorB).multiplyScalar(0.85 + R(seed + 'b' + i + j) * 0.3)});
      }
      return arr;
    }, [n, size, cell, colorA, colorB, heightVar, seed, hole]);
    useLayoutEffect(() => {
      const m = ref.current; if (!m) return;
      const o = new THREE.Object3D();
      items.forEach((it, i) => {
        o.position.set(it.x + center[0], center[1] - 1 + it.h / 2, it.z + center[2]); o.scale.set(cell * 0.98, 2 + it.h, cell * 0.98); o.updateMatrix();
        m.setMatrixAt(i, o.matrix); m.setColorAt(i, it.c);
      });
      m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }, [items, cell, center]);
    return (
      <instancedMesh key={items.length + colorA} ref={ref} args={[undefined, undefined, items.length]} receiveShadow castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial flatShading roughness={0.95} />
      </instancedMesh>
    );
  };

/* ---------- Bäume, Pilze, Kristalle ---------- */
export const PineTree: React.FC<{p: V3; s?: number; c?: string; seed?: string}> = ({p, s = 1, c = '#1f6b5e', seed = 't'}) => (
  <group position={p} scale={s} rotation={[0, R(seed) * 6, 0]}>
    <Box p={[0, 0.8, 0]} s={[0.5, 1.6, 0.5]} c="#4a3328" />
    <Box p={[0, 2.0, 0]} s={[2.2, 1.0, 2.2]} c={c} />
    <Box p={[0, 2.9, 0]} s={[1.7, 1.0, 1.7]} c={c} />
    <Box p={[0, 3.8, 0]} s={[1.1, 1.0, 1.1]} c={c} />
    <Box p={[0, 4.5, 0]} s={[0.5, 0.7, 0.5]} c="#7cffd8" e="#2de2b5" ei={1.2} />
  </group>
);

export const Mushroom: React.FC<{p: V3; s?: number; c?: string; glowC?: string; seed?: string}> = ({p, s = 1, c = '#7a3fd1', glowC = '#c58bff', seed = 'm'}) => (
  <group position={p} scale={s} rotation={[0, R(seed) * 6, 0]}>
    <Box p={[0, 0.9, 0]} s={[0.55, 1.8, 0.55]} c="#e9ddff" />
    <Box p={[0, 2.0, 0]} s={[2.8, 0.55, 2.8]} c={c} e={glowC} ei={0.45} />
    <Box p={[0, 2.45, 0]} s={[1.9, 0.45, 1.9]} c={c} e={glowC} ei={0.45} />
    <Box p={[0.7, 2.3, 0.7]} s={[0.35, 0.3, 0.35]} c="#fff" e="#fff" ei={1.2} cast={false} />
    <Box p={[-0.6, 2.3, 0.2]} s={[0.3, 0.3, 0.3]} c="#fff" e="#fff" ei={1.2} cast={false} />
  </group>
);

export const Crystal: React.FC<{p: V3; s?: number; c?: string; seed?: string; t?: number}> = ({p, s = 1, c = '#46d8ff', seed = 'k', t = 0}) => (
  <group position={p} scale={s} rotation={[0, R(seed) * 6, 0]}>
    {[0, 1, 2].map((i) => {
      const h = R(seed + 'h' + i, 1.6, 4.2), a = R(seed + 'a' + i, -0.35, 0.35), w = R(seed + 'w' + i, 0.45, 0.8);
      return (
        <mesh key={i} position={[(i - 1) * 0.55, h / 2, R(seed + 'z' + i, -0.3, 0.3)]} rotation={[a, i, a * 0.6]} castShadow>
          <cylinderGeometry args={[w * 0.15, w, h, 5]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.1 + Math.sin(t * 2 + i) * 0.25} flatShading roughness={0.2} />
        </mesh>
      );
    })}
  </group>
);

export const Rock: React.FC<{p: V3; s?: V3; c?: string}> = ({p, s = [1.5, 1.2, 1.5], c = '#4d4568'}) => (
  <Box p={p} s={s} c={c} r={[0.1, p[0] * 0.7, 0.08]} />
);

/* ---------- Mondlichtstrahl ---------- */
export const Beam: React.FC<{p?: V3; r?: number; h?: number; color?: string; opacity?: number}> = ({p = [0, 0, 0], r = 2.6, h = 40, color = '#bcd0ff', opacity = 0.22}) => (
  <group position={[p[0], p[1] + h / 2, p[2]]}>
    {[1, 0.7, 0.45].map((k, i) => (
      <mesh key={i}>
        <cylinderGeometry args={[r * k * 1.35, r * k, h, 16, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * (0.5 + i * 0.35)} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} fog={false} />
      </mesh>
    ))}
  </group>
);
