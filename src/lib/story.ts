import timeline from '../story/timeline.json';

export type Word = {w: string; start: number; end: number};
export type Line = {
  id: string; text: string; voice: 'narrator' | 'dragon'; file: string;
  startFrame: number; durationFrames: number; words: Word[]; env: number[];
};
export type Scene = {id: string; startFrame: number; durationFrames: number; lines: Line[]};
export const TL = timeline as unknown as {fps: number; totalFrames: number; scenes: Scene[]};
export const sceneById = (id: string) => TL.scenes.find((s) => s.id === id)!;
export const allLines = (): Line[] => TL.scenes.flatMap((s) => s.lines);

/** Mundöffnung (0..1) aus der echten Audio-Hüllkurve – absoluter Frame. */
export const talkAmount = (absFrame: number, voice: 'narrator' | 'dragon') => {
  for (const l of allLines()) {
    if (l.voice !== voice) continue;
    const i = absFrame - l.startFrame;
    if (i >= 0 && i < l.env.length) return l.env[i] ?? 0;
  }
  return 0;
};

/** Beginn/Ende einer Zeile relativ zum Szenenstart. */
export const lineRel = (sceneId: string, lineId: string) => {
  const sc = sceneById(sceneId);
  const l = sc.lines.find((x) => x.id === lineId)!;
  return {start: l.startFrame - sc.startFrame, end: l.startFrame - sc.startFrame + l.durationFrames};
};
