/** Kleiner Funktionstest der Auflösung (ohne Rendering):  npm run test:story */
import assert from 'node:assert/strict';
import {buildCamera, buildCameraKeys, sampleCamera, sampleHard, sampleName, sampleNum, toFrames, locate, StoryError, type Clock} from '../src/story/resolve';
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
  const env = {actorPos: () => [0, 0, 0] as [number, number, number], actorYaw: () => 0, actorHead: () => [0, 0, 0] as [number, number, number], objectPos: () => [0, 0, 0] as [number, number, number]};
  for (const f of [0, Math.floor(clock.durationFrames / 2), clock.durationFrames - 1]) {
    const s = sampleCamera(keys, f, env);
    assert.ok([...s.pos, ...s.look, s.fov, s.roll].every(Number.isFinite), `${sc.id}@${f}: NaN in Kamera`);
  }
  console.log(`✔ ${sc.id.padEnd(7)} ${keys.length} Kamera-Keys, ${sc.actors.length} Figuren, ${sc.objects.length} Objekte`);
}

// ── Etappe 2: Presets, Kreisfahrt mit Verweisen, lokale Figurenachsen ──
import {resolveRef} from '../src/story/refs';
import {checkStoryFile} from '../src/story/validate';
const demo = Story.parse(parse(fs.readFileSync('stories/demo-etappe2.yaml', 'utf8')));
const dc: Clock = {fps: 30, durationFrames: 120, lines: {}};
const envAt = (pos: [number, number, number], yaw = 0) => ({actorPos: () => pos, actorYaw: () => yaw, actorHead: () => pos, objectPos: () => pos});
// lokale Offsets: Figur schaut nach +x (yaw = pi/2): "vorn" (z+) ist Welt-x+
const loc = resolveRef({local: 'a', off: [0, 1, 2]}, envAt([10, 0, 0], Math.PI / 2), 0);
eq(loc[0], 12); eq(loc[1], 1); eq(loc[2], 0);
for (const sc of demo.scenes) {
  const {keys, shake} = buildCamera(sc.camera, dc);
  for (let i = 1; i < keys.length; i++) assert.ok(keys[i].f >= keys[i - 1].f);
  for (const f of [0, 60, 119]) { const cs = sampleCamera(keys, f, envAt([1, 0, 2])); assert.ok([...cs.pos, ...cs.look, cs.fov].every(Number.isFinite), `${sc.id}@${f}`); }
  if (sc.id === 'schwindel') assert.ok(shake.length === 1, 'handheld erzeugt Wackeln');
}
// orbit mit {rel}: Kamera folgt der Figur (gleicher Abstand, wenn die Figur wandert)
const kreis = demo.scenes.find((x) => x.id === 'kreis')!;
const kk = buildCamera(kreis.camera, dc).keys;
const c1 = sampleCamera(kk, 40, envAt([0, 0, 0])), c2 = sampleCamera(kk, 40, envAt([5, 0, 0]));
eq(c2.pos[0] - c1.pos[0], 5); eq(c2.look[0] - c1.look[0], 5);
// dolly_zoom: Bildgröße d·tan(fov/2) bleibt konstant
const dz = buildCamera(demo.scenes.find((x) => x.id === 'schwindel')!.camera, {...dc, durationFrames: 120}).keys.filter((k) => k.f < 90);
const sizes = dz.map((k) => { const d = Math.hypot(...(resolveRef(k.pos, envAt([0, 0, 0]), 0) as number[]).map((v, i) => v - [0, 1.9, 0][i])); return d * Math.tan((k.fov * Math.PI) / 360); });
sizes.forEach((v) => eq(v, sizes[0]));
// Prüfer: Fehlerfälle
const bad = (yaml: string) => { fs.writeFileSync('/tmp/_t.yaml', yaml); return checkStoryFile('/tmp/_t.yaml').issues.filter((i) => i.level === 'error').map((i) => i.path + ': ' + i.message); };
const base = fs.readFileSync('stories/demo-etappe2.yaml', 'utf8');
assert.ok(bad(base.replace('hairStyle: long', 'hairStyle: lang')).some((m) => m.includes('cast.anna.look.hairStyle')), 'ungültiger look-Wert');
assert.ok(bad(base.replace('shirt: "#d9534f"', 'shirt: rot')).some((m) => m.includes('cast.anna.look.shirt')), 'ungültige Farbe');
assert.ok(bad(base.replace('preset: whip_to', 'preset: whip')).length > 0, 'unbekanntes Preset');
assert.ok(bad(base.replace(', look_from: {rel: a, off: [0, 1.9, 0]}', '')).some((m) => m.includes('look_from')), 'Pflichtfeld fehlt');
assert.ok(bad(base.replace('subject: a, target: {rel: k}', 'subject: zz, target: {rel: k}')).some((m) => m.includes('subject')), 'unbekannte Figur');
console.log('✔ Etappe 2: Presets, Kreisfahrt mit Verweisen, lokale Achsen, Dolly-Zoom, Prüfer-Fehlerfälle');

// ── Etappe 3: Zeitleiste, Untertitel-Häppchen, Audio-Manifest ──
import {buildTimeline} from '../src/story/timeline';
import {buildChunksFrom, CHUNKS} from '../src/Subtitles';
import {missingAudio} from '../src/story/StoryVideo';
const mond = buildTimeline(story, tl);
assert.equal(mond.totalFrames, tl.totalFrames, 'Mondsplitter-Länge aus YAML = alte Timeline');
assert.ok(mond.scenes.every((sc, i) => sc.startFrame === tl.scenes[i].startFrame && sc.durationFrames === tl.scenes[i].durationFrames && sc.lines.every((l) => l.real)));
const yamlChunks = buildChunksFrom(mond.scenes.flatMap((sc) => sc.lines).map((l) => ({voice: l.voice ?? '', words: l.words})), story.subtitles.maxWords, story.subtitles.maxChars);
assert.deepEqual(yamlChunks.map((c) => [c.start, c.end, c.words.map((w) => w.w).join(' ')]), CHUNKS.map((c) => [c.start, c.end, c.words.map((w) => w.w).join(' ')]), 'Untertitel aus YAML = bisherige Untertitel');
assert.deepEqual(missingAudio(story, mond), [], 'Mondsplitter: keine fehlenden Audiodateien');
import {planVoice, toUnits, lineState, readVoices} from './voice';
import crypto from 'node:crypto';
const city = Story.parse(parse(fs.readFileSync('stories/demo-stadtgeschichte.yaml', 'utf8')));
const ctl = buildTimeline(city);
assert.ok(ctl.scenes.every((sc) => sc.lines.every((l) => !l.real && l.words.length > 0 && l.startFrame >= sc.startFrame && l.startFrame + l.durationFrames <= sc.startFrame + sc.durationFrames)), 'geschätzte Zeiten liegen in der Szene');
assert.deepEqual(missingAudio(city, ctl).map((m) => m.file), [], 'Stadtgeschichte: Sprechdateien, Effekte und Musik vorhanden');
// die Prüfung meldet fehlende Sprechdateien weiterhin (Datei einer anderen Geschichte simulieren)
const ghost = Story.parse(parse(fs.readFileSync('stories/demo-stadtgeschichte.yaml', 'utf8').replace('id: s05', 'id: s99')));
assert.deepEqual(missingAudio(ghost, buildTimeline(ghost)).map((m) => m.file), ['audio/vo_s99.wav'], 'fehlende Sprechdatei wird gemeldet');
const manifestNow = fs.readdirSync('public/audio').filter((f) => f.endsWith('.wav')).sort().map((f) => `audio/${f}`);
assert.deepEqual(JSON.parse(fs.readFileSync('src/story/audioManifest.json', 'utf8')), manifestNow, 'audioManifest.json veraltet – "npm run story -- manifest" ausführen');

// ── Schritt 3: Sprachplanung, Cache-Entscheidung, echte Timings (ohne Piper aufzurufen) ──
assert.deepEqual(toUnits('Die KI lernt, schnell.', {KI: 'Ka I'}).map((u) => [u.display, u.spoken]), [['Die', 'Die'], ['KI', 'Ka I'], ['lernt,', 'lernt,'], ['schnell.', 'schnell.']], 'Aussprachehilfe ändert nur die gesprochene Form');
const plan = planVoice(city);
assert.equal(plan.length, 5); assert.deepEqual(plan.map((p) => p.voiceId), ['erzaehler', 'erzaehler', 'opa', 'erzaehler', 'erzaehler']);
const h0 = plan[0].hash;
const city2 = Story.parse(parse(fs.readFileSync('stories/demo-stadtgeschichte.yaml', 'utf8').replace('Mira hat', 'Mira hatte')));
assert.notEqual(planVoice(city2)[0].hash, h0, 'Textänderung → neue Prüfsumme'); assert.equal(planVoice(city2)[1].hash, plan[1].hash, 'andere Zeilen bleiben gleich');
const city3 = Story.parse(parse(fs.readFileSync('stories/demo-stadtgeschichte.yaml', 'utf8').replace('effect: {pitch: 0.92}', 'effect: {pitch: 0.92}\n    loudness: -14')));
assert.deepEqual(planVoice(city3).map((p, i) => p.hash === plan[i].hash), [true, true, false, true, true], 'Profiländerung betrifft nur Zeilen dieser Stimme');
const stored = readVoices('stadtgeschichte')!;
assert.ok(plan.every((p) => lineState(p, stored) === 'aktuell'), 'erzeugte Sprache ist aktuell (Prüfsumme + Datei)');
assert.ok(plan.every((p) => stored.lines[p.id].timingMode === 'aligned'), 'Wort-Timings stammen aus den Piper-Phonemausrichtungen');
for (const p of plan) { // Datei ↔ Eintrag ↔ Manifest
  const wav = fs.readFileSync(`public/audio/vo_${p.id}.wav`);
  assert.equal(crypto.createHash('sha256').update(wav).digest('hex'), stored.lines[p.id].wavSha);
  assert.ok(JSON.parse(fs.readFileSync('src/story/audioManifest.json', 'utf8')).includes(`audio/vo_${p.id}.wav`), `${p.id} im Manifest`);
  const w = stored.lines[p.id].words; assert.ok(w.every((x, i) => x.start >= 0 && x.end <= stored.lines[p.id].seconds + 1e-6 && x.end >= x.start && (i === 0 || w[i - 1].end <= x.start + 1e-6)), `${p.id}: Wortzeiten geordnet und innerhalb der Datei`);
}
const vtl = buildTimeline(city, undefined, stored as any);
assert.ok(vtl.scenes.every((sc) => sc.lines.every((l) => l.real && l.durationFrames === Math.ceil(stored.lines[l.id].seconds * 30))), 'Zeitleiste nutzt die echte Dauer');
console.log('✔ Schritt 3: Aussprachehilfe, Prüfsummen/Cache-Entscheidung, Piper-Timings, Datei↔Eintrag↔Manifest, Zeitleiste aus echter Dauer');

// ── Schritt 4: Zeitmaßstab, Szenen-Cache-Schlüssel ──
import {compFrames, sceneFrom} from '../src/story/StoryVideo';
import {loadStoryProps, sceneKey} from './preview';
const stl = buildTimeline(city, undefined, stored as any);
for (const sc of stl.scenes) {
  const from = sceneFrom(sc.startFrame, 2), off = from * 2 - sc.startFrame;
  assert.ok(off === 0 || off === 1, `${sc.id}: Zeitversatz ${off} (aufgerundet, nie negativ)`);
}
assert.equal(compFrames(stl, 1), stl.totalFrames); assert.equal(compFrames(stl, 2), Math.ceil(stl.totalFrames / 2));
const lp = loadStoryProps('stories/demo-stadtgeschichte.yaml');
const cfgA = {width: 360, renderFps: 15, crf: 28, jq: 70};
const k0 = lp.story.scenes.map((_, i) => sceneKey(lp.story, lp.timeline, i, cfgA, 'code1'));
assert.deepEqual(k0, lp.story.scenes.map((_, i) => sceneKey(lp.story, lp.timeline, i, cfgA, 'code1')), 'Schlüssel stabil');
const edited = JSON.parse(JSON.stringify(lp.story)); edited.scenes[2].captions[0].subtitle = 'ANDERS';
const k1 = edited.scenes.map((_: unknown, i: number) => sceneKey(edited, lp.timeline, i, cfgA, 'code1'));
assert.deepEqual(k1.map((k: string, i: number) => k === k0[i]), [true, true, false], 'Änderung in Szene 3 betrifft nur Szene 3');
assert.notEqual(sceneKey(lp.story, lp.timeline, 0, {...cfgA, width: 270}, 'code1'), k0[0], 'andere Auflösung → anderer Schlüssel');
assert.notEqual(sceneKey(lp.story, lp.timeline, 0, cfgA, 'code2'), k0[0], 'anderer Code → anderer Schlüssel');
console.log('✔ Schritt 4: Zeitmaßstab (Versatz ≥ 0), Szenen-Cache-Schlüssel (stabil, nur betroffene Szene ändert sich)');

// ── Schritt 5: Freigabe-Schranke, Inhaltsbindung, Preflight ──
import os from 'node:os';
import {approvalStatus, audioFiles, contentParts, preflight, readApproval, runApprove, runExport} from './export';
const tmp = fs.mkdtempSync(`${os.tmpdir()}/appr-`);
for (const d of ['src', 'stories', 'tts']) fs.symlinkSync(`${process.cwd()}/${d}`, `${tmp}/${d}`);
fs.mkdirSync(`${tmp}/public/audio`, {recursive: true});
const sf = 'stories/demo-stadtgeschichte.yaml';
const ex0 = (await import('./export'));
const pre0 = preflight(sf, process.cwd());
assert.ok(pre0.ok, `Stadtgeschichte exportierbar: ${pre0.problems.join(' | ')}`);
for (const a of audioFiles(pre0.story!, pre0.timeline!)) fs.copyFileSync(`public/${a.file}`, `${tmp}/public/${a.file}`);
const log = console.log; console.log = () => {};   // Ausgaben der Befehle unterdrücken
try {
  assert.equal(approvalStatus(pre0.story!, pre0.timeline!, tmp, 'c').state, 'fehlt');
  assert.equal(runApprove(sf, {}, tmp), 0); assert.equal(readApproval('stadtgeschichte', tmp), undefined, 'ohne --confirm wird nichts geschrieben');
  assert.equal(runApprove(sf, {confirm: 'deadbeef'}, tmp), 1); assert.equal(readApproval('stadtgeschichte', tmp), undefined, 'falsche Bestätigung schreibt nichts');
  const short = ex0.contentHash(contentParts(pre0.story!, pre0.timeline!, tmp)).slice(0, 8);
  assert.equal(runApprove(sf, {confirm: short, by: 'test'}, tmp), 0);
  assert.equal(approvalStatus(pre0.story!, pre0.timeline!, tmp, readApproval('stadtgeschichte', tmp)!.codeHash).state, 'gültig');
  // Inhalt ändern → ungültig
  const changed = JSON.parse(JSON.stringify(pre0.story)); changed.scenes[0].camera.shots[0].fov = 41;
  const stc = approvalStatus(changed, pre0.timeline!, tmp, 'c'); assert.equal(stc.state, 'ungültig'); assert.ok(stc.reasons[0].includes('Geschichte'));
  const tlChanged = JSON.parse(JSON.stringify(pre0.timeline)); tlChanged.scenes[0].lines[0].words[0].end += 1;
  assert.ok(approvalStatus(pre0.story!, tlChanged, tmp, 'c').reasons.some((r) => r.includes('Zeitleiste')), 'geänderte Wort-Timings');
  fs.appendFileSync(`${tmp}/public/audio/vo_s01.wav`, Buffer.from([0]));
  assert.ok(approvalStatus(pre0.story!, pre0.timeline!, tmp, 'c').reasons.some((r) => r.includes('Audiodateien')), 'ersetzte Sprachdatei macht Freigabe ungültig');
  assert.notEqual(await runExport(sf, {}, tmp), 0, 'veraltete/ersetzte Sprache blockiert den Export (Preflight)');
  fs.copyFileSync('public/audio/vo_s01.wav', `${tmp}/public/audio/vo_s01.wav`);
  // Schranke: ohne gültige Freigabe kein Export (kehrt zurück, bevor Bundle/Browser gestartet werden)
  const ap = readApproval('stadtgeschichte', tmp)!; ap.parts.story = 'x'.repeat(64); fs.writeFileSync(`${tmp}/approvals/stadtgeschichte.json`, JSON.stringify(ap));
  assert.equal(await runExport(sf, {}, tmp), 4, 'Export mit ungültiger Freigabe wird verweigert');
  fs.rmSync(`${tmp}/approvals`, {recursive: true}); assert.equal(await runExport(sf, {}, tmp), 4, 'Export ohne Freigabe wird verweigert');
  // Preflight-Fehler
  assert.ok(!preflight('stories/beispiel-kuchenkrimi.yaml', process.cwd()).ok, 'fehlende Sprechdateien blockieren');
  assert.ok(preflight('stories/gibtsnicht.yaml', process.cwd()).problems[0].includes('nicht gefunden'));
  assert.ok(!preflight('stories/_demo-fehler-struktur.yaml', process.cwd()).ok);
} finally { console.log = log; fs.rmSync(tmp, {recursive: true, force: true}); }
console.log('✔ Schritt 5: Freigabe an Inhalt gebunden (YAML, Timings, Audio), falsche/fehlende Bestätigung schreibt nichts, Export ohne gültige Freigabe verweigert, Preflight-Fehler');
console.log('✔ Etappe 3: Zeitleiste = alte TTS-Timeline, Untertitel identisch, fehlende Audiodateien gemeldet, Manifest aktuell');
console.log('✔ alle Funktionstests bestanden');
