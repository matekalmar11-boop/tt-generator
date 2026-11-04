/** Storyboard-Planung (ohne Rendering): ein Standbild je Einstellung (Kamera-Schnitt) einer Szene. Genutzt von `story board`. */
import type {StoryData} from './schema';
import {sceneClock, type Timeline} from './timeline';
import {toFrames} from './resolve';

export type BoardShot = {scene: string; shot: number; startFrame: number; endFrame: number; frame: number; sec: number; label: string};

/**
 * Einstellungen einer Szene = Abschnitte zwischen harten Kamera-Schnitten (camera.shots mit transition "cut" ab from > 0, camera.keys mit cut: true).
 * Je Einstellung ein Bild bei `at` (Anteil 0–1, Vorgabe 0.4) der Länge; Einstellungen über 3,5 s bekommen zwei Bilder (bei 25 % und 75 %).
 * Rückgabe: Bilder mit absoluten Frames der Gesamt-Zeitleiste.
 */
export const boardPlan = (story: StoryData, tl: Timeline, opts: {at?: number; scenes?: string[]} = {}): BoardShot[] => {
  const at = Math.min(0.95, Math.max(0.05, opts.at ?? 0.4));
  const out: BoardShot[] = [];
  story.scenes.forEach((sc, si) => {
    if (opts.scenes && !opts.scenes.includes(sc.id)) return;
    const ts = tl.scenes[si];
    const clock = sceneClock(ts, tl.fps);
    const cuts = new Set<number>([0]);
    sc.camera.shots.forEach((s) => { if (s.transition !== 'blend') { const f = Math.round(toFrames(s.from, clock)); if (f > 0 && f < ts.durationFrames) cuts.add(f); } });
    sc.camera.keys.forEach((k) => { if (k.cut) { const f = Math.round(toFrames(k.t, clock)); if (f > 0 && f < ts.durationFrames) cuts.add(f); } });
    const starts = [...cuts].sort((a, b) => a - b);
    starts.forEach((a, i) => {
      const b = i + 1 < starts.length ? starts[i + 1] : ts.durationFrames, len = b - a;
      const fr = len / tl.fps > 3.5 ? [0.25, 0.75] : [at];
      fr.forEach((k) => {
        const local = Math.min(ts.durationFrames - 1, Math.max(a, a + Math.round(len * k)));
        out.push({scene: sc.id, shot: i + 1, startFrame: ts.startFrame + a, endFrame: ts.startFrame + b, frame: ts.startFrame + local, sec: local / tl.fps,
          label: `${String(out.length + 1).padStart(2, '0')} ${sc.id} ${(local / tl.fps).toFixed(1)}s`});
      });
    });
  });
  return out;
};
