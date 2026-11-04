import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

type Line = {from: number; to: number; text: string};

const LINES: Line[] = [
  {from: 0, to: 60, text: 'Hallo TikTok!'},
  {from: 60, to: 120, text: 'Das ist ein Test'},
  {from: 120, to: 180, text: 'Eine Figur aus Blöcken'},
  {from: 180, to: 240, text: 'Schnelle Kamerafahrten'},
  {from: 240, to: 300, text: 'Folge mir für mehr!'},
];

const COLORS = ['#ffffff', '#25f4ee', '#fe2c55'];

export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const line = LINES.find((l) => frame >= l.from && frame < l.to);
  if (!line) return null;

  const local = frame - line.from;
  const words = line.text.split(' ');
  const outFade = interpolate(local, [50, 60], [1, 0], {
    extrapolateLeft: 'clamp',
    easing: Easing.in(Easing.quad),
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 330,
        opacity: outFade,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0 44px',
          maxWidth: 940,
          fontFamily: 'Impact, "Arial Black", "DejaVu Sans", sans-serif',
          fontWeight: 900,
          fontSize: 88,
          textTransform: 'uppercase',
          textAlign: 'center',
          lineHeight: 1.1,
        }}
      >
        {words.map((w, i) => {
          const s = spring({frame: local - i * 5, fps, config: {damping: 9, stiffness: 180}});
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                color: COLORS[i % COLORS.length],
                transform: `scale(${s}) rotate(${(1 - s) * -8}deg)`,
                opacity: Math.min(1, s * 2),
                WebkitTextStroke: '7px #000',
                paintOrder: 'stroke fill',
                textShadow: '0 8px 0 rgba(0,0,0,0.6)',
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
