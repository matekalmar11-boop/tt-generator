# „Die Truman Show kurz erklärt“ – Skript und Storyboard

Status: **Skript und Storyboard zur Freigabe. Das Video ist NICHT gerendert** (keine Vorschau, kein 1080p, keine Exportfreigabe).
Dateien: `stories/truman-show.yaml` (Story), Stimme `public/audio/vo_v01…v10.wav` (Piper, offline erzeugt, noch nicht abgehört), Storyboard `docs/plans/truman-show-storyboard.jpg` (22 Standbilder, erzeugt mit `story board` in 48 s).
Eigenständig stilisiert: kein Originalmaterial, kein Originalton, keine nachgebauten Originalfiguren. Hauptfigur Truman: gelbes Oberteil, dunkle Hose in jeder Einstellung. Alle 3D-Bausteine existieren bereits (`stories/vorlagen.yaml`, M1); **es wurden keine neuen 3D-Objekte gebaut**.

## 1. Länge und Aufbau

| Wert | Zahl |
|---|---|
| Gesamtlänge (aus echten Stimm-Timings) | **45,8 s** (Ziel 45–60 s) |
| Szenen / Einstellungen | 10 / 16 |
| Sprechzeilen | 11, ein Erzähler (Thorsten, Piper) |
| Sprechzeit gesamt | 31,5 s (Rest: Reaktionsbilder, Pausen, Endkarte) |

## 2. Sprecher-Skript und Einstellungen

| Zeit (ca.) | Szene / Einstellung | Erzähler | Bild und Kamera | Overlay / Ton |
|---|---|---|---|---|
| 0,0–2,2 | **hook** E1 | „Stell dir vor, dein ganzes Leben wird live im Fernsehen gezeigt.“ | **Kamerasucher-Sicht** auf Truman, der auf die versteckte Kamera zugeht | REC, LIVE, Zähler 2,1→3,4 Mio.; `live_sting`, `rec_beep` |
| 2,2–4,0 | hook E2 | (…gezeigt.) | Schnitt: Blick über die Hecken-Kamera auf Truman, der näherkommt | Namensschild TRUMAN – „ahnt nichts“; `cam_servo` |
| 4,0–5,8 | hook E3 | „Und nur du weißt es nicht.“ | Nahaufnahme Truman, ahnungslos lächelnd, Kamera folgt | – |
| 5,8–9,1 | **kameras** E4 | „Überall in seiner Stadt hängen versteckte Kameras.“ | Straßenüberblick: Truman geht, 3 Kameras (Laterne, Briefkasten, Hecke) | Marker „KAMERA“ ×3 nacheinander; `rec_beep` ×3 |
| 9,1–13,4 | **kulisse** E5 | „Seine Stadt ist eine Kulisse, und seine Nachbarn sind Schauspieler.“ | Straße, Truman geht an zwei winkenden Nachbarn vorbei | Marker „KULISSE“, dann „SCHAUSPIELER“; `whoosh` ×2 |
| 13,4–14,9 | **licht** E6 | „Doch dann fällt ein Scheinwerfer vom Himmel.“ | Truman bleibt stehen, besorgt | – |
| 14,9–16,4 | licht E7 | (…fällt…) | Froschperspektive: Kunsthimmel mit Luke, Scheinwerfer stürzt auf die Kamera zu | Marker „KUNSTHIMMEL“; `cable_snap`, `fall_whistle` |
| 16,4–17,2 | licht E8 | | Einschlag, Funken | `light_crash` |
| 17,2–18,7 | licht E9 | | Nahaufnahme: Truman erschrickt | – |
| 18,7–22,8 | **misstrauen** E10 | „Truman wird misstrauisch: Warum beobachten ihn plötzlich alle?“ | Kreisfahrt um Truman, zwei Nachbarn starren ihn an | `riser`, `heartbeat` |
| 22,8–25,2 | **regie** E11 | „Hinter den Kulissen sitzt der Regisseur.“ | Regieraum, Regisseur (dunkler Mantel) deutet auf die Kamera | Namensschild REGISSEUR – „steuert alles“; `stinger` |
| 25,2–28,8 | regie E12 | „Er steuert Sonne, Wetter und sogar Trumans Freunde.“ | Nahaufnahme Regisseur, grinst | Titel SONNE → WETTER → FREUNDE (auf dem Wort); `chime` ×3 |
| 28,8–32,2 | **millionen** E13 | „Und Millionen Menschen sehen jeden Tag zu.“ | Truman im Ring aus 8 Kamera-Laternen, Kreisfahrt | Sucher, Zähler 4→31 Mio.; `live_sting`, `riser` |
| 32,2–36,4 | **flucht** E14 | „Truman will fliehen, doch die Show stellt sich ihm in den Weg.“ | Truman rennt auf die Kamera zu; Scheinwerfer stürzt vor ihm ein; Schreck | `whoosh_fast`, `steps`, `fall_whistle`, `light_crash` |
| 36,4–41,4 | **tuer** E15 | „Am Ende steht er vor einer Tür im Himmel.“ | Truman von hinten vor einer Tür im Himmelsblau, Klinke senkt sich, Licht unter der Tür | `magic_hum`, `door_latch` |
| 41,4–45,8 | **ende** E16 | „Er winkt und tritt hinaus in die echte Welt.“ | Truman winkt frontal | Endkarte „TRUMAN SHOW – Kennst du den Film?“; `chime` |

Musik: `music_show_long` (56 s, eigene Synthese, leise unter der Stimme, Ducking). Schnittblitz (weiß, 35 %) zwischen allen Szenen.

Der Handlungsbogen ist vollständig: Leben als Show → versteckte Kameras → alles ist Kulisse → erste Pannen (Scheinwerfer) → Truman wird misstrauisch → Regisseur steuert alles → Millionen sehen zu → Fluchtversuch wird verhindert → Tür → Ausgang.

## 3. Prüfung am Storyboard (Standbilder gesehen)

- Hauptfigur in jeder Einstellung erkennbar (gelb); Hintergründe hell, keine schwarzen oder leeren Flächen.
- Gefundene und behobene Fehler: Kamera im Hecken-Objekt (schwarzes Bild), Regie-Titel um ein Wort versetzt (Wortanker zählen ab 1), Scheinwerfer verdeckte die Figur, Endkarte überdeckte das Gesicht, Marker-Position bei „SCHAUSPIELER“.
- Marker sind nur für feststehende Kameras exakt (Einstellungen E4, E5, E7).

## 4. Was das Video nicht zeigt (bewusst symbolisch)

Kein Meer, Boot, Sturm und keine Regiezentrale mit Monitoren: Die Flucht wird durch Rennen plus einstürzenden Scheinwerfer ersetzt, die Regie durch einen Raum mit Regisseur und Titeln, „Millionen“ durch Kameraring und Zähler, der Ausgang durch eine Tür im Himmelsblau. Wer den Film nicht kennt, versteht den Ablauf aus Text und Bild; die konkrete Auflösung („echte Welt“) bleibt allgemein.

## 5. Risiken (ehrlich)

1. Das Video wurde nicht als Bewegtbild gesehen; die Bewegungen (Laufen, Winken, Kreisfahrten) sind nur aus Standbildern und M1-Vorschau bekannt. Das Rennen (E14) ist neu.
2. Die Stimme wurde nur gemessen, nicht abgehört (Betonung, Tempo, Lautstärke gegenüber Musik und SFX).
3. Der Regisseur trägt eine dunkle Brille (Look `glasses`), das wirkt eher bedrohlich als freundlich – gewollt, aber ungeprüft für das Zielpublikum.
4. Untertitel liegen im unteren Drittel und überdecken stellenweise die Beine/Füße der Figur, nicht Gesichter oder Marker.
5. Einstellung E10 (Kreisfahrt): die nahe Nachbarin verdeckt teilweise Truman.

## 6. Geschätzte Renderzeiten (nicht gemessen, aus Teilmessungen)

| Schritt | Schätzung |
|---|---|
| Vorschau 360×640 @ 15 FPS (alle 10 Szenen, kalt) | ca. 3–3,5 min |
| Nach Textänderung nur geänderte Szenen | ca. 0,5–1 min je Szene |
| Finaler Export 1080×1920 @ 30 FPS | ca. 14–16 min |

## 7. Freigabe

Zur Entscheidung: (1) Skript und Einstellungen so in Ordnung? (2) Änderungswünsche am Storyboard? Erst danach: Vorschau rendern (360p), du bewertest mit Ton, dann – nur auf deine ausdrückliche Aufforderung – Freigabe und finaler Export.
