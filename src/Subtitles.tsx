import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {allLines, Line} from './lib/story';

type Chunk = {words: Line['words']; start: number; end: number; voice: Line['voice']};

/** Zerlegt jede Sprechzeile in 1–3-Wort-Häppchen (TikTok-Stil), Zeiten stammen direkt aus der TTS-Timeline. */
const buildChunks = (): Chunk[] => {
  const out: Chunk[] = [];
  for (const l of allLines()) {
    let cur: Line['words'] = [];
    const flush = () => {
      if (!cur.length) return;
      out.push({words: cur, start: cur[0].start, end: cur[cur.length - 1].end, voice: l.voice});
      cur = [];
    };
    for (const w of l.words) {
      const len = cur.concat(w).map((x) => x.w).join(' ').length;
      if (cur.length >= 3 || len > 24) flush();
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
export const CHUNKS = buildChunks();

const clean = (w: string) => w.replace(/[.,]$/, '');

export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const chunk = CHUNKS.find((c) => frame >= c.start && frame < c.end);
  if (!chunk) return null;
  const local = frame - chunk.start;
  const accent = chunk.voice === 'dragon' ? '#7ff3ff' : '#ffd23d';
  const longest = Math.max(...chunk.words.map((w) => clean(w.w).length));
  const fs = Math.min(104, Math.floor(880 / (longest * 0.74)));
  const pop = spring({frame: local, fps, config: {damping: 11, stiffness: 220}, durationInFrames: 12});
  const fade = interpolate(frame, [chunk.end - 3, chunk.end], [1, 0], {extrapolateLeft: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 560, opacity: fade}}>
      {chunk.voice === 'dragon' && (
        <div style={{fontFamily: 'Inter', fontWeight: 800, fontSize: 40, letterSpacing: 6, color: '#7ff3ff', marginBottom: 18, textShadow: '0 0 18px #20c6e6'}}>
          ✦ LUMI, DER LICHTDRACHE ✦
        </div>
      )}
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0px 40px', maxWidth: 980, transform: `scale(${0.85 + pop * 0.15})`}}>
        {chunk.words.map((w, i) => {
          const active = frame >= w.start && frame < w.end + 1;
          const kp = active ? spring({frame: frame - w.start, fps, config: {damping: 9, stiffness: 260}, durationInFrames: 10}) : 0;
          return (
            <span key={i} style={{
              display: 'inline-block', fontFamily: 'Inter, "DejaVu Sans", sans-serif', fontWeight: 900, fontSize: fs, lineHeight: 1.08,
              textTransform: 'uppercase', color: active ? accent : '#fff', transform: `scale(${1 + kp * 0.1}) translateY(${-kp * 6}px)`,
              WebkitTextStroke: '12px #0b0620', paintOrder: 'stroke fill', textShadow: '0 10px 0 rgba(8,4,28,0.65)',
            }}>{clean(w.w)}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
