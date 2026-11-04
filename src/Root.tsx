import {Composition} from 'remotion';
import {Main} from './Main';
import {RefBild, StoryTest, testTotalFrames} from './StoryTest';
import {Etappe2Test, demoTotalFrames} from './Etappe2Test';
import {MondsplitterYaml, StadtDemo, mondsplitter, stadt} from './storyVideos';
import {TL} from './lib/story';

export const FPS = 30;

export const Root: React.FC = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={TL.totalFrames} fps={FPS} width={1080} height={1920} />
    <Composition id="RefBild" component={RefBild} durationInFrames={testTotalFrames} fps={FPS} width={1080} height={1920} />
    {/* Schritt 2: dieselbe Geschichte, aber aus stories/mondsplitter.yaml über <StoryScene> (nur Bild) */}
    <Composition id="StoryTest" component={StoryTest} durationInFrames={testTotalFrames} fps={FPS} width={1080} height={1920} />
    {/* Etappe 2: stummer Funktionstest (Presets, person, room, empty_stage) */}
    <Composition id="Etappe2Test" component={Etappe2Test} durationInFrames={demoTotalFrames} fps={FPS} width={1080} height={1920} />
    {/* Etappe 3: komplette YAML-Videos (Untertitel, Einblendungen, Audio) */}
    <Composition id="MondsplitterYaml" component={MondsplitterYaml} durationInFrames={mondsplitter.timeline.totalFrames} fps={FPS} width={1080} height={1920} />
    <Composition id="StadtDemo" component={StadtDemo} durationInFrames={stadt.timeline.totalFrames} fps={FPS} width={1080} height={1920} />
  </>
);
