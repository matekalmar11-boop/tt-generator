# "If This Is Your Favorite Color..." — Serien-Vorlage

Kurzvideos (1080×1920, ~40–50 s) über Farbpsychologie im Papier-Look des ersten Videos
(Engine: `../../video/paper.py`: Papierfasern, gerissene Kanten, Schnittrand, Schatten, Stop-Motion auf Zweiern, Papier-Riss-Übergänge).

## Neue Episode
1. `episodes/red.json` kopieren, z.B. nach `episodes/blue.json`, und anpassen:
   - `id`, `episode`, `color_name`, `palette` (main/deep/bright/warm_bg/dark_bg/paper/ink/accent/sub_highlight)
   - `sections`: genau fünf Abschnitte `hook`, `traits`, `shadow`, `fact`, `outro` (Sprechertext)
   - `traits` / `shadow_traits`: Schlüsselwort aus dem Text + Icon (`heart crown bolt burst warning clock slash eye brain chart drop leaf sun moon star`)
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
nicht als Persönlichkeitsdiagnose. Jede Episode enthält im `fact`-Abschnitt den Hinweis, dass die
Lieblingsfarbe allein keine Persönlichkeit verrät (Stempel "NOT A PERSONALITY TEST").

## Voraussetzungen
Kokoro-Modell + Stimmen in `$KOKORO_DIR` (`kokoro-v1.0.onnx`, `voices-v1.0.bin`); die Variante mit Dauer-Ausgang
(`kokoro-v1.0-dur.onnx`) erzeugt `fc_voice.py` beim ersten Lauf selbst. Python: numpy, opencv, pillow, scipy, onnx, onnxruntime, kokoro-onnx; ffmpeg.
