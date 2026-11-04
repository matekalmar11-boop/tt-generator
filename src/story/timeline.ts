/**
 * Zeitleiste einer Geschichte (für Untertitel, Mundbewegung, Audio, Überblendungen).
 * Quelle 1: echte TTS-Timeline (src/story/timeline.json, bisher nur Mondsplitter) → exakte Wort-Timings und Audio-Hüllkurve.
 * Quelle 2: Schätzung aus dem Text (≈18 Zeichen/s, Wörter proportional zur Länge) für Geschichten ohne gesprochene Dateien.
 * Bundle-sicher (kein fs): die Prüfung, ob Sprechdateien existieren, liegt in audioManifest.json + `story check`.
 */
import type {StoryData} from './schema';
import type {Clock} from './resolve';

export const CHARS_PER_SEC = 18; // gemessen an den Mondsplitter-Zeilen (Piper Thorsten, lengthScale 1.08)
export const estLineSeconds = (text: string) => {
  const sentences = text.split(/(?<=[.!?])\s+/).length;
  return Math.max(0.8, text.length / CHARS_PER_SEC) + 0.24 * (sentences - 1) * 0.3;
};

export type TLWord = {w: string; start: number; end: number};
export type TLLine = {id: string; who: string; voice?: string; text: string; file: string; startFrame: number; durationFrames: number; words: TLWord[]; env: number[]; real: boolean};
export type TLScene = {id: string; startFrame: number; durationFrames: number; lines: TLLine[]};
export type Timeline = {fps: number; totalFrames: number; scenes: TLScene[]};

type LegacyTL = {fps: number; scenes: {id: string; startFrame: number; durationFrames: number; lines: {id: string; text: string; startFrame: number; durationFrames: number; words: TLWord[]; env: number[]}[]}[]};

/** Sprechdatei einer Zeile (Konvention: public/audio/vo_<zeilen-id>.wav). */
export const voiceFile = (lineId: string) => `audio/vo_${lineId}.wav`;

/** Geschätzte Wortgrenzen (proportional zur Wortlänge) und eine einfache Mund-Hüllkurve pro Wort – nur für Vorschau ohne TTS. */
const estWords = (text: string, start: number, dur: number): {words: TLWord[]; env: number[]} => {
  const ws = text.split(/\s+/).filter(Boolean);
  const total = ws.reduce((n, w) => n + w.length + 1, 0);
  let acc = 0;
  const words = ws.map((w) => {
    const a = start + Math.round((acc / total) * dur);
    acc += w.length + 1;
    return {w, start: a, end: start + Math.round((acc / total) * dur)};
  });
  const env = Array.from({length: dur}, (_, i) => {
    const w = words.find((x) => start + i >= x.start && start + i < x.end);
    if (!w) return 0;
    const k = (start + i - w.start) / Math.max(1, w.end - w.start);
    return 0.25 + 0.55 * Math.abs(Math.sin(k * Math.PI * 1.5));
  });
  return {words, env};
};

/** Ergebnis von `story voice` (src/story/voices/<story-id>.json): echte Dauer, Wort-Timings (Sekunden) und Mund-Hüllkurve je Zeile. */
export type VoiceData = {fps: number; lines: Record<string, {text: string; seconds: number; timingMode: string; words: TLWord[]; env: number[]}>};
const norm = (t: string) => t.split(/\s+/).filter(Boolean).join(' ');

export const buildTimeline = (story: StoryData, legacy?: LegacyTL, voices?: VoiceData): Timeline => {
  const fps = story.format.fps;
  const gap = story.timing.lineGap;
  const scenes: TLScene[] = [];
  let cursor = 0;
  for (const sc of story.scenes) {
    const ls = legacy?.scenes.find((s) => s.id === sc.id);
    const vd = voices && voices.fps === story.format.fps && sc.lines.length > 0 && sc.lines.every((l) => voices.lines[l.id] && norm(voices.lines[l.id].text) === norm(l.text)) ? voices : undefined;
    const real = !!ls && sc.lines.every((l) => ls.lines.find((x) => x.id === l.id)?.text === l.text);
    const lines: TLLine[] = [];
    let duration: number;
    if (real && ls) {
      for (const l of sc.lines) {
        const r = ls.lines.find((x) => x.id === l.id)!;
        lines.push({id: l.id, who: l.who, voice: story.cast[l.who]?.voice, text: l.text, file: voiceFile(l.id), startFrame: r.startFrame, durationFrames: r.durationFrames, words: r.words, env: r.env, real: true});
      }
      duration = ls.durationFrames;
      cursor = ls.startFrame; // echte Zeitleiste ist absolut
    } else if (vd) { // echte Spracherzeugung (Piper): Dauer, Wortzeiten und Hüllkurve aus der Datei
      let t = sc.timing.pre;
      for (const l of sc.lines) {
        const v = vd.lines[l.id];
        const start = cursor + Math.round(t * fps);
        const words = v.words.map((w) => ({w: w.w, start: start + Math.round(w.start * fps), end: start + Math.max(Math.round(w.end * fps), Math.round(w.start * fps) + 2)}));
        lines.push({id: l.id, who: l.who, voice: story.cast[l.who]?.voice, text: l.text, file: voiceFile(l.id), startFrame: start, durationFrames: Math.ceil(v.seconds * fps), words, env: v.env, real: true});
        t += v.seconds + gap;
      }
      duration = Math.round((t - gap + sc.timing.post) * fps);
    } else {
      let t = sc.timing.pre;
      for (const l of sc.lines) {
        const dur = Math.max(1, Math.round(estLineSeconds(l.text) * fps));
        const start = cursor + Math.round(t * fps);
        lines.push({id: l.id, who: l.who, voice: story.cast[l.who]?.voice, text: l.text, file: voiceFile(l.id), startFrame: start, durationFrames: dur, ...estWords(l.text, start, dur), real: false});
        t += dur / fps + gap;
      }
      duration = Math.round((sc.lines.length ? t - gap + sc.timing.post : sc.timing.pre + sc.timing.post) * fps);
    }
    scenes.push({id: sc.id, startFrame: cursor, durationFrames: duration, lines});
    cursor += duration;
  }
  return {fps, totalFrames: cursor, scenes};
};

/** Zeitbasis für <StoryScene>: Zeilen/Wörter relativ zum Szenenanfang. */
export const sceneClock = (s: TLScene, fps: number): Clock => ({
  fps, durationFrames: s.durationFrames,
  lines: Object.fromEntries(s.lines.map((l) => [l.id, {
    start: l.startFrame - s.startFrame, end: l.startFrame - s.startFrame + l.durationFrames,
    words: l.words.map((w) => ({start: w.start - s.startFrame, end: w.end - s.startFrame})),
  }])),
});

/** Mundöffnung der Stimme `voice` im Szenen-Frame `f` (Audio-Hüllkurve bzw. Schätzung). */
export const talkAt = (s: TLScene, voice: string, f: number): number => {
  for (const l of s.lines) {
    if (l.voice !== voice) continue;
    const i = s.startFrame + f - l.startFrame;
    if (i >= 0 && i < l.env.length) return l.env[i] ?? 0;
  }
  return 0;
};
