/** Kleiner Funktionstest der Auflösung (ohne Rendering):  npm run test:story */
import assert from 'node:assert/strict';
import {buildCameraKeys, sampleCamera, sampleHard, sampleName, sampleNum, toFrames, locate, StoryError, type Clock} from '../src/story/resolve';
import {Story} from '../src/story/schema';
import {parse} from 'yaml';
import fs from 'node:fs';

const c: Clock = {fps: 30, durationFrames: 100, lines: {l1: {start: 10, end: 60, words: [{start: 10, end: 30}, {start: 30, end: 60}]}}};
const eq = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

// Zeiten & Anker
eq(toFrames(1.5, c), 45); eq(toFrames('40f', c), 40); eq(toFrames('l1.start+22f', c), 32); eq(toFrames('l1.end-2f', c), 58);
eq(toFrames('l1.word2+0.1s', c), 33); eq(toFrames('scene.end-2f', c), 98);
assert.throws(() => toFrames('l9.start', c), StoryError); assert.throws(() => toFrames('l1.word3', c), StoryError);

// Pose mit mix (Zielstärke) + Halten nach dem letzten Key
const pk = [{f: 0, name: 'sneak'}, {f: 10, name: 'sneak'}, {f: 24, name: 'shock', mix: 0.45, ease: 'lin'}];
assert.equal(sampleName(pk, 5), 'sneak');
assert.deepEqual(sampleName(pk, 17), ['sneak', 'shock', 0.225]);
assert.deepEqual(sampleName(pk, 99), ['sneak', 'shock', 0.45]);
// harter Face-Wechsel
const fk = [{f: 0, name: 'neutral'}, {f: 50, name: 'worry', ease: 'cut'}];
assert.equal(sampleName(fk, 49), 'neutral'); assert.equal(sampleName(fk, 50), 'worry');
assert.equal(sampleHard([{f: 0, name: 'lantern'}, {f: 7, name: 'sword'}], 6, 'none'), 'lantern');
eq(sampleNum([{f: 0, v: 1}, {f: 10, v: 0.5, ease: 'lin'}], 5, 0), 0.75); eq(sampleNum(undefined, 5, 3), 3);
assert.deepEqual(locate([{f: 0}], 50, 'lin'), {a: 0, b: 0, k: 0});

// Mondsplitter-YAML: Kamera aller Szenen auflösbar, Keys nach Zeit sortiert, Cuts hart
const story = Story.parse(parse(fs.readFileSync('stories/mondsplitter.yaml', 'utf8')));
const tl = JSON.parse(fs.readFileSync('src/story/timeline.json', 'utf8'));
for (const sc of story.scenes) {
  const ts = tl.scenes.find((s: any) => s.id === sc.id);
  const clock: Clock = {fps: 30, durationFrames: ts.durationFrames, lines: Object.fromEntries(ts.lines.map((l: any) => [l.id, {
    start: l.startFrame - ts.startFrame, end: l.startFrame - ts.startFrame + l.durationFrames, words: l.words.map((w: any) => ({start: w.start - ts.startFrame, end: w.end - ts.startFrame}))}]))};
  const keys = buildCameraKeys(sc.camera, clock);
  for (let i = 1; i < keys.length; i++) assert.ok(keys[i].f >= keys[i - 1].f, `${sc.id}: Kamera-Keys nicht sortiert`);
  const env = {actorPos: () => [0, 0, 0] as [number, number, number], actorHead: () => [0, 0, 0] as [number, number, number], objectPos: () => [0, 0, 0] as [number, number, number]};
  for (const f of [0, Math.floor(clock.durationFrames / 2), clock.durationFrames - 1]) {
    const s = sampleCamera(keys, f, env);
    assert.ok([...s.pos, ...s.look, s.fov, s.roll].every(Number.isFinite), `${sc.id}@${f}: NaN in Kamera`);
  }
  console.log(`✔ ${sc.id.padEnd(7)} ${keys.length} Kamera-Keys, ${sc.actors.length} Figuren, ${sc.objects.length} Objekte`);
}
console.log('✔ alle Funktionstests bestanden');
