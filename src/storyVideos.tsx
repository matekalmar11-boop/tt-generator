/** Kompositionen aus YAML-Geschichten (generisches Video-System, Schritt 2 / Etappe 3). */
import React from 'react';
import {parse} from 'yaml';
import mondsplitterYaml from '../stories/mondsplitter.yaml';
import stadtYaml from '../stories/demo-stadtgeschichte.yaml';
import legacy from './story/timeline.json';
import {Story} from './story/schema';
import {buildTimeline} from './story/timeline';
import {StoryVideo, missingAudio} from './story/StoryVideo';

/** Mondsplitter aus der YAML: echte TTS-Wort-Timings und Sprechdateien (Vergleich mit der handgeschriebenen Composition "Main"). */
export const mondsplitter = (() => {
  const story = Story.parse(parse(mondsplitterYaml));
  return {story, timeline: buildTimeline(story, legacy as any)};
})();
export const MondsplitterYaml: React.FC = () => <StoryVideo story={mondsplitter.story} timeline={mondsplitter.timeline} />;

/** Neue Kurzgeschichte (person + room + city_street); ohne Sprechdateien → geschätzte Zeiten, stumm. */
export const stadt = (() => {
  const story = Story.parse(parse(stadtYaml));
  const timeline = buildTimeline(story);
  const missing = missingAudio(story, timeline);
  if (missing.length) console.warn(`[stadtgeschichte] ${missing.length} Audiodateien fehlen: ${missing.map((m) => m.file).join(', ')}`);
  return {story, timeline};
})();
export const StadtDemo: React.FC = () => <StoryVideo story={stadt.story} timeline={stadt.timeline} />;
