import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Glow} from '../lib/Box';
import {CamState, Key, V3, clamp01, ease, lerp, lerp3, orbit, prog, sampleKeys, shake} from '../lib/anim';
import {lineRel, sceneById, talkAmount} from '../lib/story';
import {Finn} from '../world/Finn';
import {Dragon, dragonHead} from '../world/Dragon';
import {Dust, Moon, Sky, Stars} from '../world/Nature';
import {AbyssSet, Cam, CaveSet, CrackingGround, ForestSet, Lights, NightSky, Plateau} from '../world/Sets';

const FPS = 30;
const useScene = (id: string) => {
  const f = useCurrentFrame();
  const sc = sceneById(id);
  return {f, t: f / FPS, abs: sc.startFrame + f, sc};
};
const withShake = (s: CamState, f: number, amp: number, speed = 1): CamState => {
  const sh = shake(f, amp, speed);
  return {...s, pos: [s.pos[0] + sh[0], s.pos[1] + sh[1], s.pos[2] + sh[2]], look: [s.look[0] + sh[1] * 0.5, s.look[1] + sh[0] * 0.5, s.look[2]]};
};
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/* ================= 1. MOND (Hook) ================= */
export const MoonScene: React.FC = () => {
  const {f, t, abs} = useScene('moon');
  const moonPos: V3 = [24, 38, -90];
  const keys: Key[] = [
    {f: 0, pos: [6, 33, -26], look: [22, 38, -90], fov: 50},
    {f: 40, pos: [10, 34, -24], look: [22, 37, -90], fov: 52, ease: 'lin'},
    {f: 72, pos: [-12, 20, -12], look: [12, 28, -60], fov: 58, ease: 'io'},
    {f: 112, pos: [-7, 7, 26], look: [0, 3.5, 0], fov: 56, ease: 'io'},
    {f: 191, pos: [3.2, 2.5, 9.5], look: [0, 3.0, 0], fov: 40, ease: 'out'},
  ];
  const shardK = prog(f, 16, 78);
  const shardPos = lerp3([14, 40, -68], [-26, 20, -22], ease('in', shardK));
  const frags: V3[] = [[2, 56, -80], [38, 52, -85], [46, 30, -70], [4, 22, -76], [-4, 36, -88]];
  return (
    <>
      <Lights fog="#2a2250" near={60} far={260} hemi={0.7} keyI={1.5} keyPos={[10, 22, 10]} />
      <Cam shot={(ff) => withShake(sampleKeys(ff, keys), ff, ff < 40 ? 0.12 : 0.03, 1.4)} />
      <NightSky t={t} moonPos={moonPos} crack={prog(f, 0, 22)} />
      {frags.map((p, i) => (
        <group key={i} position={[p[0], p[1] + Math.sin(t + i) * 0.6, p[2]]} rotation={[t * 0.6 + i, t * 0.4, 0]}>
          <Glow shape="octa" s={[1.2 + (i % 3) * 0.5, 1.8, 1.1]} c="#dfe8ff" />
        </group>
      ))}
      {shardK > 0 && shardK < 1 && (
        <group position={shardPos} rotation={[t * 3, t * 2, 0]}>
          <Glow shape="octa" s={[1.6, 3.2, 1.2]} c="#ffffff" />
          <Glow shape="octa" s={[2.6, 5, 2]} c="#b6c8ff" opacity={0.25} />
        </group>
      )}
      <Dust t={t} count={60} center={[0, 18, -40]} spread={[50, 30, 60]} color="#cfe0ff" size={0.5} speed={0.3} seed="mstar" />
      <Plateau t={t} />
      <Finn t={t} pose="lantern" prop="lantern" face={f < 100 ? 'neutral' : 'determined'} talk={talkAmount(abs, 'narrator')} rotationY={Math.PI - 0.15} position={[0, 0.3, 0]} />
    </>
  );
};

/* ================= 2. HELD ================= */
export const HeroScene: React.FC = () => {
  const {f, t, abs} = useScene('hero');
  const c: V3 = [0, 2.3, 0];
  const ks: Key[] = [];
  const N = 6;
  for (let i = 0; i <= N; i++) {
    const k = i / N, ff = Math.round(k * 92);
    ks.push({f: ff, pos: orbit(c, lerp(6.8, 5.2, k), lerp(-1.35, 0.35, k), lerp(-1.6, 0.7, k)), look: [0, lerp(1.6, 2.6, k), 0], fov: lerp(60, 44, k), ease: 'lin'});
  }
  ks.push({f: 108, pos: [0.9, 3.1, 2.7], look: [0, 2.95, 0], fov: 32, ease: 'io'});
  ks.push({f: 124, pos: [0.6, 3.05, 2.3], look: [0, 2.95, 0], fov: 30, ease: 'lin'});
  const l3 = lineRel('hero', 'l03');
  const faceK = prog(f, l3.start + 40, l3.start + 62);
  return (
    <>
      <Lights fog="#2e2459" near={30} far={170} hemi={0.9} keyI={2.0} keyPos={[-10, 20, 14]} />
      <Cam shot={(ff) => withShake(sampleKeys(ff, ks), ff, 0.02)} />
      <NightSky t={t} moonPos={[26, 40, -85]} />
      <Plateau t={t} />
      <Finn t={t} pose="lantern" prop="lantern" face={['smile', 'determined', faceK]} talk={talkAmount(abs, 'narrator')} position={[0, 0.3, 0]} rotationY={0.1} />
    </>
  );
};

/* ================= 3. KRISTALLWALD ================= */
export const ForestScene: React.FC = () => {
  const {f, t, abs} = useScene('forest');
  const walkEnd = lineRel('forest', 'l04').end + 4;
  const z = 4 - Math.min(f, walkEnd) * 0.165;
  const fin: V3 = [0, 0.3, z];
  const l5 = lineRel('forest', 'l05');
  const rel: Key[] = [
    {f: 0, pos: [-3.2, 1.3, 6.5], look: [0, 2.0, -3], fov: 55},
    {f: 40, pos: [3.8, 2.2, 5.5], look: [0, 2.4, -2], fov: 52, ease: 'io'},
    {f: 62, pos: [5.4, 1.6, 0.5], look: [0, 2.2, 0], fov: 50, ease: 'lin'},
    {f: 88, pos: [-3.0, 0.9, -4.2], look: [0, 2.6, 0], fov: 46, ease: 'io'},
    {f: l5.start - 8, pos: [-2.0, 1.0, -3.4], look: [0, 2.7, 0], fov: 44, ease: 'lin'},
  ];
  const eyes: V3 = [4.4, 1.9, fin[2] - 11.5];
  const shot = (ff: number): CamState => {
    if (ff < l5.start - 8) {
      const r = sampleKeys(ff, rel);
      return withShake({pos: add(fin, r.pos), look: add(fin, r.look), fov: r.fov, roll: 0}, ff, 0.04);
    }
    if (ff < l5.end + 8) { // Schwenk auf die leuchtenden Augen
      const k = ease('snap', (ff - (l5.start - 8)) / 9);
      const a = lerp3(add(fin, [-2.0, 1.0, -3.4]), add(fin, [-0.4, 1.7, -3.0]), k);
      const lk = lerp3(add(fin, [0, 2.7, 0]), eyes, k);
      const push = prog(ff, l5.start + 4, l5.end + 8);
      return withShake({pos: lerp3(a, add(a, [1.6, 0, -3]), push), look: lk, fov: lerp(46, 30, push), roll: lerp(0.0, 0.07, push)}, ff, 0.05, 1.6);
    }
    const p = prog(ff, l5.end + 8, 173);
    return withShake({pos: add(fin, [0.9 - p * 0.3, 3.0, -2.5 + p * 0.4]), look: add(fin, [0, 2.95, 0]), fov: lerp(34, 29, p), roll: 0}, ff, 0.025);
  };
  const eyeOn = f >= l5.start - 2;
  const blink = (f % 40) > 36 ? 0.1 : 1;
  const talk = talkAmount(abs, 'narrator');
  return (
    <>
      <Lights fog="#2a2a78" near={10} far={75} hemi={1.3} keyI={2.4} keyPos={[-6, 18, 10]} shadowAt={fin} sky="#8fa8ff" ground="#3a2f6a" ambient={0.35} />
      <Cam shot={shot} />
      <Sky top="#07051c" mid="#1d1a4a" bottom="#120d30" />
      <Stars rot={0.5} />
      <ForestSet t={t} />
      {eyeOn && (
        <group position={eyes}>
          <mesh position={[0, 0.1, -2.2]}><boxGeometry args={[4.5, 5, 2]} /><meshStandardMaterial color="#0a0714" /></mesh>
          <Glow p={[-0.55, 0, 0.1]} s={[0.55, 0.3 * blink, 0.1]} c="#ffd23d" />
          <Glow p={[0.55, 0, 0.1]} s={[0.55, 0.3 * blink, 0.1]} c="#ffd23d" />
          <pointLight color="#ffc83a" intensity={12} distance={9} position={[0, 0, 1.5]} />
        </group>
      )}
      <Finn t={t} pose={f < walkEnd ? 'sneak' : ['sneak', 'shock', clamp01((f - walkEnd) / 14) * 0.45]} face={f < l5.start ? 'neutral' : 'worry'} talk={talk}
        position={fin} rotationY={Math.PI} prop="lantern" />
    </>
  );
};

/* ================= 4. HÖHLE: Drache entdeckt ================= */
export const CaveScene: React.FC = () => {
  const {f, t, abs} = useScene('cave');
  const l6 = lineRel('cave', 'l06'), l7 = lineRel('cave', 'l07');
  const coil = 1 - 0.5 * ease('out', prog(f, l6.start + 22, l6.start + 55));
  const dBase: V3 = [0, 0, -4], dRot = Math.PI * 0.85;
  const head = dragonHead(t, coil, dBase, dRot);
  const roar = f > l6.start + 24 && f < l6.start + 50 ? 1 : 0;
  const keys: Key[] = [
    {f: 0, pos: [2.4, 3.3, 9.8], look: [0, 2, -3], fov: 56},
    {f: l6.start + 14, pos: [1.5, 2.5, 7.4], look: [0, 1.6, -3.5], fov: 50, ease: 'out'},
    {f: l6.start + 24, pos: [1.5, 2.45, 7.2], look: [0, 1.6, -3.5], fov: 50, ease: 'lin'},
    {f: l6.start + 56, pos: [-0.4, 1.7, 1.5], look: [0, 1.5, -4], fov: 42, ease: 'in'},
  ];
  const shot = (ff: number): CamState => {
    if (ff < l7.start - 4) {
      const s = sampleKeys(ff, keys);
      const sh = ff > l6.start + 24 && ff < l6.start + 52 ? 0.12 : 0.03;
      return withShake(s, ff, sh, 1.7);
    }
    const p = prog(ff, l7.start - 4, 167);
    const pos: V3 = [head.pos[0] + 3.2 - p * 0.8, head.pos[1] + 1.4, head.pos[2] + 6.6 - p * 1.4];
    return withShake({pos, look: add(head.pos, [0, -0.1, 0]), fov: lerp(36, 30, p), roll: lerp(-0.08, 0.06, p)}, ff, 0.02);
  };
  return (
    <>
      <Lights fog="#150e2c" near={14} far={60} hemi={0.45} keyI={0.5} keyPos={[0, 20, 8]} key="#cdd8ff" shadowAt={[0, 0, 0]} />
      <Cam shot={shot} />
      <CaveSet t={t} bc={[0, 0, -11]} />
      <Dragon t={t} position={dBase} rotationY={dRot} coil={coil} shard talk={talkAmount(abs, 'dragon')} roar={roar} flap={0.6} />
      <Finn t={t} pose={f < l6.start + 10 ? 'sneak' : ['sneak', 'shock', clamp01((f - l6.start - 10) / 12) * 0.7]} face={f < l6.start + 8 ? 'neutral' : 'shock'}
        talk={talkAmount(abs, 'narrator')} position={[0, 0, 5.5]} rotationY={Math.PI} prop="lantern" />
    </>
  );
};

/* ================= 5. DUELL ================= */
export const DuelScene: React.FC = () => {
  const {f, t, abs} = useScene('duel');
  const l8 = lineRel('duel', 'l08'), l9 = lineRel('duel', 'l09');
  const drawK = prog(f, l8.start + 2, l8.start + 18);
  const swingK = prog(f, l8.start + 22, l8.start + 34);
  const finnPose: ['sneak' | 'sword', 'sword' | 'swing', number] = f < l8.start + 22 ? ['sneak', 'sword', ease('out', drawK)] : ['sword', 'swing', ease('in', swingK)];
  const dBase: V3 = [0, 0, -5], dRot = Math.PI;
  const coil = 0.22;
  const head = dragonHead(t, coil, dBase, dRot);
  const keys: Key[] = [
    {f: 0, pos: [-2.6, 0.55, 1.0], look: [0, 2.0, 4], fov: 58, roll: 0.14},
    {f: l8.start + 18, pos: [-1.4, 0.8, 1.6], look: [0, 2.3, 4], fov: 50, roll: 0.1, ease: 'out'},
    {f: l9.start - 6, pos: [-1.0, 0.9, 1.4], look: [0, 2.4, 4], fov: 46, roll: 0.0, ease: 'lin'},
  ];
  const shot = (ff: number): CamState => {
    if (ff < l9.start - 4) return withShake(sampleKeys(ff, keys), ff, ff > l8.start + 20 ? 0.1 : 0.02, 1.8);
    const p = prog(ff, l9.start - 4, 130);
    return withShake({
      pos: [head.pos[0] + 3.0 - p * 0.8, head.pos[1] + 0.4, head.pos[2] + 6.4 - p * 1.2], look: add(head.pos, [0, 0.1, 0]), fov: lerp(42, 34, p), roll: lerp(-0.05, 0.05, p)}, ff, 0.025);
  };
  const dragonTalk = talkAmount(abs, 'dragon');
  return (
    <>
      <Lights fog="#150e2c" near={14} far={60} hemi={0.45} keyI={0.5} keyPos={[0, 20, 8]} />
      <Cam shot={shot} />
      <CaveSet t={t} bc={[0, 0, -11]} />
      <Dragon t={t} position={dBase} rotationY={dRot} coil={coil} shard talk={dragonTalk} roar={f > l9.start - 8 && f < l9.start + 6 ? 1 : 0} flap={0.8} />
      <Finn t={t} pose={finnPose} face={f < l9.start ? 'determined' : 'shock'} talk={talkAmount(abs, 'narrator')} position={[0, 0, 4]} rotationY={Math.PI}
        prop={f > l8.start + 6 ? 'sword' : 'lantern'} />
    </>
  );
};

/* ================= 6. WENDUNG ================= */
export const TwistScene: React.FC = () => {
  const {f, t, abs} = useScene('twist');
  const dBase: V3 = [0, 0, -4], dRot = Math.PI;
  const rise = prog(f, 28, 118);
  const shardPos = lerp3([0, 1.6, -2.8], [0, 4.0, -2], ease('out', prog(f, 8, 36)));
  const shardY = shardPos[1] + ease('in', rise) * 30;
  const c: V3 = [0, 2.4, 0];
  const ks: Key[] = [];
  for (let i = 0; i <= 6; i++) {
    const k = i / 6;
    ks.push({f: Math.round(k * 108), pos: orbit(c, lerp(9.5, 7.5, k), lerp(-0.95, 0.9, k), lerp(0.8, 2.4, k)), look: [0, lerp(2.4, 3.6, k), -1.5], fov: lerp(52, 46, k), ease: 'lin'});
  }
  ks.push({f: 126, pos: [0.4, 2.2, 3.5], look: [0, 20, -30], fov: 52, ease: 'io'});
  ks.push({f: 169, pos: [0.4, 2.4, 3.5], look: [0, 31, -42], fov: 58, ease: 'lin'});
  return (
    <>
      <Lights fog="#150e2c" near={14} far={450} hemi={0.5} keyI={0.5} keyPos={[0, 20, 8]} />
      <Cam shot={(ff) => withShake(sampleKeys(ff, ks), ff, 0.03)} />
      <Sky top="#0a0626" mid="#3b2670" bottom="#1b1240" />
      <Stars />
      <Moon position={[0, 74, -70]} radius={22} crack={1} t={t} />
      {/* Rückblick: Silber-Finn zerschlägt den Mond */}
      {f > 118 && (
        <group position={[0, 46, -46]} scale={2.6}>
          <Finn t={t} pose={['sword', 'swing', clamp01((f - 128) / 24)]} prop="sword" ghost face="determined" rotationY={0} />
          <pointLight color="#9fc4ff" intensity={200} distance={60} position={[0, 3, 3]} />
        </group>
      )}
      <CaveSet t={t} beam={1.1} runes={prog(f, 60, 110) * 0.8} />
      <Dragon t={t} position={dBase} rotationY={dRot} coil={0.15} talk={talkAmount(abs, 'dragon')} flap={0.7} />
      <group position={[0, shardY, shardPos[2]]} rotation={[t * 2, t * 1.4, 0]}>
        <Glow shape="octa" s={[0.35, 0.8, 0.28]} c="#ffffff" />
        <Glow shape="octa" s={[0.6, 1.3, 0.5]} c="#bcd0ff" opacity={0.25} />
        <pointLight color="#cfe0ff" intensity={40} distance={14} />
      </group>
      <Finn t={t} pose="shock" face={f < 60 ? 'shock' : 'worry'} talk={talkAmount(abs, 'narrator')} position={[0, 0, 3]} rotationY={Math.PI} prop="none" />
    </>
  );
};

/* ================= 7. ENTHÜLLUNG ================= */
export const RevealScene: React.FC = () => {
  const {f, t, abs} = useScene('reveal');
  const l12 = lineRel('reveal', 'l12');
  const glowK = prog(f, l12.start + 24, l12.start + 46);
  const lift = ease('io', prog(f, l12.start + 40, l12.start + 100));
  const beamK = 1 + prog(f, l12.start + 44, l12.start + 90) * 1.4;
  const crackStart = l12.start + 100;
  const fy = lift * 1.3;
  const fin: V3 = [0, fy, -1];
  const keys: Key[] = [
    {f: 0, pos: [0.3, 2.6, 6.5], look: [0, 2.9, -1], fov: 34},
    {f: 62, pos: [0.2, 2.9, 2.2], look: [0, 3.0, -1], fov: 62, ease: 'lin'},
    {f: l12.start + 14, pos: [0.0, 3.2, 1.4], look: [0, 3.1, -1], fov: 34, ease: 'snap'},
    {f: l12.start + 50, pos: [0.2, 3.3, 0.6], look: [0, 3.25 + fy, -1], fov: 24, ease: 'lin'},
    {f: l12.start + 74, pos: [3.6, 0.6, 3.4], look: [0, 3.8, -1], fov: 62, ease: 'out'},
    {f: l12.start + 112, pos: [-3.2, 1.0, 4.6], look: [0, 4.2, -1], fov: 58, ease: 'io'},
    {f: 245, pos: [0.6, 11, 2.6], look: [0, 0.5, -1], fov: 62, ease: 'io'},
  ];
  const shards = Array.from({length: 9}, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + t * 1.3, r = 2.2 + Math.sin(i) * 0.4;
    return [Math.cos(a) * r, 3.2 + fy + Math.sin(a * 2 + i) * 0.6, -1 + Math.sin(a) * r] as V3;
  });
  const shardOn = prog(f, l12.start + 50, l12.start + 70);
  return (
    <>
      <Lights fog="#150e2c" near={14} far={450} hemi={0.45} keyI={0.5} keyPos={[0, 20, 8]} />
      <Cam shot={(ff) => withShake(sampleKeys(ff, keys), ff, ff < 62 ? 0.07 : ff > crackStart ? 0.08 : 0.03, 1.8)} />
      <Sky top="#0a0626" mid="#3b2670" bottom="#1b1240" />
      <Stars />
      <Moon position={[0, 74, -70]} radius={22} crack={1} t={t} />
      <CaveSet t={t} beam={beamK} runes={prog(f, l12.start + 30, l12.start + 70)} ground={false} />
      <CrackingGround frame={f} start={crackStart} />
      <pointLight position={[0, 4 + fy, 1]} color="#cfe3ff" intensity={glowK * 60} distance={12} />
      {shardOn > 0 && shards.map((p, i) => (
        <group key={i} position={p} rotation={[t * 2 + i, t + i, 0]} scale={shardOn}>
          <Glow shape="octa" s={[0.25, 0.6, 0.2]} c="#ffffff" />
        </group>
      ))}
      <Dust t={t} count={80} center={[0, 3 + fy, -1]} spread={[6, 8, 6]} color="#cfe0ff" size={0.14} speed={1.2} seed="rv" rise={glowK * 3} />
      <Finn t={t} pose={f < l12.start + 36 ? 'shock' : ['shock', 'power', clamp01((f - l12.start - 36) / 20)]} face={f < l12.start + 22 ? 'shock' : 'glow'} glow={glowK}
        talk={talkAmount(abs, 'narrator')} position={fin} rotationY={0} />
    </>
  );
};

/* ================= 8. CLIFFHANGER ================= */
export const EndScene: React.FC = () => {
  const {f, t} = useScene('end');
  const out = ease('io', prog(f, 80, 124));
  const keys: Key[] = [
    {f: 0, pos: [3.4, 4.5, 8.5], look: [0, 0.4, 0], fov: 55},
    {f: 60, pos: [-3.0, 2.2, 6.5], look: [0, 0.2, 0], fov: 50, ease: 'io'},
    {f: 124, pos: [0, 5, 22], look: [0, -1, 0], fov: 62, ease: 'io'},
  ];
  void out;
  return (
    <>
      <Lights fog="#07041a" near={20} far={80} hemi={0.7} keyI={0.8} keyPos={[4, 14, 8]} sky="#b79bff" ground="#2a1f5a" />
      <Cam shot={(ff) => withShake(sampleKeys(ff, keys), ff, 0.05, 1.6)} />
      <AbyssSet frame={f} />
      <pointLight position={[3, 3, 3]} color="#ff7ad9" intensity={60} distance={20} />
      <pointLight position={[-3, -2, 3]} color="#7fe8ff" intensity={60} distance={20} />
      <group rotation={[0.6 + Math.sin(t) * 0.2, t * 0.5, Math.sin(t * 0.8) * 0.3]}>
        <Finn t={t} pose="fall" face="shock" glow={0.8} position={[0, -1.5, 0]} rotationY={0} />
      </group>
      <Dragon t={t} position={[4, 0.5, -3]} rotationY={Math.PI * 1.1} coil={0} talk={0.2} flap={1.4} lights={false} />
    </>
  );
};
