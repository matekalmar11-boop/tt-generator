# Film-Erklärtest „Die Truman Show“ – Gesamtplan

Stand: Meilenstein **M1 fertig (Vorschau zur Bewertung)**. M2 und M3 sind **nicht freigegeben** und nicht begonnen.
Es gibt keine Exportfreigabe (`approvals/` leer); es wurde nichts in 1080p gerendert.

## 1. Vorgaben (freigegeben)

- Eigenständig kommentierte, stilisierte 3D-Zusammenfassung (ca. 45 s), deutscher Erzähler (Piper, Thorsten, offline), keine Figurendialoge.
- Name „Truman“ wird verwendet. Hauptfigur **gelbes Oberteil, dunkle Hose** in jeder Einstellung (Rig `person2`).
- Keine Originalclips, kein Originalton, keine nachgebauten Originalfiguren/-orte; alles aus eigenen Blöcken, eigene synthetische Sounds (`tts/sfx_truman.py`).
- Fünf Abschnitte: 1 künstliche Welt · 2 erste Verdachtsmomente · 3 Regiezentrale · 4 Flucht auf dem Meer · 5 Ausgang.
- Jede Aussage hat ein verständliches Bild; Hook in den ersten 2 s; Shotliste von 26 auf **17** reduziert.

## 2. Sprecher-Skript (Gesamtfassung, Entwurf)

| Abschnitt | Text |
|---|---|
| 1 | „Stell dir vor, dein ganzes Leben wird live im Fernsehen gezeigt. **Truman ahnt nichts. Überall hängen versteckte Kameras.**“ (M1) |
| 2 | „**Doch dann fällt ein Scheinwerfer vom Himmel.**“ (M1) „Und es regnet nur auf ihn. Alle beobachten ihn.“ |
| 3 | „Hinter dem Himmel sitzt die Regie. Ein Regisseur steuert Sonne, Wetter und sogar Trumans Freunde. Millionen sehen zu.“ |
| 4 | „Truman will fliehen. Er steigt in ein Boot, doch der Regisseur schickt einen Sturm. Er segelt trotzdem weiter.“ |
| 5 | „Da stößt sein Boot gegen die Himmelswand. Eine Tür öffnet sich. Truman verbeugt sich – und tritt hinaus in die echte Welt.“ |

Gemessene Sprechzeit M1: t01 3,30 s · t02 3,07 s · t03 1,88 s (Piper, `lengthScale 0.97`). Die Stimme ist schneller als die Schätzung (~18 Zeichen/s); Gesamtlänge der Fassung daher eher ~40–44 s, bei Bedarf durch Pausen/Reaktionsbilder auf ~45 s.

## 3. Shotliste (17 Einstellungen)

M1 = Einstellungen 1–8 (umgesetzt, in 3 Szenen: `hook`, `kameras`, `licht`).

| # | Abschnitt | Gesagt | Bild / Kamera | Status |
|---|---|---|---|---|
| 1 | 1 | „Stell dir vor …“ | **Kamerasucher-Sicht** (REC, LIVE, Zuschauerzähler 2,3→3,4 Mio.) auf Truman, der auf die Linse zugeht | M1 ✔ |
| 2 | 1 | „… live im Fernsehen gezeigt.“ | Schnitt: Blick über die Hecke mit versteckter Kamera auf Truman, Namensschild „TRUMAN – ahnt nichts“ | M1 ✔ |
| 3 | 1 | „Truman ahnt nichts. Überall …“ | Straßenüberblick: Truman + 3 Kameras (Laterne, Briefkasten, Hecke), Marker „KAMERA“ erscheinen nacheinander | M1 ✔ |
| 4 | 1 | „… hängen versteckte Kameras.“ | Nahaufnahme Kamera, Linse folgt Truman, Marker „KAMERA“ | M1 ✔ |
| 5 | 2 | „Doch dann fällt …“ | Truman bleibt stehen, besorgter Blick (Halbnah, Dreiviertel) | M1 ✔ (schaut nicht sichtbar nach oben, s. Abschnitt 6) |
| 6 | 2 | „… ein Scheinwerfer vom Himmel.“ | Froschperspektive: Kunsthimmel (aufgemalte Wolken, Träger, Luke), Scheinwerfer stürzt, Marker „KUNSTHIMMEL“ | M1 ✔ |
| 7 | 2 | (Einschlag) | Scheinwerfer schlägt vor Truman ein, Funken, Krach-SFX | M1 ✔ |
| 8 | 2 | (Reaktion) | Nahaufnahme Truman, Schock (Mund offen, Hände vor der Brust) | M1 ✔ |
| 9 | 2 | „Und es regnet nur auf ihn.“ | Totale: kleine Regenwolke folgt nur Truman, Nachbarn daneben trocken | M2 |
| 10 | 2 | „Alle beobachten ihn.“ | `orbit_in` um Truman, 4–5 Nachbarn starren ihn an | M2 |
| 11 | 3 | „Hinter dem Himmel sitzt die Regie.“ | Himmelswand klappt auf → Leitstand mit Monitorwand (Truman auf jedem Monitor) | M2 |
| 12 | 3 | „… steuert Sonne, Wetter und Trumans Freunde. Millionen sehen zu.“ | Regisseur am Pult (Regler/Mikro), Schnitte auf Sonne/Wolken/Freund; Pull-back mit Zähler „MILLIONEN“ (2 Inserts) | M2 |
| 13 | 4 | „Truman will fliehen.“ | Steg + Boot, Blick zurück, Seil lösen | M3 |
| 14 | 4 | „… Boot, doch der Regisseur schickt einen Sturm.“ | Boot gleitet raus; Insert roter Hebel; Sturm/Blitz/Wellen | M3 |
| 15 | 4 | „Er segelt trotzdem weiter.“ | Nahaufnahme Truman am Ruder, entschlossen | M3 |
| 16 | 5 | „Da stößt sein Boot gegen die Himmelswand. Eine Tür öffnet sich.“ | Totale: Boot stößt an Wand, Treppe, Klinke senkt sich, Licht unter der Tür (`door_handle`) | M3 |
| 17 | 5 | „Truman verbeugt sich – und tritt hinaus.“ | Verbeugung frontal, Schritt ins weiße Licht, Endkarte | M3 |

## 4. Kulissen und Requisiten

| Baustein | Status |
|---|---|
| `city_street` (Straße, Häuser, Markisen) | vorhanden; für M1 genutzt mit `lamps:false`, `trees:false`, teils `cars:false` (siehe Lehren) |
| `hidden_camera` (versteckte Kamera: Hecke/Laterne/Briefkasten, REC-LED, Linse folgt Ziel) | **neu in M1** (`src/world/Props.tsx`) |
| `stage_light` (Scheinwerfer am Kabel, Sturzbahn, Taumeln) | **neu in M1** |
| `sky_panel` (Kunsthimmel mit Wolken, Trägern, Luke) | **neu in M1** (einfache Platte, noch kein geschlossener Dome) |
| Overlay `camera_view` (Sucher, REC, LIVE, Zähler), `callout` (Ring + Etikett) | **neu in M1** (`StoryOverlays.tsx`, Schema) |
| Dome/Himmelswand mit Tür und Riss, Wetter (Regen, Regenwolke, Sturm, Blitz), Leitstand + Monitore + Regler, Wasser + Boot + Steg, Treppe | **fehlen** (M2/M3) |

Bausteinplan M2/M3 (unverändert): `dome_wall`, `weather`, `control_room` (+`monitor`, `lever`, `slider`), `water` + `boat` + Steg, `stairs`; Überblick und Reihenfolge wie im Planentwurf.

## 5. Meilenstein M1 – Ergebnis

- Story-YAML: `stories/truman-show-m1.yaml` (3 Szenen, 12,8 s). Stimmen: `public/audio/vo_t01..t03.wav`, Timing `src/story/voices/truman-show-m1.json`.
- Neue Sounds (eigene Synthese): `rec_beep, live_sting, cam_servo, cable_snap, fall_whistle, light_crash, music_show` (Generator `tts/sfx_truman.py`).
- **Vorschau:** `docs/previews/truman-show-m1-vorschau-v1.mp4` (360×640, 15 FPS, 12,80 s, H.264 + AAC; SHA-256 `c18b903a…cfe1e`). **Nicht freigegeben, nur zur Bewertung.**
- **Kontaktbogen:** `docs/plans/truman-show-m1-kontaktbogen.jpg` (13 Bilder aus der Vorschau).
- Neu erzeugen: `npm install && npm run story -- preview stories/truman-show-m1.yaml --out out/m1/vorschau.mp4` (Sprach-WAVs und Sounds sind eingecheckt).

### Gemessene Renderzeiten (4 Kerne, Software-WebGL, 360×640 @ 15 FPS)

| Szene | Dauer | Renderzeit | ms/Bild |
|---|---|---|---|
| hook | 4,07 s (61 Bilder) | 17,9 s | 293 |
| kameras | 3,67 s (55 Bilder) | 15,9 s | 289 |
| licht | 5,07 s (76 Bilder) | 19,3 s | 254 |
| **Gesamt** | 12,80 s (192 Bilder) | **56,2 s** (inkl. Zusammenfügen 1,8 s; Bundle war im Cache) | – |

Ein Standbild kostet ca. 20–25 s inkl. Browserstart. Frühere Messwerte (erste Läufe vor den Korrekturen): 261/253/222 ms/Bild, 49,8 s gesamt; die Zunahme kommt von den zusätzlichen Nebenfiguren.

### Technische Prüfung der Vorschau

- ffprobe: H.264 360×640, 15 FPS, 192 Bilder, 12,80 s; AAC-Spur ebenfalls 12,80 s.
- Lautheit: −13,9 LUFS (integriert), Spitze −1,5 dBFS.
- `npx tsc --noEmit`, `npm run test:story`, `story check` (M1 und `nachricht-von-morgen`) bestanden. Mondsplitter-Dateien und alte Rigs unverändert (Änderungen an Schema/StoryScene/Overlays sind rein additiv).
- **Nicht geprüft:** Der Ton wurde nur messtechnisch geprüft, nicht abgehört (Stimmklang, SFX-Lautstärke gegenüber Musik, Sync des Einschlags). Das Bild wurde über Standbilder/Kontaktbogen geprüft, nicht als Bewegtbild angesehen.

## 6. Bekannte Schwächen von M1 (ehrlich)

1. Beim Wort „fällt“ blickt Truman nicht sichtbar nach oben (person2 hat nur horizontalen Blick); die Reaktion wird über Gesicht „besorgt“ und den Schnitt auf den Himmel erzählt.
2. „Fernsehen“ wird nur über LIVE-Abzeichen/Zähler gezeigt, es gibt noch kein TV-Bild oder Publikum (kommt in M2 mit Leitstand/Monitoren).
3. Die Hecken-Kamera ist in Einstellung 2 nur von hinten und klein zu sehen; die eindeutig erkennbaren Kameras sind Briefkasten-, Laternen- und Nahaufnahme-Kamera (Einstellungen 3–4).
4. Die Marker (`callout`) sind pixelgenau nur für feststehende Kameras; Positionen wurden von Hand aus Standbildern bestimmt.
5. Die Straße hat nur wenige Statisten (2 Nachbarn je Szene); „belebte Stadt“ ist nur angedeutet.
6. Kunsthimmel ist eine Platte, kein geschlossener Dome; er erscheint nur in der Froschperspektive.
7. Untertitel liegen im unteren Drittel (`bottomPadding 430`) und überdecken in Einstellung 3 die Straße vor Truman, nicht aber Gesichter oder Kameramarker (am Kontaktbogen geprüft).

## 7. Lehren aus M1 für M2/M3

- Die vorhandene `city_street` ist für Nahaufnahmen auf dem Gehweg hinderlich: Markisen (x 5,8–7, y ≈ 2,5), Laternen (x ±4,4) und Bäume (x ±6,4) stecken in Kamerapositionen; Autos blockieren niedrige Perspektiven. Vor jedem Shot Hindernisse prüfen (Standbild), `lamps/trees/cars` je Szene steuern.
- Unbeleuchtete Flächen (`Glow`) lesen sich bei „aufgemalten“ Dingen (Himmel, Wolken) besser als beleuchtete Blöcke.
- Figur- und Kamerakoordinaten: Truman mit `yaw: 0` blickt nach +z (zur Kamera); Figuren rechts des Weges blicken mit `yaw: −0.5π` zur Straße.
- Standbilder pro Szene (≈ 25 s) sind das wirksamste Mittel; mehrere Iterationen pro Einstellung sind einzuplanen.

## 8. Aufwand (aktualisiert)

M1 benötigte 3 Requisiten, 2 Overlays, 7 Sounds, 1 YAML und etwa 12 Standbild-Iterationen. Die Schätzung für M2 + M3 bleibt bei **ca. 9–11 Arbeitstagen** (Regen/Wolke 1, Dome/Himmelswand 1,5, Leitstand + Monitore 2, Wasser + Boot 2, Treppe/Tür 0,5, Sounds 0,5, YAML/Shots/Vorschauen 2,5); wegen der Straßen-Hindernisse eher am oberen Rand. Risiko bleibt Wasser/Sturm in Software-WebGL (früh an einem Standbild messen).

## 9. Nächste Schritte (nach Bewertung)

1. Du bewertest die M1-Vorschau; Änderungswünsche an M1 zuerst.
2. Freigabe für M2 (Regen, Beobachter, Himmelswand, Leitstand) und M3 (Meer, Sturm, Ausgang) einzeln.
3. Gesamtvorschau, danach Entscheidung über Freigabe/Export (nur auf ausdrückliche Aufforderung).
