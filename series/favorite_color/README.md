# "If This Is Your Favorite Color..." — Serien-Vorlage

Kurzvideos (1080×1920, ~40–50 s) über Farbpsychologie im Papier-Look des ersten Videos
(Engine: `../../video/paper.py`: Papierfasern, gerissene Kanten, Schnittrand, Schatten, Stop-Motion auf Zweiern, Papier-Riss-Übergänge).

## Neue Episode
1. `episodes/red.json` kopieren, z.B. nach `episodes/blue.json`, und anpassen:
   - `id`, `episode`, `color_name`, `palette` (main/deep/bright/warm_bg/dark_bg/paper/ink/accent/sub_highlight)
   - `sections`: genau fünf Abschnitte `hook`, `traits`, `shadow`, `fact`, `outro` (Sprechertext)
   - `traits` / `shadow_traits`: Schlüsselwort aus dem Text + Icon (`heart crown bolt burst warning clock slash eye brain chart drop leaf sun moon star wave shield anchor snow cloud`)
   - `fact.beats`: Motive im Fakt-Teil, je `{word, kind: icon|eye|ekg, icon, label}`; `fact.stat`: Abschluss mit Siegerpodest `{word, label_word, label}`
   - Schlüsselwörter für Szenenwechsel: `traits_outro_word`, `shadow_intro_word`, `duality`, `fact.*`, `outro.comment_word`
   - `teaser_colors` für die Endkarte
2. `python3 make_episode.py episodes/blue.json`
3. Ergebnis: `output/<id>.mp4`; Kontrollbilder: `python3 fc_render.py episodes/blue.json --stills 1 5 10 ...`

## Bausteine
| Datei | Aufgabe |
|---|---|
| `fc_voice.py` | Kokoro-TTS (Stimme `af_heart`), Abschnitte am Stück gesprochen; Phonem-Dauern direkt aus dem Modell → exakte Wortzeiten |
| `check_sync.py` | prüft Wortzeiten gegen die Sprachenergie (Restversatz muss ≤ 25 ms sein) |
| `fc_audio.py` | Musik (Stimmung je Abschnitt), Papier-Sounddesign auf denselben Zeitpunkten wie das Bild, Ducking, Sprach-Abstand-Kontrolle |
| `fc_scenes.py` | die fünf Szenen (Hook, Eigenschaften, dunkle Seite + Dualität, Fakt + Einschränkung, Outro + Endkarte) |
| `fc_icons.py` | Papier-Icon-Bibliothek |
| `fc_render.py` | Compositor, Riss-Übergänge, Untertitel (2–3 Wörter, aktives Wort in Episodenfarbe), Encoding |

## Inhaltliche Leitplanke
Farben werden als **Assoziationen** beschrieben ("is often associated with", "may", "studies suggest"),
nicht als Persönlichkeitsdiagnose.
Ab Episode 2 **kein** Hinweis "Lieblingsfarbe ≠ Persönlichkeit" mehr (Wunsch des Auftraggebers): kein entsprechender Satz,
kein "≠"-Motiv, kein Stempel. Der Fakt-Teil endet stattdessen mit `fact.stat` (oder nur mit den `beats`).
(`fact.caveat_word` bleibt nur für Episode 1 im Code, damit sie reproduzierbar ist.)

## Voraussetzungen
Kokoro-Modell + Stimmen in `$KOKORO_DIR` (`kokoro-v1.0.onnx`, `voices-v1.0.bin`); die Variante mit Dauer-Ausgang
(`kokoro-v1.0-dur.onnx`) erzeugt `fc_voice.py` beim ersten Lauf selbst. Python: numpy, opencv, pillow, scipy, onnx, onnxruntime, kokoro-onnx; ffmpeg.
