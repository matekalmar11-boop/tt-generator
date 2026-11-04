# „Die Nachricht von morgen“ – Drehbuch und Umsetzungsplan (ENTWURF zur Freigabe)

Format: 1080×1920, 30 FPS, deutsch, ca. 35–38 s. Figuren: Rig `person2`. Noch nichts produziert: keine YAML, keine Sprache, kein Rendering, keine Freigabe.

## Figuren
| ID | Rolle | Look | Stimme |
|---|---|---|---|
| `leon` | Junge (Hauptfigur, Ich-Erzähler) | blauer Hoodie `#3f6fb5`, dunkelblonde Kurzhaare, helle Schuhe | Piper-Stimme, Tonhöhe 1,10 |
| `ben` | bester Freund | roter Pulli `#d9534f`, schwarze Kappe | Piper-Stimme, Tonhöhe 1,03, Telefon-Filter (Tiefpass, Mitten) |
| `doppel` | Gestalt, sieht aus wie Leon | **identisch** zu `leon` (nur `eyes` heller), spricht nie | – |

## Drehbuch (Sprechtexte; Zahlen ausgeschrieben, damit die Sprachausgabe sie richtig liest)
**1 · Nachricht** (Leon, abends, Zimmer)
- *[Ping, Textkarte: „Geh morgen nicht zur Schule.“ – Absender: ICH (meine Nummer)]*
- L01 LEON: „Das ist meine eigene Nummer?“
- L02 LEON: „Das ist bestimmt ein Scherz.“

**2 · Foto 1** – *[Ping, Kamera-Blitz, Foto: Leon schaut aufs Handy – Zeitstempel „MORGEN · 08:17“]*
- L03 LEON: „Das bin ich. Gerade eben.“
- L04 LEON: „Es ist von morgen. Acht Uhr siebzehn.“

**3 · Anruf** – *[Klingeln]*
- B01 BEN (am Telefon): „Leon? Warum stehst du vor eurem Haus?“
- L05 LEON: „Was? Ich bin zu Hause.“
- B02 BEN (Straße, blickt in die Kamera): „Du stehst direkt vor mir. Und du grinst.“
- L06 LEON: „Ben, ich sitze in meinem Zimmer!“

**4 · Foto 2** – *[Ping, Blitz, Foto: Ben neben der Gestalt – „GERADE EBEN“]*
- L07 LEON: „Ben! Geh weg von ihm!“
- B03 BEN (am Telefon): „Leon? Warum sagst du nichts?“ *[Leitung bricht ab]*

**5 · Letzte Nachricht** – *[Stille, Herzschlag, Ping, Textkarte: „Das bin nicht ich.“ – Absender: ICH]*
- L08 LEON (flüsternd): „Wer schreibt mir dann?“
- *[Schritte im Flur, Klinke, Schnitt auf Schwarz, Endkarte „TEIL 2 – MORGEN · 08:17“]*

Sprechtempo geschätzt ≈ 19 Zeichen/s; Sprachanteil ≈ 16–17 s von ≈ 35 s.

## Szenenplanung (30 FPS; Dauer = Pausen + echte Sprachlänge, bei der Produktion aus der TTS)
| # | Szene | Dauer | Kulisse / Licht | Figuren (Pose, Gesicht) | Kamera (Preset) | Text | SFX / Musik |
|---|---|---|---|---|---|---|---|
| 1 | Nachricht | 4,6 s | `room` abends, dunkle Wände, Lampenlicht warm + kühles Handylicht | Leon frontal (Drehung 0,1π), `idle` + `phone`, Gesicht neutral → `shock` | `push_in` Brust → Gesicht, FOV 40 → 32 | Textkarte ab 0,0 s (`title`), Untertitel | Ping bei 0,0; Musik setzt ein (Drohne); Herzschlag leise |
| 2a | Foto 1 | 1,8 s | gleicher Raum, **kalt/entsättigt**, Kamera starr von schräg oben | Leon schaut nach unten aufs Handy, `phone`, `worry` | feste Einstellung (kein Wackeln) = „Foto“ | `title`: „MORGEN · 08:17“ | Cut-Blitz + Auslöser, Musik kurz weg |
| 2b | Reaktion | 4,3 s | wie 1 | Leon, `shock` → `worry` | `handheld` + leichter `push_in` | Untertitel | Riser leise |
| 3a | Anruf | 4,6 s | wie 1 | Leon, `phone`, `worry` → `shock`; Ben nur als Stimme | `push_in` Gesicht, FOV 34 → 30 | Untertitel, Label „BEN · AM TELEFON“ | Klingeln ×2, Telefonfilter auf Ben |
| 3b | Ben vor dem Haus | 2,7 s | `city_street` Dämmerung (violett), Hausfassade | Ben frontal, `phone`, `worry`, `gaze: camera` (Kamera = Blick der Gestalt) | `handheld` + langsames `push_in` (Subjektive des Doppelgängers) | Untertitel | Wind, Musik tiefer |
| 3c | Leon antwortet | 2,4 s | wie 1 | Leon, `shock` | `push_in` | Untertitel | – |
| 4a | Foto 2 | 2,4 s | `city_street`, kalt, starr, frontal | Ben links (Handy, `worry`), `doppel` rechts (`idle`, `grin`, regungslos, `energy: 0`) – **beide frontal** | feste Zweier-Einstellung, FOV 36 | `title`: „GERADE EBEN“ | Blitz + Auslöser, Stinger |
| 4b | Warnung | 4,0 s | wie 1 | Leon `shock` / `worry` (Panik); Ben nur Stimme | `handheld`, schneller `push_in` | Untertitel „BEN“ | Leitung bricht ab (Piep), Riser |
| 5 | Letzte Nachricht | 8,6 s | wie 1, Licht sinkt, Handylicht wird dominant | Leon, Handy sinkt, `worry` → `shock`; Blick geht zur Tür | `dolly_zoom` auf das Gesicht (Entfernung 8 → 3) | `title`: „Das bin nicht ich.“ (bei 1,0 s), Endkarte | Stille + Herzschlag, Ping, Schritte (3 s), Klinke, Boom/Stinger, Schwarz |
| | **Summe** | **≈ 35,4 s** | | | | | |

**Erste 2 Sekunden:** 0,00 Ping + Textkarte „Geh morgen nicht zur Schule.“ steht sofort im Bild, Leons Gesicht reißt in `shock`, Kamera schnappt per `push_in` auf das Gesicht; 0,5 s L01 („Das ist meine eigene Nummer?“). Kein ruhiger Einstieg.
**Rhythmus:** Schnitt alle 1,8–5 s; Foto-Szenen sind absichtlich starr (Kontrast zum Wackeln). **Kamerasicht:** alle Gesichter frontal bis dreiviertel (Drehung ≤ 0,3π zur Kamera), keine Profile.

## Benötigte Elemente
- **Kulissen:** `room` (Parameter: dunkle Wand/Boden, `furniture: false` oder reduziert), `city_street` (Dämmerung, Hausfassade links).
- **Requisiten:** Handy (Rig-Prop `phone`, leuchtender Bildschirm), Handy-Glühen auf dem Gesicht über ein `point_light`-Objekt (folgt der Figur, Intensität flackert per Verlauf).
- **Animationen (alle vorhanden):** Posen `idle`, `shock`-Mischungen, Gesichter `neutral/worry/shock/grin`, automatisch: Blinzeln, Atmen, Blickführung, Gesten, Mundformen. Sonderfall Doppelgänger: `energy: 0`, `gaze: camera`.
- **Sound (neu, über das vorhandene Skript `tts/sfx.py`):** `ping` (Benachrichtigung), `ring` (Telefon), `shutter` (Auslöser/Blitz), `beep_drop` (Leitung weg), `door_latch` (Klinke), Musik `music_mystery` (Drohne + Puls, ≈ 40 s). **Vorhanden:** `heartbeat`, `riser`, `stinger`, `boom`, `rumble`, `wind`, `steps`, `whoosh_fast`.
- **Einblendungen:** Nachrichten und Zeitstempel als `title`-Einblendung (große weiße Schrift), Sprecher-Schilder über Stimmenprofile, Serien-Tag „DIE NACHRICHT VON MORGEN“, Cut-Blitz an den Foto-Schnitten, Endkarte „TEIL 2 · MORGEN 08:17“.

## Prüfung: was unterstützt der Generator bereits?
| Element | Stand |
|---|---|
| `person2` mit Gesichtern, Posen, `phone`, Blick, Gesten, Mundformen | ✔ vorhanden |
| `room`, `city_street`, Licht/Nebel | ✔ (Zimmer ist die Küche/Wohnraum-Kulisse: ohne Bett, mit Farbparametern nutzbar) |
| Kamera-Presets `push_in`, `handheld`, `dolly_zoom` | ✔ |
| Sprachprofile je Figur, Telefon-Klang per Effekt (Tiefpass/Equalizer), Untertitel-Label | ✔ |
| Musik mit Absenkung unter der Sprache, SFX, Cut-Blitz, Endkarte | ✔ |
| Vorschau, Freigabe, Export | ✔ |
| Handy-Oberfläche/Chat-Blase mit Absender | ◐ **Behelf:** `title`-Einblendung; optional kleine neue Einblendung `message` (Absender + Blase), ca. 0,5–1 Tag |
| Foto-Rahmen mit Zeitstempel | ◐ **Behelf:** starre „Foto“-Szene + `title`; optional Rahmen als Teil von `message` |
| Handy am Ohr (Anruf-Pose) | ◐ **Behelf:** Prop `phone` hebt den Arm vor die Brust; optional Pose `call` (klein, ca. 0,5 Tag) |
| Doppelgänger ohne Blinzeln | ◐ **Behelf:** `energy: 0` (kein Atmen); Blinzeln lässt sich bisher nicht abschalten – kleiner Parameter (ca. 1 Std.) |
| Neue Sounds und passende Musik | ✘ **fehlen**, werden mit `tts/sfx.py` erzeugt (≈ 0,5 Tag inkl. Abhören) |
| Zwei unterscheidbare Jungenstimmen | ◐ nur **ein** deutsches Piper-Modell (Thorsten) vorhanden: Unterschied über Tonhöhe/Telefonfilter; wirkt ähnlich. Weitere Stimmenmodelle wären neu zu beschaffen/prüfen |
| Schlafzimmer (Bett) | ✘ Behelf: leerer Raum mit Wandfarbe; kein Bett |
| Automatische Kameraprüfung (Gesicht sichtbar?) | ✘ nicht vorhanden → Prüfung per Standbildern (`story still`) |

## Umsetzungsplan und Aufwand (nach Freigabe)
1. Drehbuch-YAML `stories/nachricht-von-morgen.yaml`, Prüfung, Standbilder (Gesichter/Kamera) – 0,5–1 Tag
2. Neue Sounds + Musik (`sfx.py`), Manifest – 0,5 Tag
3. Sprache erzeugen (`story voice`), Länge/Timing prüfen, Texte ggf. kürzen – 0,25 Tag
4. Vorschau 360×640, Korrekturen an Kamera/Timing (1–2 Runden) – 0,5–1 Tag
5. Optional (nur wenn freigegeben): `message`-Einblendung, Pose `call`, Blinzeln-Schalter – 1–2 Tage
6. Freigabe durch dich → Finalexport (Rendern ≈ 10 min, **Hochrechnung** aus früheren Messwerten, nicht gemessen)

Gesamt ohne Option 5: ≈ 2–3 Arbeitstage; mit Option 5: ≈ 3–5.

## Risiken
- Zwei ähnliche Stimmen → Unterscheidung über Untertitelfarbe/Label und Telefonfilter; Hörprobe nötig.
- „Foto“ nur durch Inszenierung erkennbar (starr, kalt, Zeitstempel) – ohne `message`/Rahmen weniger eindeutig.
- Straßenszenen (`city_street`) sind am teuersten im Rendern; sie sind nur 5,1 s der Geschichte.
- Länge hängt von der echten Sprachdauer ab (±10 %); Ziel 35–38 s, Reserve zum Kürzen: L04, B03.
