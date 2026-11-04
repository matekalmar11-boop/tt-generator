// Eigener Remotion-Einstieg nur für die Machbarkeitsstudie – der Generator (src/Root.tsx) bleibt unverändert.
import React from 'react';
import {Composition, registerRoot, useCurrentFrame} from 'remotion';
import {Study, type StudyProps} from './Study';

const Motion: React.FC<StudyProps> = (p) => <Study {...p} t={useCurrentFrame() / 30} />;
const defaults: StudyProps = {who: ['base', 'v2', 'glb'], shot: 'lineup', pose: 'idle', face: 'neutral', t: 1, clip: 'Idle'};
registerRoot(() => (
  <>
    <Composition id="Study" component={Study} defaultProps={defaults} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="StudyWide" component={Study} defaultProps={defaults} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="StudyMotion" component={Motion} defaultProps={defaults} durationInFrames={60} fps={30} width={1080} height={1920} />
  </>
));
