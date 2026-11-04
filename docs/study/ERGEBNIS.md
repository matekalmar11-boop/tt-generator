# Machbarkeitsstudie Figuren (nur Studie – der Generator ist unverändert)

Code: `study/` (eigener Remotion-Einstieg, eigene Compositions `Study`/`StudyWide`), Standbilder: `node scripts/study-stills.mjs <ordner> lineup faces talk poses walkside`.
Verglichen wird dieselbe Szene (Bühne, Licht, Kamera, gleiche Zielhöhe ≈ 3,1 Einheiten):
**bisher** = `Person` aus dem Generator · **v2** = Studien-Version (abgerundete Blöcke, Kunststoff-Look, Kontur, gezeichnetes Gesicht, gleiche Posen-/Face-Daten) · **GLB** = KayKit „Rogue“.

## Externes Modell: Lizenz und Verfügbarkeit (geprüft)
- Quelle: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 (öffentliches Repo, geklont). `LICENSE.txt` im Repo: **CC0 1.0**, „free to use in personal, educational and commercial projects“, Namensnennung nicht verpflichtend → Weitergabe in einem öffentlichen Repo erlaubt. Die Lizenzdatei liegt unverändert in `public/study/`.
- Nicht erreichbar aus dieser Umgebung (Proxy blockiert): kenney.nl, quaternius.com, poly.pizza, opengameart.org, itch.io. Dort ggf. passendere (z. B. „blockige“) Figuren – **nicht geprüft**. Auf GitHub liegen weitere KayKit-Pakete (City Builder Bits, Furniture Bits, Restaurant Bits …), die zu den Figuren passen könnten – **nicht geprüft**.

## Messwerte des Modells (aus der Datei gelesen / gezählt)
| | bisher | v2 | GLB Rogue |
|---|---|---|---|
| Meshes (Zeichenaufrufe) | 36 | 47 (inkl. Konturhüllen) | 7 |
| Dreiecke | 432 | ≈ 35 900 (mit 4 Segmenten je Rundung; reduzierbar) | ≈ 4 300 |
| Skelett / Animationen | eigene Gelenk-Posen (11 Posen) | gleiche Gelenk-Posen | 41 Knochen, **76 Clips** (Idle, Walking_A/B/C, Running_A/B, Sit_Chair_*, Cheer, Interact, Spellcast …) |
| Gesichtsausdruck | 6 Parameter, Quader | Gezeichnetes Gesicht, gleiche Parameter, Mund offen/zu, Blinzeln | **keine Morph-Targets, Gesicht fest im Mesh/Textur** |
| Datei | – | – | 3,6 MB (1024²-Farbpalette) |

## Ergebnisse (Bilder in diesem Ordner)
- `studie_lineup_*.png` – alle drei nebeneinander, Idle und Winken/Cheer.
- `studie_gesichter.png` – 5 Ausdrücke: v2 zeigt Schock, Wut, Sorge, Lächeln klar; **GLB bleibt in allen fünf Fällen gleich**.
- `studie_sprechen.png` – Mundöffnung beim Sprechen (bisher vs. v2).
- `studie_posen.png` – Idle, Gehen, Rennen, Winken/Cheer, Sitzen (mit Stuhl).
- `studie_gehzyklus_seite.png` – Gehzyklus von der Seite (6 Zeitpunkte).

## Tatsächliche Vor- und Nachteile
**v2 (verbesserte Person)**
- + Wirkt klar „Roblox-artig“ (abgerundete Glieder, Kontur, Gesicht wie ein Decal) und ist deutlich ausdrucksstärker als bisher; Emotionen und Lippenbewegung kommen aus denselben YAML-Daten (`face:`, `talk`) – keine Schemaänderung nötig.
- + Alle Posen/Kamerapresets/Looks der bestehenden Pipeline funktionieren unverändert; neue Figuren sind weiter nur eine `look`-Zeile.
- − Bewegung bleibt so steif wie die Posenbibliothek (Gehen: Beine/Arme schwingen starr, kein Fußkontakt, kein Nachschwingen); das verbessert die Studie nicht.
- − Der geöffnete Mund ist in der Studie nur eine Ellipse („O“) – wirkt beim Sprechen eher überrascht als nach Lauten geformt; echte Mundformen (aus den Piper-Phonemen) wären ein eigener Schritt.
- − Dreiecks- und Meshzahl höher (Konturhüllen verdoppeln die Zeichenaufrufe); lässt sich reduzieren, ist aber Arbeit. Hände/Haare/Kleidung noch einfach.
**GLB (KayKit Rogue)**
- + Sichtbar hochwertigere Figur und Bewegung: Gewicht, Fußkontakt, natürliche Lauf- und Sitzanimationen; wenige Zeichenaufrufe (7 Meshes, 4,3 k Dreiecke) – eher günstiger als unsere Blockfiguren.
- + Lizenz eindeutig (CC0), Skelett-Animation lässt sich in Remotion deterministisch pro Bild setzen (`mixer.setTime`), das hat im Test funktioniert.
- − **Keine Gesichtsausdrücke und keine Lippenbewegung** (statisches Gesicht) – das war eines deiner Hauptprobleme.
- − Stil: Fantasy-Chibi (Kopf ≈ 45 % der Körperhöhe, Kapuzen-/Abenteurer-Outfit), nicht „modern/Roblox“. Nur 5 Figuren im Paket, Farben/Kleidung nur über Textur-Eingriffe änderbar (einzelne Palette-Textur) → schwächere Wiederverwendbarkeit.
- − Neue Anforderungen (Pose-Namen aus YAML → Clips, Gegenstände an Handknochen, Übergänge zwischen Clips) wären zusätzliche Arbeit; im Test nur Einzel-Clips an festen Zeitpunkten geprüft.
**Nicht getestet:** Kombination (GLB-Körper plus Gesichts-Decal vor dem Gesicht), Clip-Überblendungen, Gegenstände in der Hand, Renderzeit pro Bild (nur Mesh-/Dreieckszahlen, keine Benchmarks), weitere Modelle.
