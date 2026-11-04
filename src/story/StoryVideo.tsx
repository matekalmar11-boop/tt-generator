/**
 * <StoryVideo>: komplette Geschichte aus der YAML – 3D-Szenen, Untertitel, Einblendungen, Cut-Flash, Stimmen, Soundeffekte, Musik.
 * Verwendet die bestehenden Bausteine (Szenen, Untertitel-Darstellung, Audio-Dateien in public/audio).
 * Sprechdateien/Sounds, die nicht in audioManifest.json stehen, werden NICHT abgespielt (kein Abbruch) und von `story check` gemeldet.
 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import manifest from './audioManifest.json';
import type {StoryData} from './schema';
import {StoryScene} from './StoryScene';
import {StoryCaptions, StoryCutFlash, StorySeriesTag} from './StoryOverlays';
import {buildChunksFrom, SubtitleView, type SubVoice} from '../Subtitles';
import {Vignette} from '../Overlays';
import {mouthFor, sceneClock, talkAt, type Timeline} from './timeline';
import {TimeScale} from './timescale';
import {toFrames} from './resolve';

/**
 * Pixeldichte der 3D-Fläche. R3F begrenzt dpr standardmäßig auf mindestens 1 – bei Vorschau-Renderings mit `scale` < 1 (Seitenverhältnis
 * unverändert, deviceScaleFactor = scale) würde die 3D-Fläche deshalb weiter in voller Auflösung berechnet und danach nur verkleinert.
 * Mit min = devicePixelRatio (<1) rechnet sie in der Zielauflösung. Bei scale 1 (finales Video) und im Studio ändert sich nichts.
 */
const PIXEL_RATIO: [number, number] = [typeof window !== 'undefined' ? Math.min(1, window.devicePixelRatio || 1) : 1, 2];

const HAVE = new Set(manifest as string[]);
export const hasAudio = (file: string) => HAVE.has(file);

/** Alle Audiodateien, die die Geschichte braucht, aber nicht in public/audio liegen. */
export const missingAudio = (story: StoryData, tl: Timeline): {file: string; what: string}[] => {
  const out: {file: string; what: string}[] = [];
  for (const [si, sc] of story.scenes.entries()) {
    for (const l of tl.scenes[si].lines) if (!hasAudio(l.file)) out.push({file: l.file, what: `Sprechzeile ${l.id} (Szene ${sc.id})`});
    for (const s of sc.sfx) if (!hasAudio(`audio/${s.sound}.wav`)) out.push({file: `audio/${s.sound}.wav`, what: `Soundeffekt in Szene ${sc.id}`});
  }
  const m = story.audio.music;
  if (m && !hasAudio(`audio/${m.file}.wav`)) out.push({file: `audio/${m.file}.wav`, what: 'Musik'});
  return out;
};

/** Anzahl Bilder der Komposition bei `renderFps` (Vorschau: z. B. 15 statt 30 FPS → halb so viele Bilder). */
export const compFrames = (tl: Timeline, scale: number) => Math.ceil(tl.totalFrames / scale - 1e-9);
/** Erstes Bild der Szene i in der Komposition (aufgerundet, damit der Zeitversatz nie negativ wird). */
export const sceneFrom = (startFrame: number, scale: number) => Math.ceil(startFrame / scale - 1e-9);

export const StoryVideo: React.FC<{story: StoryData; timeline: Timeline; renderFps?: number}> = ({story, timeline: tl, renderFps}) => {
  const {width, height} = useVideoConfig();
  const fps = story.format.fps;                      // Autoren-FPS: alle Zeiten in der YAML beziehen sich darauf
  const scale = fps / (renderFps ?? fps);            // 1 = finale Qualität; 2 = Vorschau mit halber Bildrate
  const total = compFrames(tl, scale);
  const froms = tl.scenes.map((s) => sceneFrom(s.startFrame, scale));
  const clocks = React.useMemo(() => tl.scenes.map((s) => sceneClock(s, tl.fps)), [tl]);
  const allLines = tl.scenes.flatMap((s) => s.lines);
  const sub = story.subtitles;
  const chunks = React.useMemo(
    () => buildChunksFrom(allLines.map((l) => ({voice: l.voice ?? '', words: l.words})), sub.maxWords, sub.maxChars),
    [tl, sub.maxWords, sub.maxChars]); // eslint-disable-line react-hooks/exhaustive-deps
  const voices: Record<string, SubVoice> = Object.fromEntries(Object.entries(story.voices).map(([id, v]) => [id, {accent: v.subtitle.accent, label: v.subtitle.label}]));

  // Musik unter der Stimme absenken (Ducking) + Ausblenden am Ende
  const music = story.audio.music;
  const frameClock = {fps, durationFrames: 0, lines: {}};
  const duckVol = (fOut: number) => {
    if (!music) return 0;
    const f = fOut * scale;
    const att = toFrames(music.duck.attack, frameClock), rel = toFrames(music.duck.release, frameClock), fade = toFrames(music.fadeOut, frameClock);
    let d = 0;
    for (const l of allLines) {
      const a = l.startFrame - 4, b = l.startFrame + l.durationFrames + 6;
      d = Math.max(d, interpolate(f, [a - att, a, b, b + rel], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
    }
    const fo = interpolate(f, [tl.totalFrames - fade, tl.totalFrames], [1, 0], {extrapolateLeft: 'clamp'});
    return (music.volume - music.duck.depth * d) * fo;
  };

  return (
    <TimeScale scale={scale} fps={fps} offset={0}>
    <AbsoluteFill style={{background: '#07041a'}}>
      <ThreeCanvas width={width} height={height} dpr={PIXEL_RATIO} shadows camera={{fov: 50, position: [0, 3, 10], near: 0.1, far: 900}} gl={{antialias: true}}>
        {story.scenes.map((sc, i) => (
          <Sequence key={sc.id} from={froms[i]} durationInFrames={(froms[i + 1] ?? total) - froms[i]} layout="none">
            <TimeScale scale={scale} fps={fps} offset={froms[i] * scale - tl.scenes[i].startFrame}>
              <StoryScene story={story} sceneId={sc.id} clock={clocks[i]} talk={(voice, f) => talkAt(tl.scenes[i], voice, f)} mouth={(voice, f) => mouthFor(tl.scenes[i], voice, f)} />
            </TimeScale>
          </Sequence>
        ))}
      </ThreeCanvas>
      {story.overlays.vignette !== false && <Vignette />}
      <StorySeriesTag story={story} timeline={tl} />
      <StoryCaptions story={story} timeline={tl} />
      <SubtitleView chunks={chunks} style={{maxFontSize: sub.maxFontSize, bottomPadding: sub.bottomPadding, font: sub.font}} voices={voices} />
      <StoryCutFlash story={story} timeline={tl} />

      {/* Audio */}
      {music && hasAudio(`audio/${music.file}.wav`) && <Audio src={staticFile(`audio/${music.file}.wav`)} volume={duckVol} />}
      {allLines.filter((l) => hasAudio(l.file)).map((l) => (
        <Sequence key={l.id} from={Math.round(l.startFrame / scale)} durationInFrames={Math.ceil((l.durationFrames + 6) / scale)}><Audio src={staticFile(l.file)} volume={1} /></Sequence>
      ))}
      {story.scenes.flatMap((sc, i) => sc.sfx.filter((s) => hasAudio(`audio/${s.sound}.wav`)).map((s, k) => {
        const at = Math.round(toFrames(s.at, clocks[i]));
        return (
          <Sequence key={`${sc.id}${s.sound}${k}`} from={Math.round((tl.scenes[i].startFrame + at) / scale)} durationInFrames={s.loop === 'scene' ? Math.ceil((tl.scenes[i].durationFrames - at) / scale) : undefined}>
            <Audio src={staticFile(`audio/${s.sound}.wav`)} volume={s.volume} />
          </Sequence>
        );
      }))}
    </AbsoluteFill>
    </TimeScale>
  );
};
