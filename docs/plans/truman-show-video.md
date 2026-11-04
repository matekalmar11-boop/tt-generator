# „Die Truman Show kurz erklärt“ – Skript und Storyboard

Status: **Vorschau v1 (360×640 @ 15 FPS, mit Ton) erstellt, zur Bewertung. NICHT freigegeben; kein 1080p, keine Exportfreigabe.**
Dateien: `stories/truman-show.yaml` (Story), Stimme `public/audio/vo_v01…v10.wav` (Piper, offline erzeugt, noch nicht abgehört), Storyboard `docs/plans/truman-show-storyboard.jpg` (erste Fassung, vor der Korrektur der Bootsfahrt), Vorschau `docs/previews/truman-show-vorschau-v1.mp4`, Kontaktbogen der Vorschau `docs/plans/truman-show-vorschau-kontaktbogen.jpg`.
Eigenständig stilisiert: kein Originalmaterial, kein Originalton, keine nachgebauten Originalfiguren. Hauptfigur Truman: gelbes Oberteil, dunkle Hose in jeder Einstellung. Alle 3D-Bausteine existieren bereits (`stories/vorlagen.yaml`, M1); für die Korrektur der Bootsfahrt und des Ausgangs kamen drei kleine Ergänzungen dazu (siehe Abschnitt 4).

## 1. Länge und Aufbau

| Wert | Zahl |
|---|---|
| Gesamtlänge (Vorschau, ffprobe) | **56,6 s** (Ziel 45–60 s) |
| Szenen / Einstellungen | 13 / ca. 19 |
| Sprechzeilen | 14, ein Erzähler (Thorsten, Piper) |
| Bilder (15 FPS) | 849 |

## 2. Sprecher-Skript und Einstellungen (aktuelle Fassung)

| Zeit (ca.) | Szene | Erzähler | Bild und Kamera | Overlay / Ton |
|---|---|---|---|---|
| 0–2,2 | **hook** E1 | „Stell dir vor, dein ganzes Leben wird live im Fernsehen gezeigt.“ | Kamerasucher-Sicht auf Truman, der auf die versteckte Kamera zugeht | REC, LIVE, Zähler; `live_sting`, `rec_beep` |
| 2,2–4,0 | hook E2 | | Blick über die Hecken-Kamera auf Truman | Namensschild TRUMAN – „ahnt nichts“; `cam_servo` |
| 4,0–7,1 | hook E3 | „Genau das passiert Truman, und er ahnt nichts.“ | Nahaufnahme Truman, ahnungslos lächelnd | – |
| 7,1–10,4 | **kameras** E4 | „Überall in seiner Stadt hängen versteckte Kameras.“ | Straßenüberblick, 3 Kameras | Marker „KAMERA“ ×3; `rec_beep` ×3 |
| 10,4–14,7 | **kulisse** E5 | „Seine Stadt ist eine Kulisse, und seine Nachbarn sind Schauspieler.“ | Truman geht an zwei Nachbarn vorbei | Marker „KULISSE“, „SCHAUSPIELER“ |
| 14,7–20,0 | **licht** E6–E9 | „Doch dann fällt ein Scheinwerfer vom Himmel.“ | Truman bleibt stehen · Froschperspektive Kunsthimmel mit Luke, Scheinwerfer stürzt · Einschlag · Truman erschrickt | Marker „KUNSTHIMMEL“; `cable_snap`, `fall_whistle`, `light_crash` |
| 20,0–24,2 | **misstrauen** E10 | „Truman wird misstrauisch: Warum verhalten sich alle so seltsam?“ | Kreisfahrt, zwei Nachbarn starren ihn an | `riser`, `heartbeat` |
| 24,2–30,2 | **regie** E11–E12 | „Hinter den Kulissen sitzt der Regisseur. Er steuert Sonne, Wetter und sogar Trumans Freunde.“ | Regisseur im Regieraum · Nahaufnahme | Titel SONNE → WETTER → FREUNDE auf dem Wort; `chime` ×3 |
| 30,2–33,6 | **millionen** E13 | „Und Millionen Menschen sehen jeden Tag zu.“ | Truman im Ring aus Kamera-Laternen | Sucher, Zähler 4→31 Mio. |
| 33,6–37,6 | **segeln** E14 | „Truman will fliehen und segelt mit einem Boot aufs Meer.“ | Truman auf dem Segelboot, das sich entfernt, Blick zurück | Titel FLUCHT – „aufs Meer“; `wind`, `whoosh` |
| 37,6–41,7 | **sturm** E15 | „Der Regisseur schickt einen Sturm, doch Truman gibt nicht auf.“ | Boot im Sturm: dunkler Himmel, Regen, Blitze, Schaukeln | Titel STURM; `wind`, `boom` ×2, `rumble` |
| 41,7–46,0 | **wand** E16 | „Dann stößt sein Boot gegen eine Wand: Der Himmel ist nur aufgemalt.“ | Boot fährt auf die Wand der Kulissenwelt zu: aufgemalte Wolken, Stahlträger; Aufprall mit Kamerawackeln | Marker „AUFGEMALT“; `boom`, `crack` |
| 46,0–49,7 | **tuer** E17 | „Dort findet er eine Tür, den Ausgang.“ | Truman auf dem Bug vor einer Tür in der Wand, Klinke senkt sich, Licht unter der Tür | Marker „AUSGANG“; `magic_hum`, `door_latch` |
| 49,7–52,9 | **ende** E18 | „Er verabschiedet sich und öffnet die Tür.“ | Truman winkt vor der Wand, die Tür öffnet sich: **helle weiße Welt dahinter** | Marker „KÜNSTLICHE WELT“ (Wand) und „ECHTE WELT“ (Türöffnung) |
| 52,9–56,6 | **ausgang** E19 | „Dann tritt er hinaus in die echte Welt.“ | Truman geht in die weiße Türöffnung und verschwindet im Licht | Endkarte „TRUMAN SHOW – Kennst du den Film?“; `chime` |

Musik: `music_show_long` (eigene Synthese, 56 s, leise unter der Stimme). Schnittblitz zwischen den Szenen.

## 3. Korrekturen nach deinem Feedback

1. **Flucht:** Die erfundene Flucht mit Scheinwerfer ist ersetzt durch die Handlung des Films: Truman segelt mit einem Boot aufs Meer (E14), der Regisseur schickt einen Sturm (E15), das Boot stößt gegen die aufgemalte Wand der Kulissenwelt (E16).
2. **Ende:** Truman erreicht die Grenze der künstlichen Welt (aufgemalter Himmel mit Trägern), findet eine Tür (Marker „AUSGANG“) und öffnet sie; hinter der Tür strahlt eine helle weiße Fläche gegen die blaue, bemalte Wand. Zwei Marker beschriften die Gegenüberstellung „KÜNSTLICHE WELT“ ↔ „ECHTE WELT“. Die Treppe und die „Exit“-Schrift des Films fehlen (die Tür sitzt auf Deckhöhe).
3. **Textprüfung (sachlich):**
   - Truman wird jetzt gleich am Anfang namentlich genannt („Genau das passiert Truman …“), vorher erst in Zeile 5.
   - „Warum beobachten ihn plötzlich alle?“ ersetzt durch „Warum verhalten sich alle so seltsam?“ (näher am Film).
   - „verbeugt sich“ ersetzt durch „verabschiedet sich“, weil im Video gewinkt wird.
   - Abgeglichen mit dem Film: Show live und rund um die Uhr, versteckte Kameras, Stadt ist Kulisse, Nachbarn/Freunde sind Schauspieler, Scheinwerfer fällt vom „Himmel“, Regisseur steuert Wetter/Sonne, Millionen schauen zu, Flucht mit Segelboot, Sturm, Boot stößt an aufgemalte Himmelswand, Tür/Ausgang. **Nicht gezeigt** (bewusst weggelassen): Trumans Wasserangst/Vater, der Dialog mit dem Regisseur über Lautsprecher, die Treppe, Trumans Abschiedsworte.
4. **Untertitel:** Alle 14 Zeilen erscheinen wortgetreu, je 2–3 Wörter, im unteren Drittel; keine Zeile hat unplausible Zeitmarken (alle Wort-Timings „aligned“ aus den Piper-Phonemen). Der Gedankenstrich im Text wurde durch Komma ersetzt (sonst fiel die Timing-Berechnung auf Schätzung zurück). Untertitel überlappen stellenweise die Beine oder die Eckmarken des Suchers, aber keine Gesichter und keine Marker.
5. **Pegel:** Erster Durchlauf hatte Spitzen bis 0 dBFS beim Aufprall; SFX in „wand“ und „sturm“ gesenkt (Spitze jetzt −0,3 dBFS, −15,3 LUFS).

## 4. Neue kleine Ergänzungen (für Boot und Ausgang)

| Ergänzung | Umfang |
|---|---|
| Objekt `sailboat` (Segelboot aus Blöcken; Bug −z, `path`, `bob`, `sails: false` = vertäut) | ca. 25 Zeilen in `src/world/Props.tsx` |
| `sky_panel`: Parameter `rot` (senkrechte Wand), `hatch: 0` (ohne Luke), `clouds` | wenige Zeilen |
| `door_handle`: Verlauf `open` (Türblatt schwenkt, helle Fläche dahinter) und Parameter `scale` | Umbau in `src/world/Door.tsx`; **Regression geprüft: Standbilder der Tür aus „Die Nachricht von morgen“ pixelgleich (Abweichung 0/255)** |

Meer = `empty_stage` mit türkisem Boden ohne Raster; Sturm = dunklerer Himmelsverlauf, `dust` als Regen (Rate −18), `point_light`-Blitze.

## 5. Tatsächliche Renderzeiten (360×640 @ 15 FPS, 4 Kerne, Software-WebGL)

**Erster vollständiger Lauf, alle 13 Szenen kalt** (Bundle im Cache):

| Szene | Bilder | Zeit | ms/Bild |
|---|---|---|---|
| hook | 107 | 28,4 s | 266 |
| kameras | 48 | 14,7 s | 307 |
| kulisse | 64 | 18,3 s | 285 |
| licht | 79 | 20,0 s | 253 |
| misstrauen | 63 | 16,7 s | 266 |
| regie | 89 | 18,0 s | 202 |
| millionen | 51 | 11,5 s | 226 |
| segeln | 60 | 11,7 s | 195 |
| sturm | 61 | 12,3 s | 201 |
| wand | 64 | 13,0 s | 204 |
| tuer | 55 | 11,9 s | 217 |
| ende | 47 | 11,6 s | 247 |
| ausgang | 61 | 16,5 s | 271 |
| **Gesamt** | **849** | **212,2 s (3 min 32 s)**, Wanduhr 214 s | Ø 250 |

Davon: Browser und Komposition 1,1 s, Zusammenfügen 6,0 s. Die Stadtszenen kosten 0,25–0,31 s je Bild, Bühne/Meer 0,19–0,23 s je Bild (Messung entspricht der früheren Hochrechnung ca. 3–3,5 min).

**Nachbesserungen (nur geänderte Szenen neu gerendert, Rest aus Cache):** SFX-Pegel (sturm + wand) 35 s · Endkarte/Marker (ende + ausgang) 38 s · Marker (ende) 20 s.

**Finaler 1080p-Export (nicht gerendert, Schätzung):** 56,6 s × 30 FPS = 1698 Bilder × ca. 0,5–0,6 s ≈ 14–17 min.

## 6. Technische Prüfung der Vorschau

- ffprobe: H.264 360×640, 15 FPS, 849 Bilder, 56,60 s; AAC-Spur 56,60 s (Video und Ton gleich lang).
- Lautheit −15,3 LUFS, Spitze −0,3 dBFS.
- `tsc`, `npm run test:story` und `story check` aller Stories (Truman Show, Vorlagen, M1, Nachricht von morgen, Mondsplitter) bestehen.
- Das Video wurde anhand von Einzelbildern aus der fertigen MP4 geprüft (24 Bilder, `truman-show-vorschau-kontaktbogen.jpg`), **nicht als Bewegtbild gesehen und nicht abgehört**. Kamerawackeln beim Aufprall, Regen, Blitze, Bootsschaukeln und das Verschwinden im Licht sind deshalb nur aus Standbildern bekannt.

## 7. Bekannte Schwächen

1. Regen sind weiße Quadrate (`dust`), Blitze nur als Lichtblitz; wirkt stilisiert, nicht realistisch.
2. Truman steht beim Segeln statisch auf Deck (keine Steuerbewegung); das Boot schaukelt, Truman nicht.
3. Das Meer ist eine flache türkise Fläche ohne Wellen; der Sturm unterscheidet sich vor allem durch Himmel, Regen und Schaukeln.
4. Marker „KÜNSTLICHE WELT“ sitzt am Rand der Tür statt eindeutig auf einem Wandstück.
5. Der Regisseur trägt eine dunkle Brille (wirkt bedrohlich).
6. Die Tür sitzt auf Deckhöhe über dem Wasser; Treppe und Exit-Schild fehlen.
7. Die Szene „kulisse“ (E5) und „kameras“ (E4) sind recht statisch (feststehende Kamera wegen der Marker).

## 8. Nächste Schritte

Du bewertest die Vorschau. Erst danach entscheiden wir über Änderungen; kein 1080p-Export ohne ausdrückliche Aufforderung und Freigabe.
