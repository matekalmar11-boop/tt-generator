# tt-generator – „Der Mondsplitter" (Teil 1)

TikTok-Kurzfilm (1080×1920, 30 FPS, H.264 + AAC, 44 s) mit React, TypeScript, Remotion und three.js.
Fertiges Video: `renders/tiktok-fantasy.mp4` · Prüfbericht: `renders/verifikation.txt`. Alles kostenlos/offline.

## Neu: Story-Format (Schritt 1 von 5)
Geschichten als YAML (`stories/*.yaml`), Prüfung ohne Rendering: `npm run story -- check stories/mondsplitter.yaml`.
Details, Status und Migrationsnotizen: [docs/STORY_FORMAT.md](docs/STORY_FORMAT.md). Der bisherige Referenzcode bleibt unverändert und rendert weiterhin.

Schritt 2 (Etappe 1): `<StoryScene>` rendert Szenen aus der YAML – Composition `StoryTest` im Studio, Test `npm run test:story`, Standbild-Vergleich `npm run story:compare`.

Schritt 2 (Etappe 3): `<StoryVideo>` rendert komplette YAML-Geschichten mit Untertiteln, Einblendungen und Audio – Compositions `MondsplitterYaml` und `StadtDemo` im Studio; `npm run story -- manifest` aktualisiert die Audio-Liste.

Schritt 3: `npm run story -- voice stories/<datei>.yaml` erzeugt die Sprache aus der YAML (Piper, Cache, echte Wort-Timings); Einrichtung `npm run tts:setup`, Details in [docs/STORY_FORMAT.md](docs/STORY_FORMAT.md).

## Pipeline
1. `story/script.json` – Geschichte (Szenen, Sprechzeilen, Sprecher).
2. `tts/synth.py` – deutsche TTS (Piper-Stimme *Thorsten*, CC0) → `public/audio/vo_*.wav`, Wort-Timing, Lippensync-Hüllkurve → `src/story/timeline.json`.
   `tts/redo_dragon.py` – Drachenstimme (milder Effekt, gleiche Längen).
3. `tts/sfx.py` – prozedurale Soundeffekte + Musik (numpy).
4. `src/` – Remotion: 8 3D-Szenen (`scenes/Scenes.tsx`), Figur (`world/Finn.tsx`), Drache, Kulissen, Karaoke-Untertitel (`Subtitles.tsx`).
5. `tts/verify.py <mp4>` – ffprobe, Pegel, Whisper-ASR (Sprachverständlichkeit, Untertitel-Sync).

## Setup
```bash
npm install
python3 -m venv tts/.venv && tts/.venv/bin/pip install sherpa-onnx piper-tts numpy scipy soundfile
# Modelle (nicht im Repo): tts/models/vits-piper-de_DE-thorsten-medium (sherpa-onnx Release "tts-models"),
#                          tts/asr/sherpa-onnx-whisper-small (nur für verify.py)
npm run dev      # Studio-Vorschau
npm run render   # MP4 (ohne GPU ca. 30 min, --gl=swangle)
```
