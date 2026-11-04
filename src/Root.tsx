import {Composition} from 'remotion';
import {Main} from './Main';
import {RefBild, StoryTest, testTotalFrames} from './StoryTest';
import {TL} from './lib/story';

export const FPS = 30;

export const Root: React.FC = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={TL.totalFrames} fps={FPS} width={1080} height={1920} />
    <Composition id="RefBild" component={RefBild} durationInFrames={testTotalFrames} fps={FPS} width={1080} height={1920} />
    {/* Schritt 2: dieselbe Geschichte, aber aus stories/mondsplitter.yaml über <StoryScene> (nur Bild) */}
    <Composition id="StoryTest" component={StoryTest} durationInFrames={testTotalFrames} fps={FPS} width={1080} height={1920} />
  </>
);
