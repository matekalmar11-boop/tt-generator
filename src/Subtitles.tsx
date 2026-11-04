import React from 'react';
import {AbsoluteFill, interpolate, spring} from 'remotion';
import {useStoryFps, useStoryFrame} from './story/timescale';
import {allLines, Line} from './lib/story';

export type Chunk = {words: Line['words']; start: number; end: number; voice: string};
export type SubLine = {voice: string; words: Line['words']};
export type SubStyle = {maxFontSize: number; bottomPadding: number; font: string};
export type SubVoice = {accent: string; label?: string; glow?: string};

/** Zerlegt jede Sprechzeile in 1–N-Wort-Häppchen (TikTok-Stil), Zeiten stammen direkt aus der Timeline. */
export const buildChunksFrom = (lines: SubLine[], maxWords = 3, maxChars = 24): Chunk[] => {
  const out: Chunk[] = [];
  for (const l of lines) {
    let cur: Line['words'] = [];
    const flush = () => {
      if (!cur.length) return;
      out.push({words: cur, start: cur[0].start, end: cur[cur.length - 1].end, voice: l.voice});
      cur = [];
    };
    for (const w of l.words) {
      const len = cur.concat(w).map((x) => x.w).join(' ').length;
      if (cur.length >= maxWords || len > maxChars) flush();
      cur.push(w);
      if (/[.!?:,]$/.test(w.w)) flush();
    }
    flush();
  }
  // Ende eines Häppchens = Beginn des nächsten (innerhalb derselben Zeile), sonst Wortende + 6 Frames
  return out.map((c, i) => {
    const n = out[i + 1];
    const end = n && n.start - c.end < 14 ? n.start : c.end + 6;
    return {...c, end};
  });
};
const legacyLines = (): SubLine[] => allLines().map((l) => ({voice: l.voice, words: l.words}));
export const CHUNKS = buildChunksFrom(legacyLines());

const clean = (w: string) => w.replace(/[.,]$/, '');

/** Darstellung (gemeinsam für den alten Mondsplitter-Film und YAML-Geschichten). */
export const SubtitleView: React.FC<{chunks: Chunk[]; style: SubStyle; voices: Record<string, SubVoice>; defaultVoice?: SubVoice}> =
  ({chunks, style, voices, defaultVoice = {accent: '#ffd23d'}}) => {
  const frame = useStoryFrame();
  const fps = useStoryFps();
  const chunk = chunks.find((c) => frame >= c.start && frame < c.end);
  if (!chunk) return null;
  const local = frame - chunk.start;
  const v = voices[chunk.voice] ?? defaultVoice;
  const accent = v.accent;
  const longest = Math.max(...chunk.words.map((w) => clean(w.w).length));
  const fs = Math.min(style.maxFontSize, Math.floor(880 / (longest * 0.74)));
  const pop = spring({frame: local, fps, config: {damping: 11, stiffness: 220}, durationInFrames: 12});
  const fade = interpolate(frame, [chunk.end - 3, chunk.end], [1, 0], {extrapolateLeft: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: style.bottomPadding, opacity: fade}}>
      {v.label && (
        <div style={{fontFamily: 'Inter', fontWeight: 800, fontSize: 40, letterSpacing: 6, color: accent, marginBottom: 18, textShadow: `0 0 18px ${v.glow ?? accent}`}}>
          ✦ {v.label} ✦
        </div>
      )}
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0px 40px', maxWidth: 980, transform: `scale(${0.85 + pop * 0.15})`}}>
        {chunk.words.map((w, i) => {
          const active = frame >= w.start && frame < w.end + 1;
          const kp = active ? spring({frame: frame - w.start, fps, config: {damping: 9, stiffness: 260}, durationInFrames: 10}) : 0;
          return (
            <span key={i} style={{
              display: 'inline-block', fontFamily: `${style.font}, "DejaVu Sans", sans-serif`, fontWeight: 900, fontSize: fs, lineHeight: 1.08,
              textTransform: 'uppercase', color: active ? accent : '#fff', transform: `scale(${1 + kp * 0.1}) translateY(${-kp * 6}px)`,
              WebkitTextStroke: '12px #0b0620', paintOrder: 'stroke fill', textShadow: '0 10px 0 rgba(8,4,28,0.65)',
            }}>{clean(w.w)}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const LEGACY_STYLE: SubStyle = {maxFontSize: 104, bottomPadding: 560, font: 'Inter'};
const LEGACY_VOICES: Record<string, SubVoice> = {dragon: {accent: '#7ff3ff', label: 'LUMI, DER LICHTDRACHE', glow: '#20c6e6'}};
export const Subtitles: React.FC = () => <SubtitleView chunks={CHUNKS} style={LEGACY_STYLE} voices={LEGACY_VOICES} />;
