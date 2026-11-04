/**
 * Szenenstücke (mp4 mit Ton) zu EINER Datei zusammenfügen – für Vorschau und finalen Export gleich:
 * Video je Stück ohne Ton übernehmen (kein Neukodieren; sonst addiert der Concat-Demuxer die längere Containerdauer inkl. Ton → Lücken),
 * Ton je Stück auf exakt Bilder/FPS Sekunden kürzen bzw. auffüllen (verhindert Drift durch AAC-Blockgrenzen), als PCM verbinden, einmal AAC-kodieren.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

export const probe = (file: string) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', 'stream=codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames,duration', '-of', 'json', file], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`ffprobe fehlgeschlagen für ${file}: ${r.stderr}`);
  const j = JSON.parse(r.stdout) as {streams: {codec_type: string; codec_name: string; width?: number; height?: number; avg_frame_rate?: string; nb_read_frames?: string; duration?: string}[]};
  return {video: j.streams.find((s) => s.codec_type === 'video'), audio: j.streams.find((s) => s.codec_type === 'audio')};
};
export const ff = (args: string[]) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.slice(0, 6).join(' ')} … fehlgeschlagen:\n${r.stderr}`);
};

export const assembleSegments = (segs: {file: string; frames: number}[], fps: number, outFile: string, audioBitrate = '192k'): void => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'assemble-'));
  try {
    const vl: string[] = [], al: string[] = [];
    segs.forEach((s, i) => {
      const dur = s.frames / fps, wav = path.join(tmpDir, `a${i}.wav`), vseg = path.join(tmpDir, `v${i}.mp4`);
      if (probe(s.file).audio) ff(['-i', s.file, '-vn', '-map', '0:a:0', '-ac', '2', '-ar', '44100', '-af', `apad,atrim=duration=${dur.toFixed(6)}`, wav]);
      else ff(['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', dur.toFixed(6), wav]);
      ff(['-i', s.file, '-an', '-c:v', 'copy', vseg]);
      vl.push(`file '${vseg}'`); al.push(`file '${wav}'`);
    });
    const vlist = path.join(tmpDir, 'v.txt'), alist = path.join(tmpDir, 'a.txt'), vid = path.join(tmpDir, 'video.mp4'), aud = path.join(tmpDir, 'audio.wav');
    fs.writeFileSync(vlist, vl.join('\n')); fs.writeFileSync(alist, al.join('\n'));
    ff(['-f', 'concat', '-safe', '0', '-i', vlist, '-an', '-c:v', 'copy', vid]);
    ff(['-f', 'concat', '-safe', '0', '-i', alist, '-c', 'copy', aud]);
    ff(['-i', vid, '-i', aud, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-af', 'alimiter=limit=0.93:level=disabled', '-c:a', 'aac', '-b:a', audioBitrate, '-movflags', '+faststart', outFile]);   // Limiter: keine Übersteuerung/Spitzen über −0,6 dBFS (AAC-Überschwinger)
  } finally { fs.rmSync(tmpDir, {recursive: true, force: true}); }
};
