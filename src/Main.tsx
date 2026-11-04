import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {allLines, sceneById, TL} from './lib/story';
import {CaveScene, DuelScene, EndScene, ForestScene, HeroScene, MoonScene, RevealScene, TwistScene} from './scenes/Scenes';
import {CutFlash, EndCard, LowerThird, SeriesTag, Vignette} from './Overlays';
import {Subtitles} from './Subtitles';

const SCENES: Record<string, React.FC> = {moon: MoonScene, hero: HeroScene, forest: ForestScene, cave: CaveScene, duel: DuelScene, twist: TwistScene, reveal: RevealScene, end: EndScene};

/** Soundeffekte: [Datei, Frame relativ zum Szenenstart, Lautstärke] */
const SFX: Record<string, [string, number, number][]> = {
  moon: [['crack', 2, 0.9], ['whoosh', 20, 0.8], ['wind', 0, 0.35], ['whoosh', 66, 0.55], ['chime', 150, 0.35]],
  hero: [['whoosh_fast', 0, 0.6], ['chime', 36, 0.4], ['wind', 0, 0.3]],
  forest: [['steps', 0, 0.55], ['whoosh_fast', 111, 0.8], ['heartbeat', 118, 0.8], ['rumble', 120, 0.3]],
  cave: [['whoosh_fast', 0, 0.5], ['magic_hum', 0, 0.35], ['roar', 36, 0.85], ['chime', 88, 0.5]],
  duel: [['sword', 10, 0.8], ['whoosh_fast', 32, 0.8], ['boom', 46, 0.5], ['roar', 40, 0.3]],
  twist: [['whoosh_fast', 0, 0.5], ['chime', 10, 0.5], ['riser', 60, 0.55], ['boom', 124, 0.9]],
  reveal: [['stinger', 0, 0.55], ['heartbeat', 10, 0.8], ['chime', 100, 0.6], ['riser', 90, 0.6], ['rumble', 150, 0.9], ['boom', 172, 0.9]],
  end: [['whoosh', 0, 0.7], ['rumble', 0, 0.5], ['stinger', 70, 0.9]],
};

// Musik wird unter der Stimme abgesenkt (Ducking)
const voiceRanges = allLines().map((l) => [l.startFrame - 4, l.startFrame + l.durationFrames + 6] as const);
const musicVol = (f: number) => {
  let d = 0;
  for (const [a, b] of voiceRanges) d = Math.max(d, interpolate(f, [a - 6, a, b, b + 12], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const fadeOut = interpolate(f, [TL.totalFrames - 45, TL.totalFrames], [1, 0], {extrapolateLeft: 'clamp'});
  return (0.5 - 0.3 * d) * fadeOut;
};

export const Main: React.FC = () => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: '#07041a'}}>
      <ThreeCanvas width={width} height={height} shadows camera={{fov: 50, position: [0, 3, 10], near: 0.1, far: 900}} gl={{antialias: true}}>
        {TL.scenes.map((s) => {
          const C = SCENES[s.id];
          return (
            <Sequence key={s.id} from={s.startFrame} durationInFrames={s.durationFrames} layout="none">
              <C />
            </Sequence>
          );
        })}
      </ThreeCanvas>
      <Vignette />
      <SeriesTag />
      <LowerThird />
      <Subtitles />
      <EndCard />
      <CutFlash />

      {/* Audio */}
      <Audio src={staticFile('audio/music.wav')} volume={musicVol} />
      {allLines().map((l) => (
        <Sequence key={l.id} from={l.startFrame} durationInFrames={l.durationFrames + 6}>
          <Audio src={staticFile(l.file)} volume={1} />
        </Sequence>
      ))}
      {TL.scenes.flatMap((s) => (SFX[s.id] ?? []).map(([name, at, vol], i) => (
        <Sequence key={s.id + name + i} from={s.startFrame + at} durationInFrames={name === 'wind' ? s.durationFrames - at : undefined}>
          <Audio src={staticFile(`audio/${name}.wav`)} volume={vol} />
        </Sequence>
      )))}
    </AbsoluteFill>
  );
};
void sceneById;
