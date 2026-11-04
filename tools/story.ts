/**
 * Story-CLI.   npm run story -- <befehl> [datei]
 *   check <datei>            Schema + Querprüfungen, ohne Rendering (Schritt 1, fertig)
 *   voice <datei> [--check] [--force] [--line <id>]   erzeugt vo_<zeilen-id>.wav mit Piper (Cache, Wort-Timings, Manifest) – Schritt 3
 *   manifest                 schreibt src/story/audioManifest.json (vorhandene Audiodateien)
 *   schema                   schreibt stories/story.schema.json (Autovervollständigung im Editor)
 *   compare-legacy <datei>   vergleicht die YAML mit story/script.json + timeline.json (Migrationsnachweis)
 *   preview | render geplant (Schritt 4–5); render wird nie ohne Freigabe laufen
 */
import fs from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {Story} from '../src/story/schema';
import {OBJECTS, RIGS, SETS} from '../src/story/registry';
import {checkStoryFile, type Issue} from '../src/story/validate';
import {runVoice} from './voice';

const root = process.cwd();
const [cmd, arg, ...flags] = process.argv.slice(2);
const json = flags.includes('--json') || arg === '--json';

const PLANNED: Record<string, string> = {
  preview: 'Schritt 4 (schnelle Vorschau 270×480 / 15 FPS)',
  render: 'Schritt 5 (Freigabe-Schranke + Teil-Rendering)',
};

/** schreibt src/story/audioManifest.json (Liste der Dateien in public/audio; der Renderer spielt nur diese ab) */
const manifest = () => {
  const dir = path.join(root, 'public/audio');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.wav')).sort().map((f) => `audio/${f}`);
  fs.writeFileSync(path.join(root, 'src/story/audioManifest.json'), JSON.stringify(files, null, 2) + '\n');
  console.log(`Audio-Manifest geschrieben: ${files.length} Dateien (src/story/audioManifest.json)`);
  return 0;
};

const printIssues = (issues: Issue[]) => {
  const errs = issues.filter((i) => i.level === 'error'), warns = issues.filter((i) => i.level === 'warn');
  const show = (i: Issue) => {
    console.log(`${i.level === 'error' ? '✖ FEHLER' : '⚠ Hinweis'}  ${i.path}${i.line ? `  (Zeile ${i.line})` : ''}`);
    console.log(`    ${i.message}`);
    if (i.hint) console.log(`    → ${i.hint}`);
  };
  errs.forEach(show);
  warns.forEach(show);
  return {errs: errs.length, warns: warns.length};
};

const check = (file: string) => {
  const {loaded, issues, timing} = checkStoryFile(file, root);
  if (json) { console.log(JSON.stringify({file, ok: !issues.some((i) => i.level === 'error'), issues}, null, 2)); return issues.some((i) => i.level === 'error') ? 1 : 0; }
  console.log(`Prüfe ${file} …\n`);
  const {errs, warns} = printIssues(issues);
  const s = loaded.story;
  if (s && timing) {
    const rigs = new Set(Object.values(s.cast).map((c) => c.rig));
    const sets = new Set(s.scenes.map((x) => x.set.type));
    const lines = s.scenes.reduce((n, sc) => n + sc.lines.length, 0);
    const words = s.scenes.reduce((n, sc) => n + sc.lines.reduce((m, l) => m + l.text.split(/\s+/).length, 0), 0);
    console.log(`${errs || warns ? '\n' : ''}── Zusammenfassung: „${s.meta.title}“ ──`);
    console.log(`Format      ${s.format.width}×${s.format.height} @ ${s.format.fps} FPS`);
    console.log(`Figuren     ${Object.entries(s.cast).map(([id, c]) => `${id}(${c.rig}${RIGS[c.rig]?.status === 'planned' ? ', geplant' : ''})`).join(', ')}`);
    console.log(`Stimmen     ${Object.keys(s.voices).join(', ')}`);
    console.log(`Kulissen    ${[...sets].map((t) => `${t}${SETS[t]?.status === 'planned' ? ' (geplant)' : ''}`).join(', ')}`);
    console.log(`Objekte     ${[...new Set(s.scenes.flatMap((sc) => sc.objects.map((o) => o.type)))].map((t) => `${t}${OBJECTS[t]?.status === 'planned' ? ' (geplant)' : ''}`).join(', ') || '–'}`);
    console.log(`Szenen      ${s.scenes.length}  ·  Sprechzeilen ${lines}  ·  Wörter ${words}`);
    const basis = timing.estLines === 0 ? 'aus vorhandener TTS-Timeline' : timing.realLines === 0 ? 'geschätzt (≈18 Zeichen/s)' : `${timing.realLines} Zeilen aus Timeline, ${timing.estLines} geschätzt`;
    console.log(`Länge       ≈ ${timing.total.toFixed(1)} s (${basis})${s.meta.targetDuration ? `  ·  Soll ${s.meta.targetDuration.min}–${s.meta.targetDuration.max} s` : ''}`);
    console.log('\n  Szene         Kulisse     Zeit    Figuren  Kamera  Zeilen  Töne');
    for (const sc of s.scenes) {
      console.log(`  ${sc.id.padEnd(13)} ${sc.set.type.padEnd(11)} ${timing.scenes[sc.id].duration.toFixed(1).padStart(5)}s  ${String(sc.actors.length).padStart(5)}    ${String(sc.camera.keys.length + sc.camera.orbits.length + sc.camera.shots.length).padStart(4)}   ${String(sc.lines.length).padStart(4)}   ${String(sc.sfx.length).padStart(4)}`);
    }
  }
  console.log(`\n${errs ? '✖' : '✔'} ${errs} Fehler, ${warns} Hinweise${errs ? ' – bitte beheben, bevor es weitergeht.' : ' – Konfiguration ist gültig. Es wurde nichts gerendert.'}`);
  return errs ? 1 : 0;
};

const compareLegacy = (file: string) => {
  const {loaded} = checkStoryFile(file, root);
  const s = loaded.story;
  if (!s) { console.log('YAML ist ungültig – erst `check` beheben.'); return 1; }
  const legacy = JSON.parse(fs.readFileSync(path.join(root, 'story/script.json'), 'utf8'));
  const tl = JSON.parse(fs.readFileSync(path.join(root, 'src/story/timeline.json'), 'utf8'));
  const diffs: string[] = [];
  const voiceMap: Record<string, string> = {};
  for (const c of Object.values(s.cast)) if (c.voice) voiceMap[c.voice] = c.voice;
  if (legacy.scenes.length !== s.scenes.length) diffs.push(`Szenenzahl: script.json ${legacy.scenes.length} vs YAML ${s.scenes.length}`);
  legacy.scenes.forEach((ls: any, i: number) => {
    const ys = s.scenes[i];
    if (!ys) return;
    if (ls.id !== ys.id) diffs.push(`Szene ${i}: id ${ls.id} vs ${ys.id}`);
    if (ls.pre !== ys.timing.pre) diffs.push(`${ls.id}: pre ${ls.pre} vs ${ys.timing.pre}`);
    if (ls.post !== ys.timing.post) diffs.push(`${ls.id}: post ${ls.post} vs ${ys.timing.post}`);
    if (ls.lines.length !== ys.lines.length) diffs.push(`${ls.id}: Zeilenzahl ${ls.lines.length} vs ${ys.lines.length}`);
    ls.lines.forEach((ll: any, j: number) => {
      const yl = ys.lines[j]; if (!yl) return;
      if (ll.id !== yl.id) diffs.push(`${ls.id}[${j}]: id ${ll.id} vs ${yl.id}`);
      if (ll.text !== yl.text) diffs.push(`${ll.id}: Text weicht ab\n      script.json: ${ll.text}\n      YAML:        ${yl.text}`);
      const yv = s.cast[yl.who]?.voice;
      if (ll.voice !== yv) diffs.push(`${ll.id}: Stimme ${ll.voice} vs ${yv}`);
    });
    const tsc = tl.scenes[i];
    if (tsc && tsc.id !== ys.id) diffs.push(`timeline.json Szene ${i}: ${tsc.id} vs ${ys.id}`);
  });
  if (s.timing.lineGap !== 0.28) diffs.push(`lineGap ${s.timing.lineGap} (synth.py nutzt 0.28)`);
  if (s.format.fps !== tl.fps) diffs.push(`fps ${s.format.fps} vs timeline ${tl.fps}`);
  const yamlLines = s.scenes.reduce((n, sc) => n + sc.lines.length, 0);
  console.log(`Vergleich YAML ↔ story/script.json + timeline.json: ${s.scenes.length} Szenen, ${yamlLines} Zeilen`);
  if (diffs.length) { diffs.forEach((d) => console.log('  ✖ ' + d)); return 1; }
  console.log('  ✔ Szenen-IDs, Reihenfolge, Zeilen-IDs, Texte, Sprecher/Stimmen, pre/post, lineGap und FPS stimmen exakt überein.');
  return 0;
};

const writeSchema = () => {
  const out = path.join(root, 'stories/story.schema.json');
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, JSON.stringify(z.toJSONSchema(Story, {io: 'input', unrepresentable: 'any'}), null, 1));
  console.log(`JSON-Schema geschrieben: ${path.relative(root, out)} (für Editor-Autovervollständigung)`);
  return 0;
};

const usage = () => {
  console.log('Verwendung: npm run story -- <befehl> [datei]\n  check <datei>            Konfiguration prüfen (ohne Rendering)\n  schema                   JSON-Schema für den Editor schreiben\n  compare-legacy <datei>   Migration gegen story/script.json prüfen\n  manifest                 Audio-Manifest aus public/audio schreiben\n  voice <datei> [--check] [--force] [--line <id>]  Sprache mit Piper erzeugen (Cache, Wort-Timings)\n  preview | render         geplant (Schritt 4–5)');
  return 0;
};

let code = 0;
if (cmd === 'check' && arg) code = check(arg);
else if (cmd === 'compare-legacy' && arg) code = compareLegacy(arg);
else if (cmd === 'schema') code = writeSchema();
else if (cmd === 'manifest') code = manifest();
else if (cmd === 'voice' && arg) code = runVoice(arg, {check: flags.includes('--check'), force: flags.includes('--force'), line: flags.includes('--line') ? flags[flags.indexOf('--line') + 1] : undefined}, () => manifest());
else if (cmd && PLANNED[cmd]) { console.log(`„${cmd}“ ist noch nicht umgesetzt – geplant für ${PLANNED[cmd]}. Es wurde nichts ausgeführt.`); code = 2; }
else code = usage();
process.exit(code);
