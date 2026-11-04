/** Einblendungen aus der YAML: Serien-Tag, Titel, Namensschilder, Endkarte, Cut-Flash. Optik wie im Mondsplitter-Film (src/Overlays.tsx). */
import React from 'react';
import {AbsoluteFill, spring} from 'remotion';
import {useStoryFps, useStoryFrame} from './timescale';
import type {StoryData} from './schema';
import {toFrames} from './resolve';
import {sceneClock, type Timeline} from './timeline';

type Props = {story: StoryData; timeline: Timeline};
type MessageCap = Extract<StoryData['scenes'][number]['captions'][number], {type: 'message'}>;

/**
 * Smartphone-Einblendungen: chat (Karte mit Absender/Nachricht), photo (Foto-Rahmen mit Zeitstempel und Blitz), lock (Sperrbildschirm-Uhr).
 * Lesbar auf dem Handy: große Schrift, hoher Kontrast, Platz oberhalb der TikTok-Untertitelzone.
 */
const MessageCard: React.FC<{c: MessageCap; local: number; total: number; fps: number}> = ({c, local, total, fps}) => {
  const inK = spring({frame: local, fps, config: {damping: 13, stiffness: 190}});
  const outK = Math.min(1, Math.max(0, (total - local) / 6));
  const font = 'Inter, "DejaVu Sans", sans-serif';
  if (c.style === 'photo') {
    const flash = c.flash ? Math.max(0, 1 - local / 7) ** 2 : 0;
    return (
      <AbsoluteFill style={{pointerEvents: 'none', opacity: outK}}>
        <AbsoluteFill style={{border: '46px solid #f3f0e9', borderBottomWidth: 150, borderRadius: 38, boxShadow: 'inset 0 0 140px rgba(0,0,0,0.45), 0 0 0 600px #f3f0e9', background: 'linear-gradient(rgba(150,170,255,0.07), rgba(150,170,255,0.07))'}} />
        {c.sender && <div style={{position: 'absolute', top: 78, left: 82, fontFamily: font, fontWeight: 800, fontSize: 34, letterSpacing: 4, color: '#fff', background: 'rgba(15,15,25,0.7)', padding: '8px 22px', borderRadius: 30}}>{c.sender}</div>}
        {c.time && <div style={{position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', fontFamily: '"DejaVu Sans Mono", "Courier New", monospace', fontWeight: 800, fontSize: 74, letterSpacing: 4, color: '#ff9f1a', textShadow: '0 0 18px rgba(255,150,0,0.55)', transform: `scale(${0.92 + 0.08 * inK})`}}>{c.time}</div>}
        {flash > 0 && <AbsoluteFill style={{background: '#fff', opacity: flash}} />}
      </AbsoluteFill>
    );
  }
  if (c.style === 'lock') {
    return (
      <AbsoluteFill style={{pointerEvents: 'none', alignItems: 'center', paddingTop: 250, opacity: outK * inK}}>
        <div style={{textAlign: 'center', fontFamily: font, color: '#fff', textShadow: '0 4px 28px rgba(0,0,0,0.75)', transform: `translateY(${(1 - inK) * -40}px)`}}>
          {c.text && <div style={{fontWeight: 600, fontSize: 56, letterSpacing: 2, marginBottom: -6}}>{c.text}</div>}
          <div style={{fontWeight: 300, fontSize: 250, lineHeight: 1.0, letterSpacing: -6}}>{c.time}</div>
        </div>
      </AbsoluteFill>
    );
  }
  const accent = c.accent ?? '#2f6bff', initial = (c.sender ?? '?').trim().charAt(0).toUpperCase();
  const glow = Math.max(0, 1 - local / 10);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', alignItems: 'center', paddingTop: 262, opacity: outK}}>
      <div style={{width: 940, fontFamily: font, transform: `translateY(${(1 - inK) * -170}px) scale(${0.94 + 0.06 * inK})`, opacity: Math.min(1, inK * 1.4)}}>
        <div style={{background: 'rgba(20,22,32,0.94)', borderRadius: 60, padding: '34px 38px 40px', boxShadow: `0 28px 80px rgba(0,0,0,0.6), 0 0 ${40 + glow * 90}px ${accent}${glow > 0.05 ? '88' : '33'}`, border: '2px solid rgba(255,255,255,0.1)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
            <div style={{width: 92, height: 92, borderRadius: 46, background: `linear-gradient(135deg, ${accent}, #8a5bff)`, color: '#fff', fontWeight: 800, fontSize: 54, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{initial}</div>
            <div style={{flex: 1, color: '#fff', fontWeight: 800, fontSize: 50, letterSpacing: 1}}>{c.sender ?? ''}</div>
            {c.time && <div style={{color: 'rgba(255,255,255,0.55)', fontWeight: 600, fontSize: 36}}>{c.time}</div>}
          </div>
          <div style={{marginTop: 26, background: accent, color: '#fff', fontWeight: 700, fontSize: 64, lineHeight: 1.16, padding: '30px 40px', borderRadius: '46px 46px 46px 10px'}}>{c.text}</div>
          {c.status && <div style={{marginTop: 16, textAlign: 'right', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 32}}>{c.status}</div>}
        </div>
      </div>
    </AbsoluteFill>
  );
};

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
  const f = useStoryFrame();
  const fps = useStoryFps();
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
      } else if (c.type === 'message') {
        const total = toFrames(c.to, clock) - toFrames(c.from, clock);
        if (local > total) return;
        out.push(<MessageCard key={key} c={c} local={local} total={total} fps={fps} />);
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
  const f = useStoryFrame();
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
