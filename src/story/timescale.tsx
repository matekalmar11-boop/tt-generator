/**
 * Zeitmaßstab für Vorschau-Renderings: Die Geschichte ist in Frames der Autoren-FPS (meist 30) beschrieben. Wird mit weniger FPS
 * gerendert (z. B. 15), liefert useStoryFrame() trotzdem den Frame in Autoren-FPS (Bildnummer · scale + offset) und useStoryFps()
 * die Autoren-FPS – dadurch laufen Animationen, Federn, Wort-Timings und Untertitel exakt gleich schnell, nur mit weniger Bildern.
 * Ohne Provider (Mondsplitter-Film `Main`, finale 30 FPS) sind scale = 1 und offset = 0 → identisches Verhalten wie zuvor.
 */
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';

type Ctx = {scale: number; fps: number; offset: number};
const TimeCtx = React.createContext<Ctx | null>(null);

export const TimeScale: React.FC<Ctx & {children: React.ReactNode}> = ({scale, fps, offset, children}) => (
  <TimeCtx.Provider value={{scale, fps, offset}}>{children}</TimeCtx.Provider>
);
export const useTimeScale = () => React.useContext(TimeCtx)?.scale ?? 1;
export const useStoryFrame = (): number => {
  const f = useCurrentFrame();
  const c = React.useContext(TimeCtx);
  return c ? f * c.scale + c.offset : f;
};
export const useStoryFps = (): number => {
  const {fps} = useVideoConfig();
  const c = React.useContext(TimeCtx);
  return c ? c.fps : fps;
};
