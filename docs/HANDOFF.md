# PlotRush – Projektübergabe (HANDOFF)

Stand: Ende der Sitzung nach der ersten Vorschau von „Die Nachricht von morgen“. Dieses Dokument ist die einzige Wahrheit über den Ist-Zustand; ältere Teile in `README.md` und `docs/STORY_FORMAT.md` sind Detailreferenzen. **Zuerst `CLAUDE.md` (Repo-Wurzel) lesen.**

- Repository: GitHub `matekalmar11-boop/tt-generator` · **Arbeits-Branch: `claude/tiktok-generic-scene-system-ic6ci0`** (aus `claude/tiktok-generator-remotion-uj6jku` hervorgegangen, gleicher Ursprung `21642b1`). Es existiert **kein Pull Request**; keiner wurde ohne Aufforderung angelegt.
- Sprache der Zusammenarbeit: Deutsch. Der Nutzer entscheidet über jede Stufe („Freigabe“), bevor weitergebaut wird.

## 1 · Projektziel
PlotRush = Generator für **deutschsprachige, stilisierte 3D-Kurzgeschichten für TikTok** (1080×1920, 30 FPS, H.264 + AAC, ca. 30–45 s). Eine Geschichte ist **eine YAML-Datei**; daraus entstehen automatisch 3D-Szenen, Kamera, Sprache (Piper-TTS, offline, kostenlos), Untertitel (echte Wort-Timings), Einblendungen, Soundeffekte, Musik, schnelle Vorschau und – nur nach ausdrücklicher Freigabe – der finale Export. Alles kostenlos/offline, keine kostenpflichtigen APIs. Zielstil: **modern, Roblox-artig, ausdrucksstark**, keine „zusammengebauten Würfel“.

## 2 · Architektur (Datenfluss)
```
stories/<id>.yaml ──zod-Schema (src/story/schema.ts) + Querprüfungen (validate.ts, registry.ts)
        │
        ├─ Sprache: tools/voice.ts → tts/yaml_tts.py (Piper + ffmpeg) → public/audio/vo_<zeilen-id>.wav
        │            + src/story/voices/<id>.json (echte Wort-Timings, Mund-Hüllkurve, Phoneme) + src/story/audioManifest.json
        ▼
Zeitleiste (src/story/timeline.ts): echte Dauer/Wort-Timings (voices-JSON oder alte timeline.json) sonst Schätzung (≈18 Zeichen/s)
        ▼
Remotion-Composition "StoryAny" (src/Root.tsx, Props = {story, timeline, renderFps}) → <StoryVideo> (src/story/StoryVideo.tsx)
   ├─ 3D je Szene: <StoryScene> (StoryScene.tsx): Kulisse, Himmel, Licht, Figuren (Rigs), Objekte, Kamera (resolve.ts, presets.ts, refs.ts)
   ├─ Overlays: Serien-Tag, Titel/Namensschild/Endkarte/message (StoryOverlays.tsx), Untertitel (src/Subtitles.tsx), Vignette
   ├─ Audio: Stimmen, SFX, Musik mit Ducking (Formeln wie im Mondsplitter-Film)
   └─ Zeitmaßstab für Vorschau-FPS (timescale.tsx)
        ▼
tools/preview.ts (Vorschau 360×640@15 FPS, Szenen-Cache) · tools/export.ts (Freigabe → Final 1080×1920@30) · tools/assemble.ts (Zusammenfügen)
```
Referenz/Altbestand (**unverändert lassen**): `stories/mondsplitter.yaml`, handgeschriebene Szenen `src/scenes/Scenes.tsx`, `src/Main.tsx`, `src/story/timeline.json`, `tts/synth.py`/`redo_dragon.py`, `story/script.json`, `renders/tiktok-fantasy.mp4`. Regressionstest: Standbilder `Main` ↔ `MondsplitterYaml` ↔ `RefBild` müssen identisch sein (`scripts/compare-stills.mjs`).

### Wichtige Dateien
| Bereich | Pfade |
|---|---|
| Schema/Registry/Prüfung | `src/story/schema.ts`, `registry.ts` (Rigs, Kulissen, Objekte, Kamera-Presets), `validate.ts` |
| Auflösung Zeit/Verweise/Kamera | `src/story/resolve.ts`, `refs.ts`, `presets.ts` |
| Szene/Video | `src/story/StoryScene.tsx`, `StoryVideo.tsx`, `StoryOverlays.tsx`, `src/Subtitles.tsx`, `timeline.ts`, `timescale.tsx` |
| Figuren | `src/world/Finn.tsx`, `Dragon.tsx`, `Person.tsx` (alt), **`Person2.tsx`**, `RBox.tsx`, `person2Motion.ts`; Signale `src/story/person2Signals.ts`; Mundformen `src/story/visemes.ts` |
| Kulissen/Objekte | `src/world/Sets.tsx` (plateau, forest, cave, abyss), `Interiors.tsx` (empty_stage, room), `City.tsx` (city_street), `Door.tsx`, `Nature.tsx` |
| CLI | `tools/story.ts` (Einstieg), `voice.ts`, `preview.ts`, `export.ts`, `assemble.ts`, `shotcheck.ts`, `test-resolve.ts` |
| TTS/Audio | `tts/yaml_tts.py`, `tts/setup.sh`, `tts/sfx.py` (alte Sounds), `tts/sfx_mystery.py` (neue Sounds) |
| Studie (getrennt) | `study/` + `scripts/study-*.mjs`, Ergebnisse `docs/study/` |

## 3 · Befehle (alle `npm run story -- …`, kein Befehl rendert ohne Aufforderung etwas Langes)
| Befehl | Zweck |
|---|---|
| `check <yaml> [--json]` | Schema + Querprüfungen (Verweise, Zeiten, Audiodateien, Posen, look …), Länge, Hinweise |
| `voice <yaml> [--check] [--force] [--line id]` | Sprache erzeugen (Piper), Cache nach Prüfsumme, Wort-Timings + Phoneme, Manifest. Fehlt Python/Modell/ffmpeg: **nichts** wird erzeugt, genaue Fehlerliste (Exit 2) |
| `manifest` | `src/story/audioManifest.json` aus `public/audio` neu schreiben (der Renderer spielt nur Dateien daraus) |
| `shots <yaml>` | Kameraprüfung ohne Rendern: Winkel zum Gesicht, Kopf im Bild |
| `still <yaml> --scene id --times 0.5,1.2 --out ordner [--scale 0.4]` | Standbilder (Sekunden relativ zur Szene) |
| `preview <yaml> [--scene a,b] [--from 3s --to 8s] [--size 360\|270] [--fps 15] [--out f] [--no-cache] [--concurrency n] [--props f]` | Vorschau-MP4 (Standard 360×640@15 FPS, **1 Tab**), Szenen-Cache `out/preview-cache`, Bundle-Cache `out/bundle-cache`. `--props` schreibt nur die Props (finale Qualität) |
| `approval <yaml>` / `approve <yaml> [--confirm <hash8>] [--by n] [--note t]` / `revoke <yaml>` | Freigabe-Schranke (siehe §7) – **nur auf ausdrückliche Anweisung des Nutzers** |
| `render <yaml> [--only a,b] [--force] [--test-scale 0.25]` | Finalexport 1080×1920@30 – **nur mit gültiger Freigabe und ausdrücklicher Anweisung** |
| `schema` | `stories/story.schema.json` (Editor-Autovervollständigung) neu schreiben |
| `compare-legacy stories/mondsplitter.yaml` | Migrationsnachweis YAML ↔ Mondsplitter-Daten |
Weitere: `npm run test:story` (Funktionstests ohne Rendern), `npx tsc --noEmit`, `npm run tts:setup` (venv, piper-tts, numpy, onnx, Modell `de_DE-thorsten-medium` aus dem sherpa-onnx-GitHub-Release), `node scripts/comp-stills.mjs <CompId> <ordner> <frame…>` (Standbilder beliebiger Compositions; `SCALE=…`), `scripts/check-timescale.mjs`, `scripts/bench.mjs` (nur auf Aufforderung!).
Compositions im Studio (`npm run dev`): `Main` (Mondsplitter handgeschrieben), `RefBild`, `StoryTest`, `MondsplitterYaml`, `StadtDemo`, `Etappe2Test`, `StoryAny` (generisch, Props).

**Vor jedem Commit** (CLAUDE.md): `npx tsc --noEmit` · `npm run test:story` · `npm run story -- check stories/<datei>.yaml` (+ `compare-legacy`, Mondsplitter-Standbilder bei Änderungen an Renderer-Code).

## 4 · YAML-System (Kurzfassung; Details `docs/STORY_FORMAT.md`)
`schema: 1`, `meta`, `format`, `voices` (Piper-Profile: lengthScale, noiseScale, noiseW, sentenceGap, loudness, effect{pitch, lowpassHz, eq, echo}, subtitle{accent,label}), `cast` (Figur → rig, voice, look), `audio.music` (+ Ducking, fadeOut), `subtitles`, `transitions.cutFlash`, `overlays.seriesTag/vignette`, `scenes[]` mit `set`, `environment`, `light`, `actors[]` (at/path, yaw, pose/face/prop als Keyframes, params), `objects[]`, `camera` (`keys`, `orbits`, `shots` = Presets, `shake`), `lines[]`, `sfx[]`, `captions[]`.
- **Zeit:** Sekunden `1.5`, Frames `"40f"`, Anker `"l03.start+12f"`, `"l06.word2+0.1s"`, `"scene.end-2f"`. Szenenlänge = `pre` + Sprechzeilen (echte Länge) + `post`.
- **Verweise:** `{rel: <actor-id>[.head], off:[..]}`, `{obj: <objekt-id>}`; Orbit-center/look dürfen Verweise sein.
- **Kamera-Presets** (`camera.shots`): `push_in`, `orbit_in`, `whip_to`, `over_shoulder`, `crane_down`, `track_behind`, `dolly_zoom`, `handheld` (Parameter in `registry.ts` → `CAMERA_PRESETS`).
- **Einblendungen** (`captions`): `lower_third`, `end_card`, `title`, **`message`** (`style: chat|photo|lock`; chat: sender/text/time/status/accent; photo: Foto-Rahmen mit Zeitstempel `time`, `flash`, `sender`-Etikett; lock: Sperrbildschirm-Uhr `time` + Datum `text`).
- **Kulissen:** `plateau`, `forest`, `cave`, `abyss`, `room` (Küche/Wohnraum, Boden x ±7, z −4…16; Parameter wall/floor/trim/accent/window/furniture – **kein Schlafzimmer, ohne Möbel leer**), `city_street` (Fahrbahn x ±4, Gehwege |x| 4…7; Parameter u. a. `lamps`, `cars`, `trees`, `windows`, `seed`), `empty_stage`. Himmel: `night_sky`, `starry_sky`, `gradient`, `none`.
- **Objekte:** `glow_shard`, `floating_shards`, `eyes_in_dark`, `orbiting_shards`, `dust`, `point_light`, `cracking_ground`, **`door_handle`** (Tracks `handle`, `light`). `spotlight_text` nur reserviert.
- **Rigs:** `finn`, `dragon` (Mondsplitter), `person`, **`person2`**. Jedes Rig hat Posen/Gesichter/Props/`look`-Felder in `registry.ts` (die Prüfung meldet Tippfehler mit „Meintest du …?“).

### Rig `person2` (Standard für neue Geschichten)
Abgerundete Blockfigur (RBox: Kunststoff-Look, Kontur, 2 Segmente je Rundung), **Gesicht als gezeichnete Textur (Decal)**. Gleiche YAML-Eigenschaften wie `person`: Posen `idle walk sneak run sit wave point shock` + **`call`**, Gesichter `neutral smile grin worry shock angry determined`, Props `phone cup`, `look` (skin, hair, hairStyle short|long|bald, eyes, shirt, pants, shoes, coat, apron, hat, glasses), `scale`, `ghost`. `params`: `gaze` (`auto`|`off`|`camera`|Figuren-ID), `gestures`, `energy`, `speed`, **`blink`** (false = kein Blinzeln).
Automatisch: Atmen/Gewichtsverlagerung/Kopfbewegung, Blinzeln, weiche Posenübergänge (smootherstep), Kopf/Augen zum Sprecher, Nicken+Handimpulse je Wort, **Gehzyklus mit Fußkontakt** (Zwei-Knochen-IK, Schrittphase aus Wegstrecke, Standfüße rutschen nicht – Unit-Test), **Mundformen aus Piper-Phonemen** (`visemes.ts`, 8 Formen; ohne Phoneme Rückfall auf Hüllkurve). Füße stehen auf y = 0 (Hüfte 1,34); `person` (alt) steht ≈ 0,19 im Boden. Kopfhöhe ≈ 3,1–3,5.
Messwert: ≈ +20 % Renderzeit pro Figur gegenüber `person`.

## 5 · TTS, Audio, Untertitel
- **Piper** (ein deutsches Modell: Thorsten medium, CC0; Modell nicht im Repo, `tts/models/` ignoriert – `npm run tts:setup` lädt es von GitHub; **huggingface.co ist aus der Umgebung gesperrt**). Pipeline-Version in `tools/voice.ts` (`PIPELINE_VERSION = 4`; bei Klangänderungen erhöhen, dann wird alles neu erzeugt). Piper ist **nicht deterministisch** (Dauer schwankt je Lauf) → Cache `tts/cache/` (ignoriert) + Prüfsumme je Zeile (Text in gesprochener Form, Profil, Version, FPS); `src/story/voices/<id>.json` + `public/audio/vo_<id>.wav` sind **eingecheckt**, damit Rendern ohne TTS-Umgebung geht.
- **Wort-Timings echt** aus Piper-Phonemausrichtung (`timingMode: aligned`), Lautheit zweistufig (loudnorm). Kurze Zeilen verfehlen das Ziel um bis ≈ 2 LU (Peak-Grenze).
- `pronunciations` (Wort → Sprechweise) wirkt nur auf die Sprache, nicht auf Untertitel.
- **Soundeffekte/Musik:** Dateien in `public/audio/*.wav` (nur diese listet `audioManifest.json`; fehlende Dateien meldet `check`). Alt: `sfx.py` (Mondsplitter; **Skript nicht erneut ausführen**, es überschreibt alle alten Sounds). Neu: `tts/.venv/bin/python tts/sfx_mystery.py [name…]` erzeugt `ping, ring, shutter, beep_drop, door_latch, music_mystery`. **Alle prozedural erzeugten Sounds sind nie abgehört worden.**
- **Untertitel:** `src/Subtitles.tsx` (`SubtitleView`), Häppchen aus echten Wort-Timings (maxWords/maxChars), Sprecherfarbe und -schild aus `voices.<id>.subtitle`. Außerhalb der Sprache keine Untertitel.

## 6 · Rendering, Vorschau, Cache, Leistung (gemessen, 4 Kerne, Software-WebGL „swangle“)
- Nur `--gl=swangle` funktioniert (swiftshader/angle liefern keinen WebGL-Kontext). **1 Browser-Tab ist schneller als 4** (Final 64,6 s vs. 80,4 s für 60 Bilder; Standard `--concurrency 1`).
- Vorschau 360×640@15 FPS: ≈ 0,18–0,43 s/Bild je nach Szene (Straße/Foto-Szenen teuer); ganze Nachricht-von-morgen kalt ≈ 2 min, gecacht ≈ 2 s. Final 1080×1920@30: ≈ 1,1 s/Bild bei Straßenszenen (Hochrechnung, **nie vollständig gemessen**).
- **Wichtiger Fix:** R3F begrenzt dpr auf ≥ 1 → 3D rechnete in der Vorschau in voller Größe; `StoryVideo` setzt `dpr=[min(1,devicePixelRatio),2]` (3× schneller; bei Maßstab 1 unverändert).
- **Zeitmaßstab** (`timescale.tsx`): Vorschau mit 15 FPS bleibt zeitgleich zu 30 FPS (Test `scripts/check-timescale.mjs`, 0,000/255). Tonbeginn in der Vorschau auf 15-FPS-Raster gerundet (±33 ms).
- **Szenen-Cache** (`out/preview-cache`, `out/final-cache`, ignoriert): Schlüssel = Szeneninhalt + Zeitleiste + globale Einstellungen + Audiodatei-Hashes + **Code-Hash (`src/`, remotion.config.ts, package-lock.json)** + Einstellungen + **Gesamtlänge**. ⇒ Jede Änderung am Renderer-Code oder an der Gesamtlänge macht **alle** Szenen neu (Ton-/Musikposition hängt an der absoluten Zeit).
- **Zusammenfügen** (`tools/assemble.ts`, Vorschau und Export gleich): Video je Stück ohne Ton übernehmen (sonst Lücken/falsche Bildrate), Ton je Stück auf exakt Bilder/FPS kürzen, als PCM verbinden, einmal AAC. Ausgabe wird geprüft (Codec, Auflösung, Bildzahl, FPS, Ton-/Bildlänge ≤ 0,05 s).
- **Tests/Prüfungen:** `npm run test:story` deckt u. a. Zeitauflösung, Presets, Orbit, Gehzyklus (Fußkontakt), Mundformen/Phoneme, Freigabe-Schranke, Cache-Schlüssel, message/call/blink/door ab. Standbild-Vergleiche über `scripts/comp-stills.mjs`.
- Standbilder `story still` sind für Kamera-/Gesichtsprüfung der schnellste Weg (≈ 2,5 s pro Bild).

## 7 · Freigabe-Schranke und Export (Schritt 5)
`render` läuft **nur mit gültiger Freigabe** (`approvals/<story-id>.json`; aktuell **keine einzige vorhanden**, `approvals/README.md` erklärt das). Die Freigabe bindet an: geparste YAML (mit Defaults) + Zeitleiste inkl. Wort-Timings + SHA-256 aller benutzten Audiodateien + **Renderer-Code**. Jede Änderung → ungültig. Ablauf: `approve <yaml>` zeigt Zusammenfassung + Hash, schreibt nichts → `approve <yaml> --confirm <hash8>` → `render <yaml>`. Der Export (Szenen einzeln in `out/final-cache`, sample-genaues Zusammenfügen, Ausgabeprüfung nach `out/final/<id>.mp4`) wurde **nur im Technik-Test mit `--test-scale 0.25` (270×480) ausgeführt, nie in 1080×1920**. Nutzerregel: Agenten geben **nie** selbst frei und rendern **nie** final ohne ausdrückliche Aufforderung. `--test-scale` benötigt trotzdem eine Freigabe.

## 8 · Bekannte technische Probleme / Grenzen
1. **Eine** deutsche TTS-Stimme (Thorsten): Leon/Ben unterscheiden sich nur per Tonhöhe (132 vs. 105 Hz, 4 Halbtöne) und Telefonfilter; nie abgehört; Leon klingt nicht wie ein Junge.
2. Prozedurale Sounds/Musik nie abgehört. Alt-`sfx.py` nicht neu starten.
3. person2-Gesicht ist ein flaches Decal: ab ≈ 60° zur Frontalen verzerrt; in Nahaufnahmen wirken Gesichter groß/cartoonhaft; Doppelgänger nur durch Kleidung/Szene unterscheidbar.
4. person2: nur horizontaler Blick; Gesten einfach; `run`/`sneak` visuell ungeprüft bzw. ohne IK; kein Überschwingen/Anticipation bei Posenwechseln; Kamerapresets ohne Verdeckungsprüfung (nur `shots`-Befehl, grobe Näherung ohne Kopfdrehung).
5. `room` ohne Möbel wirkt leer; kein Bett; `city_street` hat Laternenmasten, die Kamera verdecken können (Workaround `lamps: false`); Straße ist teuerste Kulisse (~500 Einzelblöcke, 4 Punktlichter).
6. `message photo` ist nur ein **Rahmen um eine 3D-Szene** – es gibt keine Bild-/Bildschirm-Textur auf dem Handy; Handy-Bildschirm der Figur ist eine einfarbige Fläche.
7. Cache-Schlüssel enthält Gesamtlänge/Code → kleine Textänderungen rendern alles neu (~2 min Vorschau). Bundle-Cache nach Code-Hash.
8. Automatische Sync-Messung per Hüllkurvenkorrelation ist bei Zeilen nach dem Klingeln (`b01`) unsicher; Pegelprüfung zeigte korrekten Beginn.
9. Optionale Hinweise von `check` zur Nachricht-Story: Ben spricht in 2 Szenen nur als Off-Stimme (gewollt).
10. `tts/cache`, `tts/models`, `tts/.venv`, `out/`, `node_modules` sind **nicht** im Repo; in einer frischen Umgebung: `npm install`, ggf. `npm run tts:setup`.
11. Das GitHub-MCP/`gh` hat nur Zugriff auf dieses Repo; externe Quellen (kenney.nl, quaternius.com, itch.io, huggingface) sind aus der Umgebung nicht erreichbar.

## 9 · Entscheidungen und verworfene Ansätze
- **YAML-First** statt TSX je Geschichte; Registry statt Schema-Änderung für neue Bausteine; Mondsplitter bleibt als unveränderte Referenz.
- **Piper-Phonemausrichtung** statt geschätzter Wort-Timings (echte Timings, Phoneme für Mundformen).
- **Vorschau = gleiche Composition** wie Final, nur kleiner/15 FPS; kein „Fast-Modus“ (ohne Schatten/AA: nur −7 %, verworfen).
- **Figuren:** Studie `docs/study/` verglich verbesserte Person (v2) vs. GLB (KayKit Rogue, CC0) vs. Hybrid (KayKit-Retargeting). **Entscheidung: optimierte v2 → `person2`.** **Verworfen:** KayKit-Rogue als Hauptfigur (Fantasy-Chibi, keine Gesichtsausdrücke) und die Skelett-Übertragung (Chibi-Charakter der Clips wandert mit: Hände-in-die-Hüften-Idle, Knie-Beugen, kein Fußkontakt). Studiencode liegt getrennt in `study/` (nicht Teil des Generators); Asset `public/study/Rogue.glb` (CC0, Lizenzdatei dabei).
- **Neue Funktionen nur klein:** `message`, `call`, `blink`, `door_handle`, `shots` – keine großen Generatorfunktionen ohne Freigabe.
- **Freigabe-Schranke** als Verfahrensschranke im Werkzeug + Regel in CLAUDE.md (nicht kryptografisch).
- Kein globaler `cutFlash` in „Die Nachricht von morgen“ (zu viele Schnitte); Blitz nur in den Foto-Rahmen.
- Verworfene Zwischenlösungen: Kamera mit Laternenmast im Bild; Streuung von 4 Tabs; Profil-Ansichten der Figuren (Gesicht unlesbar).

## 10 · Aktuelle Story: „Die Nachricht von morgen“
**Status: Die erste Vorschau wurde erstellt, ist aber NOCH NICHT für die Veröffentlichung freigegeben.** Keine Freigabe (`approvals/` leer), kein Finalexport, keine 1080p-Ausgabe.

**Bewertung des Nutzers zur ersten Vorschau (maßgeblich für die nächste Arbeit):**
- Der Einstieg ist für den Zuschauer **nicht ausreichend verständlich**.
- Die Handlung muss **visuell klarer** erzählt werden.
- **Zu viele ähnliche Einstellungen von Leon.**
- **Zimmer und Umgebung wirken zu leer.**
- **Die Fotos, Ben und der Doppelgänger müssen deutlicher gezeigt werden.**
- **Figuren und Kamera brauchen weitere Qualitätsverbesserungen.**
(Davor freigegebene Grundstruktur: Länge 30–35 s, Datumsvergleich, letzte Szene 5–6 s, Türklinke vor Schwarz, Dialog gekürzt, Ben sagt „vor deinem Haus“.)

**Handlung:** Leon (Junge) bekommt eine Nachricht von seiner eigenen Nummer: „Geh morgen nicht zur Schule.“ Foto von sich beim Handyblick, Zeitstempel Mittwoch 08:17 (Sperrbildschirm: Dienstag 19:42). Ben ruft an: Leon stehe vor seinem Haus – Leon ist zu Hause. Foto 2: Ben neben einer Gestalt, die aussieht wie Leon (Dienstag 19:44). Leon warnt Ben, Leitung bricht ab. Letzte Nachricht: „Das bin nicht ich.“ Schritte, Türklinke bewegt sich langsam, Schwarz, Endkarte „TEIL 2 · MITTWOCH · 08:17“.

**Szenen (31,80 s, 11 Szenen; Start/Dauer in s; Zeilen = Start+Dauer):**
| Szene (`id`) | Start | Dauer | Kulisse | Inhalt/Kamera |
|---|---|---|---|---|
| `nachricht` | 0,00 | 2,63 | room (dunkel, leer) | Chatkarte; `l01@0.47+1.20` „Von meiner eigenen Nummer?“; `push_in` |
| `foto1` | 2,63 | 2,10 | room kalt | Foto-Rahmen „MITTWOCH · 08:17“, starre Kamera von oben |
| `datum` | 4,73 | 4,37 | room | `l02@5.10+1.53` „Mittwoch, acht Uhr siebzehn?“; `l03@6.87+1.37` „Heute ist erst Dienstag.“; Sperrbildschirm „Dienstag 19:42“; `handheld` |
| `anruf` | 9,10 | 5,20 | room | Klingeln; `b01@10.20+1.87` Ben „Alter, was machst du vor deinem Haus?“; `l04@12.33+1.50` „Was? Ich bin zu Hause.“; Pose `call`; `push_in` |
| `ben` | 14,30 | 3,40 | city_street (ohne Laternen) | `b02@14.57+2.27` Ben „Du stehst genau vor mir. Und grinst.“; Subjektive der Gestalt, `handheld` |
| `reaktion` | 17,70 | 1,40 | room | stumme Nahaufnahme Leon |
| `foto2` | 19,10 | 2,30 | city_street | Foto-Rahmen „DIENSTAG · 19:44“, Ben + Doppelgänger frontal, starr |
| `warnung` | 21,40 | 4,60 | room | `l05@21.70+1.20` „Ben, lauf weg!“; `b03@23.17+1.83` Ben „Leon? Jetzt sag doch was!“; Piep |
| `letzte` | 26,00 | 2,30 | room dunkel | rote Chatkarte „Das bin nicht ich.“, Herzschlag, Schritte |
| `tuer` | 28,30 | 2,20 | room | `door_handle`, Klinke senkt sich, Licht unter der Tür, Knarren/Klacken, Boom |
| `ende` | 30,50 | 1,30 | empty_stage schwarz | Endkarte |
Stimmen: `leon` (pitch 1,12, lengthScale 1,02), `ben` (pitch 0,97, Tiefpass 3400 Hz, EQ +4 dB @1800 Hz, Label „BEN · AM TELEFON“). Cast: `leon`, `ben` (Kappe), `doppel` (identisch zu Leon, Augen heller `#e6ecff`, `blink:false`, `energy:0`).

**Exakte Pfade**
- Story-YAML: `stories/nachricht-von-morgen.yaml`
- Sprache: `public/audio/vo_l01…l05.wav`, `vo_b01…b03.wav`; Zeitdaten `src/story/voices/nachricht-von-morgen.json`
- Neue Sounds/Musik: `public/audio/{ping,ring,shutter,beep_drop,door_latch,music_mystery}.wav` (Generator `tts/sfx_mystery.py`); vorhandene genutzt: `heartbeat, riser, stinger, boom, steps, wind`
- Drehbuch/Planung/Messwerte: `docs/stories/nachricht-von-morgen.md`
- **Vorschau-MP4 (im Repo, erste Fassung v1): `docs/previews/nachricht-von-morgen-vorschau-v1.mp4`** (360×640, 15 FPS, 31,80 s, 1,3 MB, SHA-256 `e85d44b7a599ffce…`); lokale Arbeitskopie `out/preview/nachricht-von-morgen-vorschau.mp4` (**ignoriert, in neuer Umgebung nicht vorhanden**; Neuerzeugung: `npm install && npm run story -- preview stories/nachricht-von-morgen.yaml`, ≈ 2 min, benötigt Chromium; Sprachdateien sind eingecheckt, kein TTS-Setup nötig).
- Nicht gerendert: 1080p, Export, Freigabe.

## 11 · Offene Aufgaben / nächste Schritte
1. **Nächster Auftrag (neuer Chat): sehr genaue Szene-für-Szene-Analyse der Vorschau** (Bild, Ton, Untertitel, Kamera, Verständlichkeit, Rhythmus) und ein **konkreter Verbesserungsplan** – ohne sofort zu implementieren; Plan dem Nutzer zur Freigabe vorlegen. Startprompt: `docs/NEXT_SESSION.md`.
2. Danach (nur nach Freigabe): Dramaturgie/Einstieg klarer erzählen, Einstellungs-Variation (weniger gleiche Leon-Shots), Zimmer ausstatten (Möbel/Requisiten/Tiefe), Fotos/Ben/Doppelgänger deutlicher zeigen, Figuren-/Kamera-Qualität (Gesicht schräg, Blick, Gesten, Kamera-QA), ggf. zweite/jüngere Stimme.
3. Stimmen und Sounds vom Nutzer anhören lassen (nie abgehört).
4. Erst nach neuer Vorschau und Nutzerfreigabe: `approve` (Nutzer entscheidet), dann Finalexport 1080×1920 (Dauer ≈ 10 min Hochrechnung; erster echter Volllauf steht aus).
5. Technische Schulden: Cache-Schlüssel ohne Gesamtlänge (weniger Neurendern), Handy-Bildschirm/Foto-Textur, Bett/Möbel-Sets, Kamera-Verdeckungsprüfung, bessere Sync-Messung.

## 12 · Arbeitsregeln (aus CLAUDE.md und Nutzerwünschen)
Keine langen Renderings/Benchmarks ohne Aufforderung (Standbilder, kurze Abschnitte); Mondsplitter und alte Rigs nie verändern; nie selbst `approve`/`render`; erst Plan vorlegen und Freigabe abwarten, dann umsetzen; keine kostenpflichtigen Dienste; keine Assets mit unklarer Lizenz; Ergebnisse immer als Dateien (MP4/PNG) bereitstellen und offen Grenzen benennen (nicht Gehörtes/Gesehenes nicht als geprüft ausgeben); Commit-Anhang: `Co-Authored-By` und `Claude-Session`-Zeilen; Push nur auf `claude/tiktok-generic-scene-system-ic6ci0`.

---

## Nachtrag: Richtungswechsel – Film-Erklärtest „Die Truman Show“

Die kreative Richtung wechselt von Mystery-Stories zu eigenständig kommentierten Film-Zusammenfassungen. Gesamtplan, Shotliste (17), Lehren und Messwerte: `docs/plans/truman-show.md`. Meilenstein M1 liegt vor (`stories/truman-show-m1.yaml`, Vorschau `docs/previews/truman-show-m1-vorschau-v1.mp4`, nicht freigegeben); M2/M3 sind nicht freigegeben. Neue Bausteine: Objekte `hidden_camera`, `stage_light`, `sky_panel` (`src/world/Props.tsx`), Einblendungen `camera_view` und `callout`.
