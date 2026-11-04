/**
 * Funktionstest für <StoryScene>: spielt die Mondsplitter-YAML mit der generischen Szene ab
 * (nur 3D-Bild; Ton, Untertitel und Einblendungen folgen später). Die Referenz bleibt die Composition "Main".
 */
import React from 'react';
import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {parse} from 'yaml';
import mondsplitterYaml from '../stories/mondsplitter.yaml';
import {Story} from './story/schema';
import {StoryScene} from './story/StoryScene';
import {CaveScene, DuelScene, EndScene, ForestScene, HeroScene, MoonScene, RevealScene, TwistScene} from './scenes/Scenes';
import {clockFromLegacy, legacyTalk} from './story/legacyTiming';

export const testStory = Story.parse(parse(mondsplitterYaml));
export const testScenes = testStory.scenes.map((s) => ({id: s.id, clock: clockFromLegacy(s.id)}));
export const testTotalFrames = testScenes.reduce((n, s) => n + s.clock.durationFrames, 0);

const REF: Record<string, React.FC> = {moon: MoonScene, hero: HeroScene, forest: ForestScene, cave: CaveScene, duel: DuelScene, twist: TwistScene, reveal: RevealScene, end: EndScene};

/** Referenz nur mit dem 3D-Bild (ohne Untertitel/Einblendungen/Ton) – Vergleichsbasis für StoryTest. */
export const RefBild: React.FC = () => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: '#07041a'}}>
      <ThreeCanvas width={width} height={height} shadows camera={{fov: 50, position: [0, 3, 10], near: 0.1, far: 900}} gl={{antialias: true}}>
        {testScenes.map((s) => {
          const C = REF[s.id];
          return <Sequence key={s.id} from={s.clock.startFrame} durationInFrames={s.clock.durationFrames} layout="none"><C /></Sequence>;
        })}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

export const StoryTest: React.FC = () => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: '#07041a'}}>
      <ThreeCanvas width={width} height={height} shadows camera={{fov: 50, position: [0, 3, 10], near: 0.1, far: 900}} gl={{antialias: true}}>
        {testScenes.map((s) => (
          <Sequence key={s.id} from={s.clock.startFrame} durationInFrames={s.clock.durationFrames} layout="none">
            <StoryScene story={testStory} sceneId={s.id} clock={s.clock} talk={(voice, f) => legacyTalk(voice, s.clock.startFrame + f)} />
          </Sequence>
        ))}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
