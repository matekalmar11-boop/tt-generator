import {Composition} from 'remotion';
import {Main} from './Main';
import {TL} from './lib/story';

export const FPS = 30;

export const Root: React.FC = () => (
  <Composition id="Main" component={Main} durationInFrames={TL.totalFrames} fps={FPS} width={1080} height={1920} />
);
