import {Composition} from 'remotion';
import {TikTokTest} from './TikTokTest';

export const FPS = 30;
export const DURATION = 10 * FPS; // 300 Frames = 10 s

export const Root: React.FC = () => (
  <Composition
    id="TikTokTest"
    component={TikTokTest}
    durationInFrames={DURATION}
    fps={FPS}
    width={1080}
    height={1920}
  />
);
