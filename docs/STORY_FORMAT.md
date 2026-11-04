# Story-Format (Schritt 1)

Eine Geschichte ist **eine YAML-Datei** in `stories/`. Sie beschreibt Figuren, Kulissen, Kamera, Dialoge, Töne und Untertitel.
Das Schema ist **generisch**: Welche Figurenarten, Kulissen und Objekte es gibt, steht in `src/story/registry.ts` – neue Genres
(Krimi, Sci-Fi, Erklärvideo …) brauchen dort nur neue Einträge, keine Schema-Änderung. Beispiel: `stories/beispiel-kuchenkrimi.yaml`.

## Befehle (rendern nichts)
```bash
npm run story -- check stories/mondsplitter.yaml        # Schema + Querprüfungen, Zusammenfassung, geschätzte Länge
npm run story -- compare-legacy stories/mondsplitter.yaml  # Migrationsnachweis gegen story/script.json + timeline.json
npm run story -- schema                                  # stories/story.schema.json (Editor-Autovervollständigung)
npm run story -- check <datei> --json                    # maschinenlesbar
```
`voice`, `preview`, `render` sind reserviert und führen **nichts** aus (Schritt 3–5). Exit-Code 1 bei Fehlern.
Struktur-Fehler (Schema) und Logik-Fehler (Verweise, Namen, Zeiten) kommen in zwei Durchgängen – erst Struktur beheben, dann erscheinen die Logik-Prüfungen.
Demos: `stories/_demo-fehler-struktur.yaml`, `stories/_demo-fehler-logik.yaml`.

## Aufbau
```
schema: 1
meta        id, title, genre, description, targetDuration{min,max}
format      fps, width, height                       (Standard 30 / 1080 / 1920)
voices      <id>: Piper-Modell, lengthScale, noiseScale, noiseW, sentenceGap, loudness, effect{pitch,lowpassHz,eq,echo}, subtitle{accent,label}
cast        <id>: rig, name, role, voice, look       (wiederverwendbare Figuren)
timing      lineGap                                  (Pause zwischen Sprechzeilen)
audio       music{file,volume,duck{depth,attack,release},fadeOut}
subtitles   maxWords, maxChars, font, maxFontSize, bottomPadding
transitions cutFlash{color,peak,lead,tail}
overlays    seriesTag{text,accent}
scenes[]    id, title, timing{pre,post}, set{type,params,tracks}, environment{…}, light{fog,hemi,ambient,key},
            actors[]  (cast, at|path, yaw, scale, ghost, visible, pose|face|prop-Keyframes, params, tracks, rotate)
            objects[] (type, at, path, visible, params, tracks)
            camera    (keys[], orbits[], shake[])
            lines[]   (id, who, text)      sfx[] (sound, at, volume, loop)      captions[] (lower_third | end_card)
```
Szenenlänge = `pre` + Sprechzeilen (aus der TTS) + `post` – nie von Hand eingetragen.

## Zeit, Anker, Winkel, Vektoren
| Form | Beispiel | Bedeutung |
|---|---|---|
| Sekunden | `1.5` | Sekunden ab Szenenstart |
| Frames | `"40f"` | Frames bei den eingestellten FPS (verlustfrei aus dem alten Code übertragen) |
| Zeilen-Anker | `"l06.start+22f"`, `"l05.end-2f"` | relativ zu Beginn/Ende einer Sprechzeile **dieser Szene** |
| Wort-Anker | `"l06.word2+0.1s"` | Beginn des 2. Wortes (ab 1) – verschiebt sich automatisch mit der Sprache |
| Szene | `"scene.end"`, `"scene.end-2f"` | Szenenende |
| Winkel | `pi`, `"0.85pi"`, `"pi-0.15"`, `"90deg"`, Zahl in Radiant | `yaw: pi` = Figur schaut von der Kamera weg |
| Vektor | `[x,y,z]` · `{rel: finn, off:[..]}` · `{rel: lumi.head, off:[..]}` · `{obj: eyes, off:[..]}` | absolut, relativ zu Figur/Kopf, relativ zu Objekt |

Keyframe-Semantik: `ease` steht beim Key, **bei dem das Segment ankommt** (`lin`, `io`, `in`, `out`, `snap`, `cut`=hart). Bei `pose`/`face` ist `mix` die Stärke
der Zielpose (z. B. `mix: 0.45` = nur halb in die Schockpose). Kamera-`cut: true` = harter Schnitt.

## Was Schritt 1 bereits kann
- ✅ Vollständiges Schema inkl. strenger Prüfung (Tippfehler in Feldnamen werden gemeldet, mit „Meintest du …?“)
- ✅ Prüfung von Figuren-/Stimmen-/Szenen-/Zeilen-IDs, Sprecher↔Stimme, Anker (Zeile gehört zur Szene? Wort existiert?), Rig-spezifische Posen/Gesichter/Gegenstände/Parameter/Verläufe, Kulissen- und Objekt-Parameter, Sound-/Musikdateien in `public/audio`, Zeit-Reihenfolge, Szenenende, Ziffern im Text, Soll-Länge
- ✅ Längenschätzung ohne TTS (≈18 Zeichen/s; am Mondsplitter 43,9 s geschätzt vs. 44,1 s gemessen) bzw. echte Werte aus `src/story/timeline.json`
- ✅ Mondsplitter vollständig als YAML (8 Szenen, 13 Zeilen), `compare-legacy` bestätigt Texte/IDs/Stimmen/Timing
- ✅ Beispiel in einem anderen Genre (Krimi) validiert (mit Hinweisen für noch nicht gebaute Bausteine)

## Schritt 2, Etappe 1: generische `<StoryScene>` (Stand)
`src/story/StoryScene.tsx` baut eine Szene aus der YAML (Figuren, Kulisse, Himmel, Licht, Objekte, Kamera) mit den bestehenden Bausteinen;
`src/story/resolve.ts` löst Zeiten/Anker, Keyframes und `rel`/`obj`-Verweise auf (ohne React, testbar).
- Test: `npm run test:story` (Auflösung, ohne Rendering) · Vergleich: `npm run story:compare -- <ausgabeordner> <frame> …` rendert dieselben Frames aus Composition `RefBild` (handgeschrieben, nur 3D-Bild) und `StoryTest` (aus der YAML) als Standbilder.
- Ergebnis Mondsplitter (21 Standbilder, alle 8 Szenen): mittlere Abweichung 0,00/255; einzige Ausnahme Wendung-Frame 815 (0,04/255, 0,02 % der Pixel) – erwartete Folge von Vereinfachung 1 (ein Pfad für den Splitter statt zwei überlagerter Bewegungen). Beispiele: `docs/step2/`.
- Konventionen: Standard-Easing bei `pose`/`face`/`path`/Verläufen = `lin`, bei Kamera `io`. `mix` am Zielkey = Stärke der Zielpose (Start aus einer bereits gemischten Pose wird nicht berücksichtigt). Noch nicht angebunden bleibt eine Registry-Komponente mit Status `planned`: `<StoryScene>` bricht dann mit klarer Fehlermeldung ab, statt etwas Ähnliches zu zeigen.
- Noch offen in Schritt 2: `look` für den Drachen, Optik-Feinheiten der Einblendungen (Schriftgrößen/Konturen), Rig `person` mit weiteren Posen.

### Etappe 3: vollständige Videos aus der YAML (Untertitel, Einblendungen, Audio, `city_street`)
`<StoryVideo story timeline>` (`src/story/StoryVideo.tsx`) setzt eine ganze Geschichte zusammen: 3D-Szenen + Vignette + Serien-Tag + Namensschilder/Titel/Endkarte + Untertitel + Cut-Flash + Stimmen, Soundeffekte, Musik.
Compositions: `MondsplitterYaml` (echte TTS-Timeline; Vergleich mit `Main`), `StadtDemo` (neue Kurzgeschichte), `Etappe2Test`.
- **Zeitleiste** (`src/story/timeline.ts`): echte Wort-Timings aus `src/story/timeline.json`, sonst Schätzung aus dem Text (≈18 Zeichen/s, Wörter proportional, Mundbewegung nur als Näherung; `real: false`).
- **Untertitel**: `subtitles` (maxWords, maxChars, font, maxFontSize, bottomPadding) und je Stimme `voices.<id>.subtitle {accent, label}` – dieselbe Darstellung wie im Mondsplitter-Film (`SubtitleView` in `src/Subtitles.tsx`).
- **Einblendungen**: `overlays.seriesTag {text, accent, accentColor}`, `overlays.vignette`, `transitions.cutFlash {color, peak, lead, tail}`, `scenes[].captions`: `lower_third {from,to,title,subtitle,color,bg}`, `end_card {from,title,subtitle,glow,accent}`, neu `title {from,to,text,subtitle,position: top|center|bottom,color}`. Zeiten dürfen Anker sein (`"s05.end"`).
- **Audio**: Stimmen `public/audio/vo_<zeilen-id>.wav`, Effekte `scenes[].sfx` (`loop: scene`), Musik `audio.music` mit Ducking unter der Sprache und Ausblenden (Formeln wie im Mondsplitter-Film). Der Renderer spielt nur Dateien ab, die in `src/story/audioManifest.json` stehen (`npm run story -- manifest` aktualisiert es; `test:story` prüft, dass es aktuell ist). **Fehlende Dateien** meldet `story check` (Sprechdateien als Hinweis, Effekte/Musik als Fehler) und `console.warn` beim Laden – das Video wird dann an dieser Stelle stumm.
- **Kulisse `city_street`** (`src/world/City.tsx`): Straße entlang z, Fahrbahn x ±4, Gehwege |x| 4…7 (Figuren dort y = 0), Häuser mit Fenstern (ein InstancedMesh), Schaufenstern, Markisen, Laternen (vier mit echtem Licht), Bäume, Autos, Zebrastreifen bei z = 6, Skyline; Tiefe über `light.fog`. Parameter: `building, road, sidewalk, accent, lamps, cars, trees, windows (0–1), seed`.
- Nachweis: `MondsplitterYaml` und `Main` stimmen in 11 Standbildern (u. a. Untertitel, Namensschild, Endkarte, Cut-Flash-Frames) auf ≤ 0,09/255 überein; `Main` selbst ist vor/nach dem Umbau der Untertitel identisch. Beispiele: `docs/step2/etappe3_*.png`.
- Test-Geschichte: `stories/demo-stadtgeschichte.yaml` (person + room + city_street, 5 Zeilen, ≈ 14 s). Die Sprechdateien `vo_s01…s05.wav` entstehen mit `story voice` (Schritt 3).

### Etappe 2: Kamera-Presets, Rig `person`, Kulissen, Aussehen
**Kamera-Presets** (`camera.shots[]`, dürfen mit `keys`/`orbits` gemischt werden; Details und Vorgaben je Preset: `CAMERA_PRESETS` in `src/story/registry.ts`, Umsetzung `src/story/presets.ts`):
```yaml
camera:
  shots:
    - {preset: over_shoulder, subject: a, target: {rel: k}, from: 0, to: 2s}          # a = Vordergrund, Blick auf k
    - {preset: whip_to, target: {rel: k, off: [0,1.9,0]}, look_from: {rel: a, off: [0,1.9,0]}, at: 2.4s, duration: 7f, from: 1.8s, to: scene.end}
```
`push_in`, `orbit_in`, `whip_to`, `over_shoulder`, `crane_down`, `track_behind`, `dolly_zoom` (Bildgröße bleibt exakt konstant), `handheld` (fügt Wackeln hinzu). Positionen bleiben Verweise und folgen bewegten Figuren;
`over_shoulder`/`track_behind` rechnen `offset` in den Achsen der Figur (z + = vorn, x + = links der Figur). `transition: cut` (Vorgabe) oder `blend` zum vorigen Shot. Pflichtfelder prüft `check`.
**Kreisfahrten** (`orbits`): `center` und `look` dürfen jetzt `{rel: …}`/`{obj: …}` sein; feste Koordinaten rechnen exakt wie vorher.
**Rig `person`** (`src/world/Person.tsx`): dieselben Gelenke/Posen/Gesichter wie Finn (+ `sit`, `wave`, Gesicht `angry`), Gegenstände `phone`/`cup` (heben den rechten Arm).
**Aussehen** `cast.<id>.look`, geprüft gegen `RIGS[rig].looks`: person → `skin, hair, hairStyle(short|long|bald), eyes, shirt, pants, shoes, coat, apron, hat, glasses`; finn → `skin, hair, tunic, scarf, pants, boots`. Ohne `look` bleibt Finn exakt wie im Original.
**Kulissen:** `empty_stage` (Bodenplatte mit Raster, Hintergrund über `environment: {type: gradient, colors}`), `room` (Küche/Wohnraum, Tisch, Stühle bei x = ±1 – Sitzende: `at: [±1, 0, -0.45]`, `yaw: pi`, `pose: sit`).
Test: `stories/demo-etappe2.yaml` (stumm, Composition `Etappe2Test`), Standbilder: `node scripts/comp-stills.mjs Etappe2Test <ordner> <frame>…`, Beispiel `docs/step2/etappe2_standbilder.png`.

## Schritt 3: automatische Spracherzeugung (`story voice`)
```bash
npm run tts:setup                                   # einmalig: tts/.venv, piper-tts + numpy + onnx, Modell de_DE-thorsten-medium (CC0, GitHub-Release von sherpa-onnx)
npm run story -- voice stories/<datei>.yaml --check # zeigt je Zeile: aktuell / aus Cache / neu erzeugen + fehlende Voraussetzungen (erzeugt nichts)
npm run story -- voice stories/<datei>.yaml         # erzeugt nur geänderte/fehlende Zeilen
npm run story -- voice <datei> --force --line s03   # eine Zeile erzwingen
```
- **Stimmenprofil** (`voices.<id>`): `model` (Piper-Modell in `tts/models/<name>/` oder `tts/models/vits-piper-<name>/`), `lengthScale` (Tempo), `noiseScale`, `noiseW`, `sentenceGap`, `loudness` (Ziel-LUFS, zweistufige Messung), `effect {pitch, lowpassHz, eq, echo}` (Tonhöhe ändert die Dauer nicht). Die Figur wählt ihre Stimme über `cast.<id>.voice`, die Zeile über `who`.
- **Ausgabe:** `public/audio/vo_<zeilen-id>.wav` (44,1 kHz mono), `src/story/voices/<story-id>.json` (Dauer, **echte Wort-Timings**, Mund-Hüllkurve je Videoframe) und automatisch `src/story/audioManifest.json`.
- **Wort-Timings** kommen aus den Phonem-Ausrichtungen des Piper-Modells (Samples je Phonem; Wortgrenzen = Leerzeichen-Phoneme; Satzzeichen-Pausen zählen nicht zum Wort) und werden auf die fertige Datei umgerechnet (`timingMode: aligned`). Passt die Wortzahl nicht (z. B. Ziffern), fällt der Worker auf Schätzung zurück (`proportional`) und meldet es.
- **Cache:** Prüfsumme je Zeile aus Text (gesprochene Form), kompletter Stimmenprofil, Pipeline-Version, FPS. Unverändert → nichts passiert; frühere Fassung vorhanden (`tts/cache/`, nicht im Repo) → „aus Cache“; sonst neu. Piper ist nicht deterministisch (Dauer schwankt leicht von Lauf zu Lauf) – deshalb nur bei Änderung neu erzeugen. Dateiänderungen von Hand werden über die Datei-Prüfsumme erkannt.
- **`pronunciations`:** ersetzt ganze Wörter nur für die Sprache (`KI: "Ka I"`), Untertitel behalten den Originaltext; das Timing bleibt pro Originalwort.
- **Fehlende Voraussetzungen** (Python-Umgebung, Pakete, Modell, ffmpeg): es wird **nichts** erzeugt, kein stummer Platzhalter; Ausgabe listet genau, was fehlt (Exit 2). Der Renderer (`buildTimeline(story, legacy, voices)`) nutzt `voices/<id>.json` automatisch, solange der Text der Zeile unverändert ist; `story check` rechnet die Länge damit.
- Mondsplitter bleibt bei seiner alten Pipeline (`tts/synth.py`, `src/story/timeline.json`) und wird von `story voice` nicht angefasst.

## Noch NICHT umgesetzt
| Schritt | Inhalt |
|---|---|
| **2** (Etappe 1–3 ✅, Rest offen) | `<StoryScene>`: YAML → 3D-Szene (Aktoren, Objekte, Kamera aus keys/orbits/shake, Anker auflösen, Verläufe/Posen-Keyframes, `rel`-Verweise), Kamera-Presets (`camera.preset`), `look` (Aussehen), Rig `person`, Kulissen `room`/`city_street`/`empty_stage`, Overlays/Captions/Subtitles/Cut-Flash aus der Config |
| **3** ✅ | Stimmenprofile → TTS, Cache, `pronunciations`, Befehl `voice` (siehe oben). Offen: Mondsplitter bewusst nicht migriert (`synth.py`/`redo_dragon.py` bleiben), Whisper-Gegenprobe (`tts/verify.py`) nicht an die YAML angebunden |
| **4** | Schnelle Vorschau (270×480, 15 FPS), Szenen-Vorschau, Kontaktbogen, Befehl `preview` |
| **5** | Freigabe-Schranke (`approved.json` mit Hash der Story-Datei), Teil-Rendering/Zusammenfügen, Befehl `render` |

Bis Schritt 2 wird die YAML **nicht** zum Rendern benutzt; gerendert wird weiter mit dem Referenzcode (`src/scenes/Scenes.tsx`), der unverändert bleibt.

## Migration Mondsplitter: Zuordnung und bewusste Abweichungen
| Alt | Neu |
|---|---|
| `story/script.json` (Szenen, Zeilen, pre/post) | `scenes[].lines`, `timing`; Sprecher `narrator`/`dragon` → `cast.finn`/`cast.lumi` mit `voice` |
| `synth.py` Parameter, `redo_dragon.py` | `voices.narrator`, `voices.dragon` (Drache = zuletzt gerenderte Fassung: Tonhöhe 0.9) |
| `Scenes.tsx` Kamera-Keyframes | `camera.keys`/`orbits`/`shake` (Frames als `"Nf"`, Zeilenbezüge als Anker) |
| `Scenes.tsx` Posen/Gesichter/Props | `actors[].pose/face/prop` als Keyframes |
| `Scenes.tsx` Kulisse, Himmel, Licht | `set`, `environment`, `light` (alle Zahlenwerte übernommen) |
| `Scenes.tsx` Splitter, Augen, Staub, Boden … | `objects[]` |
| `Main.tsx` SFX, Musik, Ducking | `scenes[].sfx`, `audio.music` |
| `Overlays.tsx` Serien-Tag, Namensschild, Endkarte, Flash | `overlays.seriesTag`, `captions`, `transitions.cutFlash` |
| `Subtitles.tsx` Häppchen-Regeln | `subtitles` (maxWords 3, maxChars 24 …) |

**Vereinfachungen / nicht (vollständig) im Schema – bleiben bis Schritt 2 Code-Konstanten:**
1. *Splitter in der Wendung*: Im Original überlagern sich Aufstieg (28–118 f) und Anfangsbewegung (8–36 f). Im YAML ist es **ein** Pfad (8 f → 36 f → 118 f); Abweichung nur im Überlappungszeitraum (~0,27 s), visuell gleichwertig.
2. *Figuren-Aussehen* (Kostümfarben, Frisur) und *Objekt-Feinheiten* (Größe/Farbe der dunklen Silhouette hinter den Augen, Lichtstärken der Objekte) sind noch Konstanten im Code; `look` ist im Schema vorhanden, wird aber erst in Schritt 2 gelesen.
3. *Optik der Einblendungen* (Schriftgrößen, Konturen, Farben von Untertitel/Namensschild/Endkarte, Vignette) ist nicht konfigurierbar, nur Inhalt und Zeitpunkte.
4. *Pose-Parameter `swingK`* (Fortschritt des Schwerthiebs) ergibt sich in Schritt 2 aus dem Keyframe-Verlauf `sword → swing`.
5. `eyes.at` (z = -26.475) ist die Endposition der laufenden Finn-Figur minus 11,5 – im Original dynamisch berechnet, hier als fester Wert (identisch, weil Finn dann steht).
6. Laufweg Finn im Wald: `z = -14.975` ist der Endwert bei `l04.end+4f` mit der aktuellen Timeline; ändert sich die Zeilenlänge, ändert sich nur die Laufgeschwindigkeit.

## Neue Geschichte / neuer Baustein
1. Neue Datei `stories/<name>.yaml` (Mondsplitter kopieren, `check` ausführen).
2. Neue Figur/Kulisse/Objekt: Eintrag in `src/story/registry.ts` (Status `planned`, bis die Komponente existiert) + Komponente in `src/world/`.
3. Neue Sounds: `.wav` nach `public/audio/` (oder `tts/sfx.py` erweitern) – `check` kennt sie automatisch.
