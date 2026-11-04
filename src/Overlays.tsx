import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {sceneById, TL} from './lib/story';

/** Vignette + Film-Look */
export const Vignette: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(5,2,20,0.62) 100%)', pointerEvents: 'none'}} />
);

/** Weißer Blitz an Szenenübergängen (verdeckt den harten Schnitt). */
export const CutFlash: React.FC = () => {
  const f = useCurrentFrame();
  let o = 0;
  for (const s of TL.scenes.slice(1)) {
    const b = s.startFrame;
    if (f >= b - 3 && f < b) o = Math.max(o, (f - (b - 3)) / 3 * 0.9);
    if (f >= b && f < b + 9) o = Math.max(o, 0.9 * (1 - (f - b) / 9) ** 2);
  }
  return o > 0 ? <AbsoluteFill style={{background: '#e9efff', opacity: o}} /> : null;
};

export const SeriesTag: React.FC = () => (
  <div style={{position: 'absolute', top: 150, left: 56, fontFamily: 'Inter', fontWeight: 800, fontSize: 34, letterSpacing: 5, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.8)', opacity: 0.9}}>
    DER MONDSPLITTER <span style={{color: '#ffd23d'}}>· TEIL 1</span>
  </div>
);

/** Namensschild für Finn in der Heldenszene. */
export const LowerThird: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sc = sceneById('hero');
  const local = f - sc.startFrame - 34;
  if (local < 0 || f > sc.startFrame + sc.durationFrames - 2) return null;
  const s = spring({frame: local, fps, config: {damping: 14, stiffness: 160}});
  return (
    <div style={{position: 'absolute', left: 56, top: 250, transform: `translateX(${(1 - s) * -520}px)`, fontFamily: 'Inter'}}>
      <div style={{background: '#ffd23d', color: '#1a0f3a', fontWeight: 900, fontSize: 84, padding: '4px 30px', display: 'inline-block', transform: 'skewX(-8deg)'}}>FINN</div>
      <div style={{background: '#1a0f3a', color: '#fff', fontWeight: 700, fontSize: 38, padding: '8px 26px', marginTop: 6, display: 'inline-block', letterSpacing: 3}}>LATERNENWÄCHTER VON HIMMELSFELS</div>
    </div>
  );
};

/** Cliffhanger-Karte am Ende. */
export const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sc = sceneById('end');
  const local = f - sc.startFrame - 74;
  if (local < 0) return null;
  const s = spring({frame: local, fps, config: {damping: 10, stiffness: 140}});
  const pulse = 1 + Math.sin(local * 0.25) * 0.03;
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', paddingBottom: 380}}>
      <div style={{transform: `scale(${s * pulse})`, textAlign: 'center', fontFamily: 'Inter'}}>
        <div style={{fontWeight: 900, fontSize: 190, color: '#fff', letterSpacing: 6, WebkitTextStroke: '16px #0b0620', paintOrder: 'stroke fill', textShadow: '0 0 60px #ff7ad9'}}>TEIL 2</div>
        <div style={{fontWeight: 800, fontSize: 52, color: '#ffd23d', letterSpacing: 8, marginTop: -6, textShadow: '0 4px 0 #0b0620'}}>FOLGT MORGEN</div>
      </div>
    </AbsoluteFill>
  );
};
