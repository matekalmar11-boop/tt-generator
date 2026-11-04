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

## Schritt 4: schnelle Vorschau (`story preview`)
```bash
# Vorschau 360×640 @ 15 FPS mit Sprache, Untertiteln, Einblendungen, Musik und Effekten (gleiche Composition „StoryAny“ wie das finale Video)
npm run story -- preview stories/demo-stadtgeschichte.yaml                      # ganze Geschichte → out/preview/<story-id>.mp4
npm run story -- preview stories/demo-stadtgeschichte.yaml --scene kueche       # eine (oder mehrere: a,b) Szene(n)
npm run story -- preview stories/demo-stadtgeschichte.yaml --scene strasse --from 0.5s --to 3s   # Abschnitt (mit --scene relativ zur Szene, sonst zum Film; "90f" = Frames)
npm run story -- preview <datei> --size 270 --fps 15 --out out/x.mp4 --no-cache --concurrency 1 --crf 28 --jpeg-quality 70

# finales Rendering: siehe „Schritt 5“ (Freigabe → Export); `--props` schreibt nur die Props, rendert nichts
npm run story -- preview <datei> --props out/props.json
```
**Was die Vorschau vom finalen Video unterscheidet:** nur Auflösung (360×640 statt 1080×1920), Bildrate (15 statt 30 FPS), H.264-CRF 28 statt 20 und JPEG-Zwischenbilder 70 statt 80. Szenen, Kamera, Licht, Schatten, Kantenglättung, Untertitel, Einblendungen und Audio sind dieselben; der Zeitmaßstab (`src/story/timescale.tsx`) sorgt dafür, dass bei 15 FPS alle Animationen, Wort-Timings und Federn exakt zur selben Zeit passieren (geprüft: `node scripts/check-timescale.mjs`, Bild 15 FPS ↔ 30 FPS: Abweichung 0,000/255). Für das finale Video gilt Maßstab 1 – Ausgabe unverändert (Vollauflösungs-Standbilder `Main` ↔ YAML-Video identisch).

**Zwischenspeicher (tatsächlich zeitsparend):** (1) Szenen werden einzeln gerendert und unter `out/preview-cache/<Schlüssel>.mp4` abgelegt; Schlüssel = Szeneninhalt, Zeitleiste, globale Einstellungen, Sprach-/Effekt-/Musikdateien, Code (`src/`, Konfiguration, Lockfile) und Vorschau-Einstellungen. Geänderte Szenen werden neu gerendert, alle anderen kosten 0 s; danach werden die Stücke wie beim finalen Export zusammengefügt (`tools/assemble.ts`: Video unverändert, Ton auf exakt Bilder/FPS gekürzt und einmal kodiert). Der Ton einer Zeile beginnt in der Vorschau auf das 15-FPS-Raster gerundet (bis ±33 ms); im finalen Export auf das 30-FPS-Raster. Wird der Text einer Zeile geändert, verschieben sich nachfolgende Szenen in der Zeit (Musikposition) und werden ebenfalls neu gerendert. (2) Das Webpack-Bundle wird je Code-Stand unter `out/bundle-cache/` wiederverwendet. Nicht im Repo (`out/` ist ignoriert).

### Gemessene Renderzeiten (4 Kerne, 16 GB, Software-WebGL „swangle“, Stadtgeschichte, Szene „strasse“ = Straßenschlucht, die teuerste Szene)
| Konfiguration | Bilder | Zeit | pro Bild |
|---|---|---|---|
| **final** 1080×1920 @ 30 FPS, 4 Tabs (bisherige Einstellung) | 60 (2 s) | 80,4 s | 1341 ms |
| final, 1 Tab | 60 | 64,6 s | 1077 ms |
| Vorschau 360×640 @ 15, vor dem Auflösungs-Fix (s. u.), 1 Tab | 30 (2 s) | 32,2 s | 1073 ms |
| **Vorschau 360×640 @ 15**, 1 Tab (Standard) | 30 | 10,4 s | 346 ms |
| Vorschau 270×480 @ 15 | 30 | 9,1 s | 304 ms |
| Vorschau 360×640, 60 Bilder: 1 / 2 / 3 / 4 Tabs | 60 | 16,9 / 20,7 / 21,6 / 22,7 s | – |

Ganze Stadtgeschichte (3 Szenen, 12,5 s Film, 187 Bilder): kalt 51,2 s · nichts geändert 0,6 s · Endkarte der letzten Szene geändert 17,7 s (nur diese Szene neu). Die Zeiten enthalten je Tab/Szene ca. 2–3 s Anlaufzeit (Shader-Kompilierung). Die Zeit für ein **finales** Gesamtvideo wurde nicht gemessen (kein vollständiges Rendering); Hochrechnung aus 1,08 s/Bild: etwa 6–7 Minuten für die 374 Bilder der Stadtgeschichte, der 44-s-Mondsplitter mit 1323 Bildern läge bei gleicher Szenenlast bei ca. 24 Minuten – das ist eine Hochrechnung, keine Messung.

### Engpässe (gemessen)
1. **3D-Fläche rechnete in der Vorschau weiter in voller Auflösung.** React-Three-Fiber begrenzt die Pixeldichte auf mindestens 1; bei Remotion-`scale` < 1 wurde die 3D-Szene deshalb in 1080×1920 berechnet und nur verkleinert (Zeit pro Bild 1073 ms bei 360×640 – praktisch wie in Vollauflösung 1341/1077 ms). Fix in `StoryVideo`: `dpr = [min(1, devicePixelRatio), 2]` → 346 ms. Bei Maßstab 1 und im Studio unverändert.
2. **Mehrere Browser-Tabs bringen nichts, sondern kosten:** Der Software-Renderer (SwiftShader) nutzt schon in einem Tab alle Kerne; 4 Tabs = 4 × Anlaufzeit + Konkurrenz (final: 80,4 s statt 64,6 s; Vorschau: 22,7 s statt 16,9 s). Standard daher 1 Tab (`--concurrency`). Der alte Befehl `npm run render` (Mondsplitter, 4 Tabs) wurde nicht geändert – eine Messung mit 1 Tab dort steht aus.
3. **Szenenkomplexität (Zeichenaufrufe, Lichter):** Bühne + 2 Personen ≈ 0,32 s/Bild, Küche ≈ 0,58 s, Straße ≈ 1,07 s (vor dem Fix gemessen, je 30 Bilder inkl. Anlauf). Die Straße hat ~500 einzelne Blöcke und 4 Punktlichter; das Zusammenfassen statischer Blöcke wäre der nächste Hebel (nicht umgesetzt, Bildinhalt müsste identisch bleiben).
4. Nicht ursächlich: Kodieren (0,2 s je 30 Bilder), Bundle (2–6 s mit Webpack-Cache), Schatten und Kantenglättung (Test „ohne beides“: nur −7 % → nicht eingebaut), andere GL-Backends (`swiftshader`, `angle`) liefern in dieser Umgebung keinen WebGL-Kontext.

## Schritt 5: finaler Export mit Freigabe
**Ablauf in vier Befehlen**
```bash
npm run story -- check stories/x.yaml                  # 1. Konfiguration prüfen (Fehler/Hinweise)
npm run story -- voice stories/x.yaml                  #    Sprache erzeugen (falls Zeilen neu/geändert)
npm run story -- preview stories/x.yaml                # 2. Vorschau ansehen (out/preview/x.mp4)
npm run story -- approve stories/x.yaml                # 3. zeigt Zusammenfassung + Inhalts-Prüfsumme, schreibt noch nichts
npm run story -- approve stories/x.yaml --confirm 1a2b3c4d [--by Name] [--note Text]   #    ausdrücklich freigeben
npm run story -- render stories/x.yaml                 # 4. finaler Export → out/final/x.mp4 (1080×1920, 30 FPS, H.264 CRF 20 + AAC 192 kb/s)
npm run story -- approval stories/x.yaml               #    Status: gültig / ungültig (+ Grund) / fehlt
npm run story -- revoke stories/x.yaml                 #    Freigabe zurückziehen
npm run story -- render stories/x.yaml --only kueche,ende   # Teilrendering: nur diese Szenen in den Cache (kein Gesamtvideo)
npm run story -- render stories/x.yaml --force         # Gesamtvideo neu zusammenfügen / Szenen neu rendern
```
**Freigabe-Schranke:** `render` startet ohne gültige Freigabe nichts (Exit-Code 4, kein Browser, kein Bundle). Die Freigabe `approvals/<story-id>.json` enthält eine Prüfsumme über (a) die geparste YAML mit allen Standardwerten, (b) die Zeitleiste inkl. Wort-Timings, (c) die SHA-256 aller benutzten Audiodateien (Sprache, Effekte, Musik), (d) eine Prüfsumme des Renderer-Codes (`src/`, `remotion.config.ts`, `package-lock.json`). Jede Änderung daran – auch eine neu erzeugte oder ausgetauschte Sprachdatei – macht sie ungültig; der Befehl nennt den Grund. Kommentare/Leerzeichen in der YAML ändern nichts. Auch eine Änderung des Renderer-Codes macht die Freigabe ungültig (das Video könnte anders aussehen); danach neu freigeben. Grenzen: Die Schranke ist eine Verfahrensschranke im Werkzeug – wer direkt `remotion render` aufruft oder `approvals/` von Hand fälscht, umgeht sie; deshalb die Regel in `CLAUDE.md`, dass Agenten nie selbst freigeben oder final rendern.

**Prüfungen vor Freigabe und Export (`preflight`):** Datei vorhanden und lesbar · Schema/Querprüfungen ohne Fehler · Format 1080×1920 @ 30 FPS · jede Sprech-, Effekt- und Musikdatei vorhanden (mit Hinweis, wie sie entsteht) · Sprache passt zu Text/Stimmenprofil · echte Wort-Timings (keine geschätzten) · ffmpeg/ffprobe vorhanden. Jede Meldung nennt Datei/Zeile und den Befehl zur Behebung.

**Teilrendering und Wiederverwendung:** Jede Szene wird einzeln in finaler Qualität gerendert (`out/final-cache/<Schlüssel>.mp4`, nicht im Repo). Schlüssel = Szeneninhalt, Zeitleiste, globale Einstellungen, Audiodateien, Code, Einstellungen – wie bei der Vorschau (`sceneKey`). Unveränderte Szenen werden wiederverwendet, ein unterbrochener Export setzt bei der nächsten Szene fort (Stücke werden atomar geschrieben und auf Bildzahl geprüft). Ändert sich der Text einer Zeile, verschieben sich nachfolgende Szenen (Musikposition) und werden neu gerendert – das ist so gewollt, weil sonst der Ton nicht stimmte.

**Zusammenfügen (Bild und Ton synchron):** Das Video der Stücke wird unverändert (ohne Neu-Kodierung) aneinandergehängt – vorher wird bei jedem Stück der Ton entfernt, sonst addiert ffmpeg die längere Containerdauer inkl. Ton und erzeugt Lücken (so im Technik-Test aufgefallen). Der Ton jedes Stücks wird auf exakt Bilder/30 s gekürzt bzw. aufgefüllt (verhindert Drift durch AAC-Blockgrenzen), zu einer Spur verbunden und einmal AAC-kodiert. Sprache, Musik (mit Absenkung), Effekte und Untertitel/Einblendungen stammen aus derselben Composition wie die Vorschau. Danach prüft der Export die Datei (H.264/AAC, Auflösung, Bildzahl, 30 FPS, Ton- vs. Bildlänge ≤ 0,05 s) und veröffentlicht sie nur, wenn alles stimmt; daneben liegt `x.json` mit Freigabe-Prüfsumme und Szenenschlüsseln (ist alles unverändert, meldet `render` „bereits aktuell“).

**Technik-Test ohne finales Video:** `--test-scale 0.25` rendert dieselbe Kette verkleinert (270×480) nach `out/final/<id>-TEST.mp4` mit eigenem Cache; die Freigabe wird trotzdem verlangt. Beispiel-Fixture: `stories/_test-export.yaml`.

## Noch NICHT umgesetzt
| Schritt | Inhalt |
|---|---|
| **2** (Etappe 1–3 ✅, Rest offen) | `<StoryScene>`: YAML → 3D-Szene (Aktoren, Objekte, Kamera aus keys/orbits/shake, Anker auflösen, Verläufe/Posen-Keyframes, `rel`-Verweise), Kamera-Presets (`camera.preset`), `look` (Aussehen), Rig `person`, Kulissen `room`/`city_street`/`empty_stage`, Overlays/Captions/Subtitles/Cut-Flash aus der Config |
| **3** ✅ | Stimmenprofile → TTS, Cache, `pronunciations`, Befehl `voice` (siehe oben). Offen: Mondsplitter bewusst nicht migriert (`synth.py`/`redo_dragon.py` bleiben), Whisper-Gegenprobe (`tts/verify.py`) nicht an die YAML angebunden |
| **4** ✅ | Schnelle Vorschau, Szenen-/Abschnitts-Vorschau, Cache, Messwerte (siehe oben). Offen: Kontaktbogen, Hebel „statische Blöcke zusammenfassen“ |
| **5** ✅ | Freigabe-Schranke, Inhaltsbindung, Teilrendering/Zusammenfügen, Befehl `render` (siehe oben). Nicht in voller Größe 1080×1920 getestet (nur `--test-scale`) |

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
