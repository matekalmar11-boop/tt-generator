/**
 * Kameraprüfung ohne Rendern: Wird das Gesicht jeder Figur gesehen?  npm run story -- shots <datei>
 *  - Blickwinkel: Winkel zwischen Blickrichtung der Figur (yaw) und Richtung zur Kamera (Gesicht frontal = 0°, Profil = 90°). Kopfdrehung durch Blickführung (bis ≈ 35°) kommt hinzu.
 *  - Bildausschnitt: liegt der Kopf im Bild (mit Rand für Untertitel/Einblendungen: 8–92 % Breite, 10–80 % Höhe)?
 */
import {Story} from '../src/story/schema';
import {loadStoryProps} from './preview';
import {makeEnv} from '../src/story/StoryScene';
import {angle, buildCamera, sampleCamera} from '../src/story/resolve';
import {sceneClock} from '../src/story/timeline';

export const runShots = (file: string): number => {
  const {story, timeline: tl} = loadStoryProps(file);
  void Story;
  const aspect = story.format.width / story.format.height;
  let bad = 0;
  console.log(`Kameraprüfung „${story.meta.title}“ (Gesicht: ≤ 60° gut, 60–75° grenzwertig, > 75° Profil)\n`);
  console.log('  Szene        Figur     max. Winkel   Frames > 60°   Kopf außerhalb des Bildausschnitts');
  story.scenes.forEach((sc, i) => {
    const clock = sceneClock(tl.scenes[i], tl.fps), env = makeEnv(story, sc, clock, tl.fps), cam = buildCamera(sc.camera, clock);
    const N = tl.scenes[i].durationFrames;
    for (const a of sc.actors) {
      const rig = story.cast[a.cast]?.rig;
      if (rig !== 'person' && rig !== 'person2' && rig !== 'finn') continue;
      let max = 0, over = 0, out = 0, n = 0;
      for (let f = 0; f < N; f += 3) {
        const c = sampleCamera(cam.keys, f, env), p = env.actorPos(a.id, f), yaw = angle(a.yaw);
        const rel = Math.atan2(c.pos[0] - p[0], c.pos[2] - p[2]) - yaw, deg = Math.abs((Math.atan2(Math.sin(rel), Math.cos(rel)) * 180) / Math.PI);
        max = Math.max(max, deg); if (deg > 60) over++;
        // Kopf (y ≈ 3.1 · scale) in Kamerakoordinaten
        const head: [number, number, number] = [p[0], p[1] + 3.1 * a.scale, p[2]];
        const fw = sub(c.look, c.pos), r = norm(cross(fw, [0, 1, 0])), u = cross(r, fw), d = sub(head, c.pos);
        const z = dot(d, norm(fw)), th = Math.tan((c.fov * Math.PI) / 360);
        const x = dot(d, r) / (z * th * aspect) / 1, y = dot(d, norm(u)) / (z * th);
        const px = 0.5 + x / 2, py = 0.5 - y / 2;
        if (z <= 0.2 || px < 0.08 || px > 0.92 || py < 0.1 || py > 0.8) out++;
        n++;
      }
      const flag = max > 75 || out / n > 0.2 ? ' ✖' : max > 60 || out > 0 ? ' ⚠' : '';
      if (flag === ' ✖') bad++;
      console.log(`  ${sc.id.padEnd(12)} ${a.id.padEnd(9)} ${max.toFixed(0).padStart(5)}°        ${String(over).padStart(4)}/${n}        ${out}/${n}${flag}`);
    }
  });
  console.log(bad ? `\n✖ ${bad} Einstellung(en) prüfen.` : '\n✔ Keine Profil-Einstellungen, Köpfe im Bild.');
  return bad ? 1 : 0;
};
const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]] as [number, number, number];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] as [number, number, number];
const norm = (a: number[]) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l] as [number, number, number]; };
