// Eigener Remotion-Einstieg nur für die Machbarkeitsstudie – der Generator (src/Root.tsx) bleibt unverändert.
import {Composition, registerRoot} from 'remotion';
import {Study, type StudyProps} from './Study';

const defaults: StudyProps = {who: ['base', 'v2', 'glb'], shot: 'lineup', pose: 'idle', face: 'neutral', t: 1, clip: 'Idle'};
registerRoot(() => (
  <>
    <Composition id="Study" component={Study} defaultProps={defaults} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="StudyWide" component={Study} defaultProps={defaults} durationInFrames={1} fps={30} width={1920} height={1080} />
  </>
));
