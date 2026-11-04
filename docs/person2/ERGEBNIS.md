# Rig `person2` – begrenzte Integration: Ergebnisse

Code: `src/world/Person2.tsx` (Figur), `src/world/RBox.tsx` (abgerundeter Block, optimiert), `src/world/person2Motion.ts` (Atmen, Blinzeln, Gehzyklus/IK), `src/story/person2Signals.ts` (Blick, Gesten, Schrittphase aus der Geschichte),
`src/story/visemes.ts` (Phonem → Mundform), Phonem-Ausgabe in `tts/yaml_tts.py`, Registry-Eintrag `person2`, Anbindung in `StoryScene`/`StoryVideo`. Alte Rigs und der Mondsplitter sind unverändert (Standbilder identisch, siehe unten).

## Umgesetzt und geprüft
| Anforderung | Stand | Prüfung |
|---|---|---|
| Neuer Rig-Typ, alte Figuren unverändert | ✔ `person2` | Mondsplitter (Main und YAML-Video) und Rig `person` (Etappe2Test): Standbilder vor/nach identisch (0,0000/255) |
| Alle YAML-Eigenschaften und Gesichter | ✔ Posen, Gesichter, Gegenstände, look, ghost, scale, path | `check` für `demo-person2.yaml`; ungültige Pose wird gemeldet (Test); Standbilder `person2_emotionen.png`, `person2_posen.png`, `person2_sitzen.png` |
| Atmen/Idle, Blinzeln | ✔ | Ebene `idleLayer`, `blinkAmount` (deterministisch, je Figur versetzt) |
| Blickführung, Kopf zum Sprecher | ✔ automatisch, `params.gaze` überschreibt | `person2_dialog.png` (Köpfe drehen sich zum Sprecher) |
| Gesten beim Sprechen | ✔ Nicken + Handimpuls je Wort, nur in ruhigen Posen | aus Wort-Timings; im Dialog-Bewegungstest sichtbar |
| Weichere Posenübergänge | ✔ smootherstep | `person2_posen.png` (Übergang idle → wave) |
| Gehzyklus mit Fußkontakt | ✔ Walk (und Run) per Zwei-Knochen-IK | **Unit-Test**: Standfuß-Weltposition konstant (< 1e-6), Sohle exakt auf dem Boden, Fuß nie darunter; Bilder `person2_gehzyklus.png` |
| Mundformen aus Phonemen | ✔ 8 Formen + Übergänge | Phoneme aus der Modell-Ausrichtung (Piper); Test: alle vorkommenden IPA-Zeichen sind zugeordnet; `person2_mundformen.png` |

## Renderzeit (270×480, 15 FPS, 3 s = 45 Bilder, 1 Figur gehend auf Bühne, 1 Tab, je 2 Läufe, inkl. Anlauf)
| | ms/Bild (Lauf 1 / 2) |
|---|---|
| Rig `person` (bisher) | 143 / 148 |
| Rig `person2` | 184 / 171 |
| `person2`, Dialog mit 2 Figuren | 219 |
Mehrkosten `person2` gegenüber `person`: etwa 20 % je Figur (≈ +30 ms/Bild). Einzelläufe, Schwankung ca. ±10 %.

## Grenzen / bewusst verschoben
- **Gesicht als Decal:** aus sehr schrägen Blickwinkeln (> ca. 60° zur Gesichtsnormalen) wirkt es flach/gestaucht (siehe `person2_mundformen.png`); Kamerapresets sollten Figuren eher frontal/dreiviertel zeigen.
- **Gehen:** nur gerader Gang ohne Kurvenlage; `run` ist nur im Unit-Test (Kontakt) geprüft, nicht visuell; `sneak` nutzt weiter die einfache Posen-Schwingung. Bei Stillstand blendet der Gehzyklus aus (Idle).
- **Blick:** nur horizontal (kein vertikales Ziel); Augen eilen dem Kopf voraus, kein Sakkaden-Zittern.
- **Gesten:** einfache Beat-Gesten (Arm/Kopf), keine bedeutungsabhängigen Gesten; bei `wave`, `point`, `shock`, `walk`, `run`, `sneak` bewusst aus.
- **Überschwingen/Vorbewegung** (Anticipation) bei Posenwechseln nicht umgesetzt (nur weiche Kurve).
- **Phoneme:** Zeilen, die mit älterer Pipeline erzeugt wurden (z. B. Mondsplitter-Legacy), haben keine Phonemdaten → Hüllkurven-Mund. Die Demo-Geschichten wurden mit Pipeline 4 neu gesprochen (`demo-stadtgeschichte`, `_test-export`, `demo-person2`).
- Optik: Haut wirkt unter dem Bühnenlicht graustichig (Lichtfarbe der Szene, nicht der Figur).
