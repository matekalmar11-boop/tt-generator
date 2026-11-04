# PlotRush – Produktionsablauf für TikTok-Erklärvideos (45–60 s)

Ziel: regelmäßig vollständige, interessante Videos veröffentlichen – ohne für jedes Video neue Generatorfunktionen zu bauen.
Grundsatz: vorhandene Bausteine und Vorlagen wiederverwenden, früh Bilder statt Videos prüfen, Rendern nur wenn Skript und Storyboard freigegeben sind.

## 1. Ablauf in sieben Schritten

| # | Schritt | Wer | Typische Zeit |
|---|---|---|---|
| 1 | **Skript + Einstellungsliste** (Hook, 10–16 Einstellungen, je Aussage ein Bild, SFX, Overlays) | Claude | 10–15 min |
| 2 | **Freigabe 1:** Skript und Liste lesen | Nutzer | 3–5 min |
| 3 | **YAML aus Vorlagen** (`stories/vorlagen.yaml` kopieren, Texte/Kamera anpassen) + Stimme (`story voice`) | Claude | 20–30 min |
| 4 | **Storyboard:** `story board <yaml>` → je Einstellung ein Standbild + Kontaktbogen | Rechner | 25–45 s für ~13 Bilder |
| 5 | **Freigabe 2:** Kontaktbogen ansehen; Korrekturen am YAML, `board` erneut (nur geänderte Szenen: `--scene a,b`) | Nutzer + Claude | 5–15 min |
| 6 | **Vorschau** (`story preview`, 360×640 @ 15 FPS, mit Ton) | Rechner | ca. 0,2–0,3 s je Bild: 60 s Film ≈ 3–4 min kalt, geänderte Szenen allein deutlich weniger |
| 7 | **Freigabe 3** (ausdrücklich, nur durch den Nutzer): `approve` → `render` (1080×1920 @ 30 FPS) | Nutzer | Export ≈ 0,6 s je Bild: 60 s ≈ 15–20 min (hochgerechnet) |

Claude führt `approve` und `render` nie selbst aus (siehe `CLAUDE.md`). Keine 1080p-Ausgabe ohne ausdrückliche Aufforderung.

## 2. Neu: `story board`

```
npm run story -- board stories/<datei>.yaml [--scene a,b] [--at 0.4] [--cols 6] [--scale 0.3333333333333333] [--out ordner]
```

- Je **Einstellung** (Abschnitt zwischen zwei harten Kamera-Schnitten: `camera.shots` mit `transition: cut` ab `from > 0`, `camera.keys` mit `cut: true`) ein Standbild bei 40 % der Einstellungslänge (`--at`); Einstellungen über 3,5 s bekommen zwei Bilder (25 % / 75 %).
- Die Bilder zeigen Untertitel, Marker und Einblendungen genau wie die Vorschau.
- Ein Browser, ein (gecachtes) Bundle: **2,3–3,2 s je Bild** statt ca. 6 s je Einzelaufruf von `story still`.
- Ausgabe in `out/board/<story-id>/`: `NN_<szene>_<sek>s.png`, `kontaktbogen.png` (beschriftet: Nummer, Szene, Zeit), `board.json`.
- Gemessen: Truman Show M1 = 8 Bilder in 26 s; Vorlagenkatalog = 13 Bilder in 30 s.
- Der Plan (welche Bilder) steckt in `src/story/boardPlan.ts` und ist im `npm run test:story` abgedeckt.

Bisher kostete die Justierschleife (Kamera raten → Standbild → ansehen) in M1 ca. 14 min je Sitzung (27 Einzelaufrufe). Mit `board` ist ein Durchlauf aller Einstellungen in unter 1 min möglich.

## 3. Neu: Vorlagenkatalog `stories/vorlagen.yaml`

Ein gültiges Story-YAML mit **13 fertigen Szenenblöcken** (Kamera + Kulisse + Licht + Figur + Overlays). Bildkatalog: `docs/plans/vorlagen-kontaktbogen.jpg`, neu erzeugen mit `npm run story -- board stories/vorlagen.yaml --cols 5`.

| Nr | Vorlage | Zweck | Status |
|---|---|---|---|
| S1 | `stadt_pov_sucher` | Hook: Sucher-Sicht (REC, LIVE, Zähler) auf die Hauptfigur | ✔ Vorschau |
| S2 | `stadt_ueber_kamera` | Blick über die versteckte Kamera, Namensschild | ✔ Vorschau |
| S3 | `stadt_ueberblick_marker` | Straße mit 3 Kameras und Markern „KAMERA“ | ✔ Vorschau |
| S4 | `objekt_nah_marker` | Nahaufnahme eines Objekts mit Marker | ✔ Vorschau |
| S5 | `stadt_held_halbnah` | Reaktionsbild, Nachbarn im Hintergrund | ✔ Vorschau |
| S6 | `himmel_objekt_faellt` | Froschperspektive Kunsthimmel, Objekt stürzt | ✔ Vorschau |
| S7 | `stadt_lauf_verfolgung` | Verfolgungsfahrt hinter rennender Figur | ✔ Standbild |
| S8 | `buehne_held_nah` | Gesichts-Nahaufnahme, Ausdruckswechsel | ✔ Standbild |
| S9 | `buehne_umzingelt` | Ring aus Kameras, Kreisfahrt, Zuschauerzähler | ✔ Standbild |
| S10 | `tuer_licht` | Figur vor Tür, Klinke senkt sich, Licht | ✔ Standbild |
| S11 | `end_winken` | Winken frontal + Endkarte | ✔ Standbild |
| S12 | `zimmer_chat` | Zimmer, Handy, Chat-Einblendung | ✔ Standbild |
| S13 | `zahlkarte` | Figur + große Zahl als Titel | ✔ Standbild |

„✔ Vorschau“ = als Bewegtbild in der Truman-Show-M1-Vorschau gesehen. „✔ Standbild“ = nur als Standbild gesehen; Bewegung (Laufen, Winken, Orbit, Tür) ist noch nicht als Video geprüft.

**Benutzung:** Szenenblock ab `- id:` bis zum nächsten `- id:` in die neue Story kopieren, `id` ändern, `lines` (Sprechzeilen) ergänzen. Ohne `lines` dauert eine Szene `timing.pre + timing.post` Sekunden. Kamera- und Markerpositionen sind für die Standardkulisse geprüft; bei geänderter Kamera/Objektposition `board` ansehen und `callout.at` anpassen.

### Bewährte Kamera- und Kulissenregeln (aus M1)

- Figur `yaw: 0` blickt nach +z (zur Kamera); Figuren rechts des Weges blicken mit `yaw: -0.5pi` zur Straße. Gehwege liegen bei |x| 4…7 (Figuren dort mit y = 0).
- `city_street`: Markisen (x 5,8–7, y ≈ 2,5), Laternen (|x| = 4,4) und Bäume (|x| = 6,4) sind Hindernisse für Kameras. Standard der Vorlagen: `lamps/trees/cars: false`; eigene Kamera-Laternen über `hidden_camera` (host `lamp`).
- Helles Tageslicht („tag“): Himmelsverlauf `#4fa8f0 / #9dd5ff / #eaf6ff`, `hemi` 1,6, `ambient` 0,5, Key 2,6 – damit gibt es keine schwarzen oder düsteren Hintergründe.
- `callout`-Ringe nur bei feststehender Kamera; Position als Prozent des Bildes.
- Unbeleuchtete Flächen (`Glow`) für aufgemalte Dinge (Himmel, Wolken); beleuchtete Blöcke werden zu dunkel.
- Hindernisse und Positionen vor jedem Dreh mit `story board` prüfen, nicht raten.
- Wortanker (`t06.word9`) zählen **ab 1** (1. Wort = `word1`); Satzzeichen wie „–“ im Text verhindern echte Wort-Timings (Meldung `proportional`) – lieber Komma/Punkt verwenden.
- Kamera-Positionen dürfen Verweise sein (`pos: {rel: truman, off: [-1.4, 2.7, 4.4]}`): die Kamera folgt der Figur; Objekte (Hecke, Mauer) nicht in der Kameraposition platzieren (schwarzes Bild).
- Fällt ein Objekt ins Bild (Scheinwerfer), Kamera mindestens 8–10 Einheiten entfernt lassen, sonst verdeckt es die Reaktion der Figur.
- Endkarten (`end_card`) liegen im oberen Mittelfeld: Kamera so führen, dass die Figur darunter steht (Zielpunkt `off` ca. 3,5 Einheiten über dem Boden).

## 4. Rhythmus-Regeln für TikTok

- Hook in den ersten 2 s (Frage, Zahl, Schock, Kamerasucher).
- 10–16 Einstellungen; im Schnitt 3–4 s, keine starre Anzahl. Keine Einstellung länger als ca. 5 s ohne neues Ereignis oder Kamerabewegung.
- Jede Aussage des Erzählers hat ein Bild (Objekt, Marker, Zahl oder Figur); keine wiederholten Einstellungen hintereinander.
- Untertitel (max. 3 Wörter) im unteren Drittel, Marker im oberen/mittleren Bild.
- Sound: Hook-Sting, ein SFX je wichtigem Ereignis, Musikbett leise mit Ducking.

## 5. FPS-Test: 15 FPS verdoppelt oder echtes 30 FPS?

Test: Vorlage `stadt_lauf_verfolgung` (Figur rennt, Kamera folgt; schlimmster Fall), 3 s, 540×960, einmal echt in 30 FPS, einmal in 15 FPS gerendert und mit FFmpeg (`fps=30`) verdoppelt. Vergleichsvideo (links verdoppelt, rechts echt): `docs/previews/fps-test-15verdoppelt-vs-30.mp4`.

| | echtes 30 FPS | 15 FPS verdoppelt |
|---|---|---|
| Bilder gerendert | 90 | 45 |
| Renderzeit (inkl. ca. 3 s Start) | 25,4 s | 14,8 s (−42 %) |
| identische Folgebilder | 0 % | 51 % |
| Bildänderung je Schritt (Ø Differenz, abwechselnd) | 7,9 gleichmäßig | 0 / 11 / 0 / 10 / 0 / 14 … |

Messung: Bei der Verdopplung ändert sich nur jedes zweite Bild; die sichtbare Schrittweite ist ca. doppelt so groß und ungleichmäßig (0, 11, 0, 10 …). Das ist das typische Ruckelmuster. **Ich konnte die Bewegung nicht selbst abspielen, nur messen**; die Beurteilung am Handy liegt beim Nutzer (A/B-Video).

**Entscheidung (laut Vorgabe): bewegte Szenen bleiben bei echtem 30 FPS.** 15 FPS + Verdopplung wird nicht eingeführt; die Ersparnis (−42 % je Szene) ist die Ruckelgefahr bei Kamerafahrten und Laufzyklen nicht wert. Möglich bliebe es später nur für Szenen mit feststehender Kamera und kleiner Bewegung (Gesichts-Nahaufnahme, Zahlkarte); dafür fehlt jede Unterstützung im Export, und es wurde **nicht** gebaut.

## 6. Bewusst nicht gebaut

- Kein Standbild-Animationssystem (Zoom/Schwenk aus Einzelbildern), keine Bildraten je Szene, keine neuen Kulissen oder Requisiten.
- Kein Include-/Template-Mechanismus im Schema: Vorlagen werden kopiert (einfach, prüfbar mit `story check`).

## 7. Messwerte-Überblick (Container: 4 Kerne, Software-WebGL, keine GPU)

| Größe | Wert |
|---|---|
| Vorschau 360p/15 FPS | 0,15 s (Bühne/Zimmer) bis 0,25 s (Stadt) je Bild, + 2,5–4 s Start je Szene |
| Export 1080p/30 FPS | ca. 0,6 s je Bild (Stichprobe 30 Bilder) |
| Standbild einzeln (`still`) | ca. 6 s, jedes weitere im gleichen Aufruf 2–3 s |
| Storyboard (`board`) | 2,3–3,2 s je Bild |
| Vorschau M1 (12,8 s) | 56 s |
| FFmpeg-Verdopplung 15→30 | ca. 1,3 s je Sekunde Film |

Ein voller 45–60-s-Lauf wurde bisher nicht gemessen (Hochrechnung aus Abschnitten).

## 8. Praxis-Messung: vollständiges 57-s-Video („Die Truman Show“)

Erster Durchlauf Skript → Storyboard → Vorschau: 13 Szenen, 849 Bilder, **212 s Vorschau-Renderzeit** (cold), Nachbesserungen einzelner Szenen 20–38 s. Storyboard mit `story board` 22 Bilder in 48 s. Details: `docs/plans/truman-show-video.md`.
