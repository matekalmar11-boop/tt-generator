/** Zeitbasis aus der bisherigen TTS-Timeline (src/story/timeline.json) – bis Schritt 3 die TTS aus der YAML erzeugt. */
import {TL, allLines} from '../lib/story';
import type {Clock} from './resolve';

export const clockFromLegacy = (sceneId: string): Clock & {startFrame: number} => {
  const sc = TL.scenes.find((s) => s.id === sceneId);
  if (!sc) throw new Error(`Szene "${sceneId}" fehlt in timeline.json`);
  return {
    fps: TL.fps, startFrame: sc.startFrame, durationFrames: sc.durationFrames,
    lines: Object.fromEntries(sc.lines.map((l) => [l.id, {
      start: l.startFrame - sc.startFrame, end: l.startFrame - sc.startFrame + l.durationFrames,
      words: l.words.map((w) => ({start: w.start - sc.startFrame, end: w.end - sc.startFrame})),
    }])),
  };
};

/** Mundöffnung der Stimme `voiceId` zum absoluten Frame (echte Audio-Hüllkurve). */
export const legacyTalk = (voiceId: string, absFrame: number): number => {
  for (const l of allLines()) {
    if (l.voice !== voiceId) continue;
    const i = absFrame - l.startFrame;
    if (i >= 0 && i < l.env.length) return l.env[i] ?? 0;
  }
  return 0;
};
