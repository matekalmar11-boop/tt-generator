/**
 * <StoryScene>: baut EINE Szene aus der YAML-Konfiguration (Schritt 2).
 * Verwendet ausschließlich die bestehenden Bausteine (src/world/*, src/lib/*) – nichts wird neu gezeichnet.
 * Muss innerhalb einer <Sequence> und eines <ThreeCanvas> stehen (Frame 0 = Szenenanfang).
 * Was die Registry kennt, aber noch nicht gebaut ist (Status "planned"), wird NICHT nachgebaut, sondern bricht
 * mit einer klaren Fehlermeldung ab – es gibt keine stillen Ersatzanimationen.
 */
import React from 'react';
import {useStoryFrame} from './timescale';
import {Glow} from '../lib/Box';
import {clamp01, type V3} from '../lib/anim';
import {Cam, AbyssSet, CaveSet, CrackingGround, ForestSet, Lights, NightSky, Plateau} from '../world/Sets';
import {Finn} from '../world/Finn';
import {Dragon, dragonHead} from '../world/Dragon';
import {Person} from '../world/Person';
import {EmptyStage, RoomSet} from '../world/Interiors';
import {CityStreet} from '../world/City';
import {Dust, Moon, Sky, Stars} from '../world/Nature';
import {OBJECTS, RIGS, SETS} from './registry';
import type {SceneData, StoryData} from './schema';
import {
  StoryError, angle, applyShake, buildCamera, resolveRef, sampleCamera, sampleHard, sampleName, sampleNum, samplePath,
  toFrames, visibleAt, type CamState, type Clock, type NameKey, type NumKey, type PathKey, type RefEnv,
} from './resolve';

export type StorySceneProps = {
  story: StoryData;
  sceneId: string;
  clock: Clock;
  /** Mundöffnung 0..1 der Stimme `voiceId` zum SZENEN-Frame `frame` (aus der TTS-Hüllkurve). */
  talk: (voiceId: string, frame: number) => number;
};

type ActorD = SceneData['actors'][number];
type ObjectD = SceneData['objects'][number];
type TrackMap = Record<string, {t: unknown; v: number; ease?: string}[]> | undefined;

const track = (tracks: TrackMap, name: string, c: Clock): NumKey[] | undefined =>
  tracks?.[name]?.map((k) => ({f: toFrames(k.t, c), v: k.v, ease: k.ease}));
const trackAt = (tracks: TrackMap, name: string, f: number, c: Clock, dflt: number) => sampleNum(track(tracks, name, c), f, dflt);
const nameKeys = (keys: {t: unknown; mix?: number; ease?: string}[], field: string, c: Clock): NameKey[] =>
  keys.map((k) => ({f: toFrames(k.t, c), name: (k as any)[field], mix: k.mix, ease: k.ease}));

/* ───────────── Figur- und Objektzustand (Position etc.) zu einem Frame ───────────── */

const actorPosAt = (a: ActorD, f: number, c: Clock): V3 =>
  a.path ? samplePath(a.path.map((k) => ({f: toFrames(k.t, c), v: k.pos as V3, ease: k.ease})), f) : ((a.at as V3 | undefined) ?? [0, 0, 0]);

const dragonCoil = (a: ActorD, f: number, c: Clock) => trackAt(a.tracks, 'coil', f, c, typeof a.params?.coil === 'number' ? a.params.coil : 0);

const makeEnv = (story: StoryData, scene: SceneData, c: Clock, fps: number): RefEnv => {
  const actor = (id: string) => {
    const a = scene.actors.find((x) => x.id === id);
    if (!a) throw new StoryError(`Verweis auf unbekannte Figur "${id}" in Szene "${scene.id}"`);
    return a;
  };
  const env: RefEnv = {
    actorPos: (id, f) => actorPosAt(actor(id), f, c),
    actorYaw: (id) => angle(actor(id).yaw),
    actorHead: (id, f) => {
      const a = actor(id);
      if (story.cast[a.cast]?.rig !== 'dragon') throw new StoryError(`"${id}.head": einen Kopf-Verweis gibt es bisher nur für Figurenart "dragon"`);
      return dragonHead(f / fps, dragonCoil(a, f, c), actorPosAt(a, f, c), angle(a.yaw), a.scale).pos;
    },
    objectPos: (id, f) => {
      const o = scene.objects.find((x) => x.id === id);
      if (!o) throw new StoryError(`Verweis auf unbekanntes Objekt "${id}" in Szene "${scene.id}"`);
      return objPos(o, f);
    },
  };
  const objPos = (o: ObjectD, f: number): V3 =>
    o.path ? samplePath(o.path.map((k) => ({f: toFrames(k.t, c), v: k.pos as V3, ease: k.ease})), f)
      : o.at ? resolveRef(o.at, env, f) : (o.params?.center as V3 | undefined) ?? [0, 0, 0];
  return env;
};

/* ───────────── Komponente ───────────── */

export const StoryScene: React.FC<StorySceneProps> = ({story, sceneId, clock: c, talk}) => {
  const f = useStoryFrame();
  const fps = story.format.fps;
  const t = f / fps;
  const scene = story.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new StoryError(`Szene "${sceneId}" existiert nicht in der Geschichte "${story.meta.id}"`);
  const env = React.useMemo(() => makeEnv(story, scene, c, fps), [story, scene, c, fps]);
  const cam = React.useMemo(() => buildCamera(scene.camera, c), [scene, c]);
  for (const a of scene.actors) {
    const rig = RIGS[story.cast[a.cast]?.rig];
    if (!rig) throw new StoryError(`Figur "${a.cast}" (Szene "${scene.id}") hat eine unbekannte Figurenart`);
    if (rig.status !== 'ready') throw new StoryError(`Figurenart "${story.cast[a.cast].rig}" ist in der Registry nur geplant, nicht gebaut (Szene "${scene.id}", Figur "${a.id}")`);
  }

  const shot = (ff: number): CamState => applyShake(sampleCamera(cam.keys, ff, env), cam.shake, ff, c);

  /* Kulisse */
  const setDef = SETS[scene.set.type];
  if (!setDef) throw new StoryError(`Unbekannte Kulisse "${scene.set.type}"`);
  if (setDef.status !== 'ready') throw new StoryError(`Kulisse "${scene.set.type}" ist in der Registry nur geplant, nicht gebaut (Szene "${scene.id}")`);
  const sp = scene.set.params ?? {};
  let setNode: React.ReactNode;
  switch (scene.set.type) {
    case 'plateau': setNode = <Plateau t={t} lantern={sp.lantern ?? true} />; break;
    case 'forest': setNode = <ForestSet t={t} />; break;
    case 'cave':
      setNode = <CaveSet t={t} bc={sp.center} ground={sp.ground ?? true} beam={trackAt(scene.set.tracks, 'beam', f, c, 1)} runes={trackAt(scene.set.tracks, 'runes', f, c, 0)} />;
      break;
    case 'abyss': setNode = <AbyssSet frame={f} />; break;
    case 'room': setNode = <RoomSet wall={sp.wall} floor={sp.floor} trim={sp.trim} accent={sp.accent} window={sp.window} furniture={sp.furniture} />; break;
    case 'city_street': setNode = <CityStreet building={sp.building} road={sp.road} sidewalk={sp.sidewalk} accent={sp.accent} lamps={sp.lamps} cars={sp.cars} trees={sp.trees} windows={sp.windows} seed={sp.seed} />; break;
    case 'empty_stage': setNode = <EmptyStage floor={sp.floor} grid={sp.grid} accent={sp.accent} />; break;
    default: throw new StoryError(`Kulisse "${scene.set.type}" ist in der Registry als "ready" markiert, hat aber noch keine Anbindung in StoryScene`);
  }

  /* Himmel */
  const en = scene.environment;
  let envNode: React.ReactNode = null;
  if (en) {
    const crack = trackAt(en.tracks, 'crack', f, c, en.moon?.crack ?? 0);
    if (en.type === 'night_sky') {
      if (en.clouds === false || en.colors || en.stars) throw new StoryError('night_sky: "clouds: false", "colors" und "stars" werden von NightSky noch nicht unterstützt');
      envNode = <NightSky t={t} moonPos={en.moon?.pos as V3 | undefined} moonR={en.moon?.radius} crack={crack} islands={en.islands ?? true} />;
    } else if (en.type === 'starry_sky') {
      const col = en.colors ?? {top: '#0a0626', mid: '#3b2670', bottom: '#1b1240'};
      envNode = (
        <>
          <Sky top={col.top} mid={col.mid} bottom={col.bottom} />
          <Stars rot={en.stars?.rotation ?? 0} />
          {en.moon && <Moon position={en.moon.pos as V3} radius={en.moon.radius} crack={crack} t={t} />}
        </>
      );
    } else if (en.type === 'gradient') {
      const col = en.colors ?? {top: '#1b1f3a', mid: '#2a3052', bottom: '#12152a'};
      envNode = <Sky top={col.top} mid={col.mid} bottom={col.bottom} />;
    } else if (en.type !== 'none') throw new StoryError(`Unbekannter Himmel "${en.type}"`);
  }

  /* Licht */
  const L = scene.light;
  const lightNode = (
    <Lights fog={L.fog.color} near={L.fog.near} far={L.fog.far} sky={L.hemi.sky} ground={L.hemi.ground} hemi={L.hemi.intensity} ambient={L.ambient}
      keyColor={L.key.color} keyI={L.key.intensity} keyPos={L.key.pos as V3} shadowAt={resolveRef(L.key.shadowAt, env, f)} />
  );

  /* Figuren */
  const actorNodes = scene.actors.map((a) => {
    if (!visibleAt(a.visible, f, c)) return null;
    const member = story.cast[a.cast];
    const pos = actorPosAt(a, f, c);
    const speech = member.voice ? talk(member.voice, f) : 0;
    const yaw = angle(a.yaw);
    let node: React.ReactNode;
    if (member.rig === 'finn') {
      const pose = typeof a.pose === 'string' ? a.pose : a.pose ? sampleName(nameKeys(a.pose, 'pose', c), f) : 'idle';
      const face = typeof a.face === 'string' ? a.face : a.face ? sampleName(nameKeys(a.face, 'face', c), f) : 'neutral';
      const prop = typeof a.prop === 'string' ? a.prop : a.prop ? sampleHard(a.prop.map((k) => ({f: toFrames(k.t, c), name: k.prop})), f, 'none') : 'none';
      node = <Finn t={t} pose={pose as any} face={face as any} prop={prop as any} talk={speech} glow={trackAt(a.tracks, 'glow', f, c, 0)}
        position={pos} rotationY={yaw} scale={a.scale} ghost={a.ghost} look={member.look as any} />;
    } else if (member.rig === 'person') {
      const pose = typeof a.pose === 'string' ? a.pose : a.pose ? sampleName(nameKeys(a.pose, 'pose', c), f) : 'idle';
      const face = typeof a.face === 'string' ? a.face : a.face ? sampleName(nameKeys(a.face, 'face', c), f) : 'neutral';
      const prop = typeof a.prop === 'string' ? a.prop : a.prop ? sampleHard(a.prop.map((k) => ({f: toFrames(k.t, c), name: k.prop})), f, 'none') : 'none';
      node = <Person t={t} pose={pose as any} face={face as any} prop={prop as any} talk={speech} position={pos} rotationY={yaw} scale={a.scale}
        ghost={a.ghost} look={member.look as any} />;
    } else if (member.rig === 'dragon') {
      const p = a.params ?? {};
      node = <Dragon t={t} position={pos} rotationY={yaw} scale={a.scale} coil={dragonCoil(a, f, c)} roar={trackAt(a.tracks, 'roar', f, c, 0)}
        talk={typeof p.talk === 'number' ? p.talk : speech} flap={typeof p.flap === 'number' ? p.flap : 1} shard={p.shard === true} lights={p.lights !== false} />;
    } else throw new StoryError(`Figurenart "${member.rig}" ist in der Registry als "ready" markiert, hat aber noch keine Anbindung in StoryScene`);
    if (a.rotate) { // dauerhaftes Taumeln um den Szenenursprung
      const r = a.rotate;
      const rot = [0, 1, 2].map((i) => r.base[i] + r.amp[i] * Math.sin(r.freq[i] * t) + r.rate[i] * t) as V3;
      node = <group rotation={rot}>{node}</group>;
    }
    return <React.Fragment key={a.id}>{node}</React.Fragment>;
  });

  /* Objekte */
  const objectNodes = scene.objects.map((o, i) => {
    const def = OBJECTS[o.type];
    if (!def) throw new StoryError(`Unbekannter Objekttyp "${o.type}"`);
    if (def.status !== 'ready') throw new StoryError(`Objekttyp "${o.type}" ist in der Registry nur geplant, nicht gebaut (Szene "${scene.id}")`);
    if (!visibleAt(o.visible, f, c)) return null;
    const p = o.params ?? {};
    const at: V3 = o.path ? samplePath(o.path.map((k) => ({f: toFrames(k.t, c), v: k.pos as V3, ease: k.ease})), f) : o.at ? resolveRef(o.at, env, f) : (p.center as V3 | undefined) ?? [0, 0, 0];
    const key = o.id ?? `${o.type}${i}`;
    switch (o.type) {
      case 'floating_shards':
        return (p.positions as V3[]).map((q, j) => (
          <group key={key + j} position={[q[0], q[1] + Math.sin(t + j) * 0.6, q[2]]} rotation={[t * 0.6 + j, t * 0.4, 0]}>
            <Glow shape="octa" s={[1.2 + (j % 3) * 0.5, 1.8, 1.1]} c={p.color ?? '#dfe8ff'} />
          </group>
        ));
      case 'glow_shard': {
        const spin = p.spin ?? {x: 2, y: 1.4};
        const light = p.light as {color: string; intensity: number; distance: number} | undefined;
        return (
          <group key={key} position={at} rotation={[t * spin.x, t * spin.y, 0]}>
            <Glow shape="octa" s={p.size} c="#ffffff" />
            {p.halo && <Glow shape="octa" s={p.halo} c={p.haloColor ?? '#b6c8ff'} opacity={0.25} />}
            {light && <pointLight color={light.color} intensity={light.intensity} distance={light.distance} />}
          </group>
        );
      }
      case 'eyes_in_dark': {
        const every = Math.round((p.blinkEvery ?? 1.333) * fps);
        const blink = f % every > every - 4 ? 0.1 : 1;
        const col = p.color ?? '#ffd23d';
        return (
          <group key={key} position={at}>
            <mesh position={[0, 0.1, -2.2]}><boxGeometry args={[4.5, 5, 2]} /><meshStandardMaterial color="#0a0714" /></mesh>
            <Glow p={[-0.55, 0, 0.1]} s={[0.55, 0.3 * blink, 0.1]} c={col} />
            <Glow p={[0.55, 0, 0.1]} s={[0.55, 0.3 * blink, 0.1]} c={col} />
            <pointLight color="#ffc83a" intensity={12} distance={9} position={[0, 0, 1.5]} />
          </group>
        );
      }
      case 'orbiting_shards': {
        const k = clamp01(trackAt(o.tracks, 'scale', f, c, 1));
        if (k <= 0) return null;
        const n = p.count ?? 9, rad = p.radius ?? 2.2, spd = p.speed ?? 1.3;
        return Array.from({length: n}, (_, j) => {
          const a = (j / n) * Math.PI * 2 + t * spd, r = rad + Math.sin(j) * 0.4;
          return (
            <group key={key + j} position={[at[0] + Math.cos(a) * r, at[1] + Math.sin(a * 2 + j) * 0.6, at[2] + Math.sin(a) * r]} rotation={[t * 2 + j, t + j, 0]} scale={k}>
              <Glow shape="octa" s={[0.25, 0.6, 0.2]} c="#ffffff" />
            </group>
          );
        });
      }
      case 'dust':
        return <Dust key={key} t={t} count={p.count} center={at} spread={p.spread} color={p.color} size={p.size} speed={p.speed} seed={p.seed} rise={trackAt(o.tracks, 'rise', f, c, p.rise ?? 0)} />;
      case 'point_light':
        return <pointLight key={key} position={at} color={p.color} intensity={trackAt(o.tracks, 'intensity', f, c, 1)} distance={p.distance} />;
      case 'cracking_ground':
        return <CrackingGround key={key} frame={f} start={toFrames(p.start, c)} size={p.size} />;
      default:
        throw new StoryError(`Objekttyp "${o.type}" ist in der Registry als "ready" markiert, hat aber noch keine Anbindung in StoryScene`);
    }
  });

  return (
    <>
      {lightNode}
      <Cam shot={() => shot(f)} />
      {envNode}
      {setNode}
      {objectNodes}
      {actorNodes}
    </>
  );
};
