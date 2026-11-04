# Hybrid-Prototyp: v2-Figur mit KayKit-Skelettanimation (nur Studie)

Code: `study/retarget.ts` (Übertragung), `study/PersonV2.tsx` (Parameter `joints`, `quality`), `study/Study.tsx` (Variante `hybrid`), `scripts/study-stills.mjs hyb hybwalk`, `scripts/study-motion.mjs`.
Der Generator (`src/`, `tools/`, Mondsplitter) ist unverändert.

## Übertragung der Animation – Verfahren
- Das KayKit-Skelett läuft unsichtbar mit (`AnimationMixer.setTime(t)`, deterministisch). Daraus werden pro Bild die Gelenkdrehungen der v2-Gruppenstruktur berechnet:
  Hüfte/Brust/Kopf = Weltdrehung relativ zur T-Pose; Oberschenkel, Schienbein, Oberarm, Unterarm = Richtung Gelenk→Gelenk, das v2-Segment wird per kürzester Drehung darauf ausgerichtet; Hüfthöhe im Verhältnis skaliert.
- Gesicht (`face`, `talk`), `look`, Qualitätsstufe und alle anderen v2-Eigenschaften bleiben unverändert und YAML-kompatibel. „Winken“ gibt es bei KayKit nicht (nur „Cheer“): im Test als **Ebene** realisiert – KayKit-Idle für den Körper, rechter Arm aus der vorhandenen Winken-Pose.
- Ein Stolperstein: three.js entfernt Punkte aus Knochennamen (`upperarm.l` → `upperarml`).

## Ergebnis: technisch machbar, optisch nicht überzeugend
- ✔ Funktioniert, deterministisch, zeitlich exakt (Gehzyklus der Referenz und des Hybrids laufen synchron), Gesichter/Looks unverändert.
- ✘ Die KayKit-Clips sind für kurze Chibi-Proportionen animiert und übertragen ihren **Charakter**, nicht nur Winkel:
  - „Idle“ ist eine Hände-in-die-Hüften-Pose, „Walking_A“ hält die Arme angewinkelt vor dem Körper und beugt die Knie stark (bei langen Beinen wirkt das wie Schleichen/Hocke).
  - Kein Fußkontakt: die Füße schweben oder rutschen, weil Beinlängen verschieden sind (bräuchte Fuß-IK).
  - Seitliches Abspreizen der Arme musste gedämpft werden (Faktor 0,4), sonst stehen die Arme am breiten Torso ab. Solche Korrekturen wären je Clip nötig.
- Bei 76 Clips wären Auswahl, Dämpfung und IK je Clip Handarbeit; für Roblox-typische Proportionen sehen die vorhandenen prozeduralen Posen derzeit sauberer aus (siehe Bilder), sind aber steifer.

## Dreieckszahl (v2 optimiert)
| | Meshes | Dreiecke |
|---|---|---|
| Person bisher | 36 | 432 |
| v2 erste Studie | 47 | 35 882 |
| **v2 optimiert** (2 statt 4 Segmente je Rundung, Konturhülle abgeschrägt) | 47 | **9 386** (−74 %) |
| GLB Rogue | 7 | 4 347 |
Optik der Rundungen unverändert sichtbar gut; weitere Reduktion möglich (Hände/Kopf getrennt behandeln, Hülle per Shader).

## Renderzeit pro Bild (60 Bilder, 2 s Gehen, 270×480, 1 Figur auf Bühne, 1 Tab, zwei Durchläufe)
| Variante | stationär, ms/Bild (Lauf 1 / Lauf 2) | inkl. Anlauf, ms/Bild |
|---|---|---|
| Person bisher | 231 / 232 | 260 / 258 |
| v2 (erste Studie) | 347 / 348 | 383 / 386 |
| **v2 optimiert** | 284 / 300 | 316 / 330 |
| **Hybrid** (optimiert + KayKit-Animation) | 274 / 297 | 304 / 327 |
| GLB Rogue | 339 / 376 | 371 / 409 |
Der Hybrid kostet gegenüber „bisher“ rund 20–30 % mehr pro Bild, die Skelett-Berechnung selbst fällt kaum ins Gewicht (Hybrid ≈ v2 optimiert). Messungen sind Einzelläufe mit etwa ±10 % Schwankung (Lauf 1 vs. 2).

## Dateien
- `hybrid_idle_wave_walk_front.png` – Idle, Winken (Ebene), Gehen: KayKit | Hybrid | v2 mit Pose-Winkeln.
- `hybrid_gehzyklus_seite.png` – Gehzyklus von der Seite, 6 Zeitpunkte, drei Varianten.
- `hybrid_gehen_270x480_2s.mp4`, `v2opt_gehen_270x480_2s.mp4` – Bewegungstest (2 s, 270×480, ohne Ton).
