/** Einblendungen aus der YAML: Serien-Tag, Titel, Namensschilder, Endkarte, Cut-Flash. Optik wie im Mondsplitter-Film (src/Overlays.tsx). */
import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {StoryData} from './schema';
import {toFrames} from './resolve';
import {sceneClock, type Timeline} from './timeline';

type Props = {story: StoryData; timeline: Timeline};

export const StorySeriesTag: React.FC<Props> = ({story}) => {
  const t = story.overlays.seriesTag;
  if (!t) return null;
  return (
    <div style={{position: 'absolute', top: 150, left: 56, fontFamily: 'Inter', fontWeight: 800, fontSize: 34, letterSpacing: 5, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.8)', opacity: 0.9}}>
      {t.text}{t.accent && <> <span style={{color: t.accentColor ?? '#ffd23d'}}>{t.accent}</span></>}
    </div>
  );
};

/** Namensschilder, Titel und Endkarten aller Szenen (Zeiten relativ zur Szene, Anker erlaubt). */
export const StoryCaptions: React.FC<Props> = ({story, timeline}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out: React.ReactNode[] = [];
  story.scenes.forEach((sc, si) => {
    const ts = timeline.scenes[si];
    if (f < ts.startFrame || f >= ts.startFrame + ts.durationFrames) return;
    const clock = sceneClock(ts, timeline.fps);
    sc.captions.forEach((c, ci) => {
      const key = `${sc.id}${ci}`;
      const local = f - ts.startFrame - toFrames(c.from, clock);
      if (local < 0) return;
      if (c.type === 'lower_third') {
        if (f - ts.startFrame > toFrames(c.to, clock)) return;
        const s = spring({frame: local, fps, config: {damping: 14, stiffness: 160}});
        out.push(
          <div key={key} style={{position: 'absolute', left: 56, top: 250, transform: `translateX(${(1 - s) * -520}px)`, fontFamily: 'Inter'}}>
            <div style={{background: c.color ?? '#ffd23d', color: '#1a0f3a', fontWeight: 900, fontSize: 84, padding: '4px 30px', display: 'inline-block', transform: 'skewX(-8deg)'}}>{c.title}</div>
            {c.subtitle && <div><div style={{background: c.bg ?? '#1a0f3a', color: '#fff', fontWeight: 700, fontSize: 38, padding: '8px 26px', marginTop: 6, display: 'inline-block', letterSpacing: 3}}>{c.subtitle}</div></div>}
          </div>,
        );
      } else if (c.type === 'end_card') {
        const s = spring({frame: local, fps, config: {damping: 10, stiffness: 140}});
        const pulse = 1 + Math.sin(local * 0.25) * 0.03;
        out.push(
          <AbsoluteFill key={key} style={{justifyContent: 'center', alignItems: 'center', paddingBottom: 380}}>
            <div style={{transform: `scale(${s * pulse})`, textAlign: 'center', fontFamily: 'Inter'}}>
              <div style={{fontWeight: 900, fontSize: 190, color: '#fff', letterSpacing: 6, WebkitTextStroke: '16px #0b0620', paintOrder: 'stroke fill', textShadow: `0 0 60px ${c.glow ?? '#ff7ad9'}`}}>{c.title}</div>
              {c.subtitle && <div style={{fontWeight: 800, fontSize: 52, color: c.accent ?? '#ffd23d', letterSpacing: 8, marginTop: -6, textShadow: '0 4px 0 #0b0620'}}>{c.subtitle}</div>}
            </div>
          </AbsoluteFill>,
        );
      } else {
        if (f - ts.startFrame > toFrames(c.to, clock)) return;
        const s = spring({frame: local, fps, config: {damping: 12, stiffness: 150}});
        const justify = c.position === 'top' ? 'flex-start' : c.position === 'bottom' ? 'flex-end' : 'center';
        out.push(
          <AbsoluteFill key={key} style={{justifyContent: justify, alignItems: 'center', padding: c.position === 'center' ? '0 0 380px' : c.position === 'top' ? '300px 0 0' : '0 0 640px'}}>
            <div style={{transform: `scale(${0.8 + s * 0.2})`, opacity: s, textAlign: 'center', fontFamily: 'Inter', maxWidth: 940}}>
              <div style={{fontWeight: 900, fontSize: 120, lineHeight: 1.05, color: c.color ?? '#fff', letterSpacing: 4, WebkitTextStroke: '14px #0b0620', paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(8,4,28,0.6)'}}>{c.text}</div>
              {c.subtitle && <div style={{fontWeight: 800, fontSize: 48, color: '#ffd23d', letterSpacing: 8, marginTop: 8, textShadow: '0 4px 0 #0b0620'}}>{c.subtitle}</div>}
            </div>
          </AbsoluteFill>,
        );
      }
    });
  });
  return <>{out}</>;
};

/** Blitz an jedem Szenenübergang (verdeckt den harten Schnitt). Farbe, Stärke und Dauer aus transitions.cutFlash. */
export const StoryCutFlash: React.FC<Props> = ({story, timeline}) => {
  const f = useCurrentFrame();
  const cf = story.transitions.cutFlash;
  if (!cf) return null;
  const clock = {fps: timeline.fps, durationFrames: 0, lines: {}};
  const lead = toFrames(cf.lead, clock), tail = toFrames(cf.tail, clock);
  let o = 0;
  for (const s of timeline.scenes.slice(1)) {
    const b = s.startFrame;
    if (f >= b - lead && f < b) o = Math.max(o, ((f - (b - lead)) / lead) * cf.peak);
    if (f >= b && f < b + tail) o = Math.max(o, cf.peak * (1 - (f - b) / tail) ** 2);
  }
  return o > 0 ? <AbsoluteFill style={{background: cf.color, opacity: o}} /> : null;
};
