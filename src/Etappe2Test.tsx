/** Funktionstest Etappe 2: stummer Demo-Film aus stories/demo-etappe2.yaml (Presets, person, room, empty_stage). Nur für Standbilder. */
import React from 'react';
import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {parse} from 'yaml';
import demoYaml from '../stories/demo-etappe2.yaml';
import {Story} from './story/schema';
import {StoryScene} from './story/StoryScene';

export const demoStory = Story.parse(parse(demoYaml));
let cursor = 0;
export const demoScenes = demoStory.scenes.map((s) => {
  const durationFrames = Math.round((s.timing.pre + s.timing.post) * demoStory.format.fps);
  const r = {id: s.id, startFrame: cursor, clock: {fps: demoStory.format.fps, durationFrames, lines: {}}};
  cursor += durationFrames;
  return r;
});
export const demoTotalFrames = cursor;

export const Etappe2Test: React.FC = () => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: '#07041a'}}>
      <ThreeCanvas width={width} height={height} shadows camera={{fov: 50, position: [0, 3, 10], near: 0.1, far: 900}} gl={{antialias: true}}>
        {demoScenes.map((s) => (
          <Sequence key={s.id} from={s.startFrame} durationInFrames={s.clock.durationFrames} layout="none">
            <StoryScene story={demoStory} sceneId={s.id} clock={s.clock} talk={() => 0} />
          </Sequence>
        ))}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
