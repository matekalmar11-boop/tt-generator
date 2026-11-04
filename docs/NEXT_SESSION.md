# Startprompt für den neuen Claude-Chat (PlotRush / tt-generator)

Kopiere den Block unter „Startprompt" als erste Nachricht in den neuen Chat.

## Voraussetzungen

- Repository: `matekalmar11-boop/tt-generator`
- Branch: `claude/tiktok-generic-scene-system-ic6ci0`
- Vorschau-MP4 (im Repo, zuverlässig): `docs/previews/nachricht-von-morgen-vorschau-v1.mp4`
  (360×640, 15 FPS, 31,80 s, SHA-256 `e85d44b7a599ffce37d41cfe793e5ba7276dbae55efe88473d7a23117188b375`)
- Falls die Datei fehlt: im Repo-Ordner `npm install && npm run story -- preview stories/nachricht-von-morgen.yaml`
  (ca. 2 Min kalt, braucht Chromium; Stimmen-WAVs sind eingecheckt, kein TTS-Setup nötig),
  oder die MP4 im neuen Chat erneut hochladen.

## Startprompt

```
Wir setzen das Projekt PlotRush (Repo tt-generator) fort.
Branch: claude/tiktok-generic-scene-system-ic6ci0

Lies zuerst vollständig:
1. CLAUDE.md (Regeln für KI-Agenten – Freigabe-Schranke beachten!)
2. docs/HANDOFF.md (Architektur, CLI, YAML-System, person2, TTS, Preview/Export, bekannte Probleme, Entscheidungen)
3. docs/stories/nachricht-von-morgen.md (Drehbuch und Messwerte)
4. stories/nachricht-von-morgen.yaml (aktuelle Story)

Umgebung: `npm install`. `npm run tts:setup` nur, wenn Stimmen neu erzeugt werden müssen
(die WAVs und src/story/voices/nachricht-von-morgen.json sind im Repo).

Stand: Die erste Vorschau von „Die Nachricht von morgen" existiert unter
docs/previews/nachricht-von-morgen-vorschau-v1.mp4, ist aber NOCH NICHT für die
Veröffentlichung freigegeben. Meine Bewertung:
- Der Einstieg ist für den Zuschauer nicht ausreichend verständlich.
- Die Handlung muss visuell klarer erzählt werden.
- Zu viele ähnliche Einstellungen von Leon.
- Zimmer und Umgebung wirken zu leer.
- Die Fotos, Ben und der Doppelgänger müssen deutlicher gezeigt werden.
- Figuren und Kamera brauchen weitere Qualitätsverbesserungen.

AUFTRAG (nur Analyse und Plan, noch KEINE Umsetzung):
A) Sehr genaue Szene-für-Szene-Analyse der Vorschau (alle 11 Szenen): Bild (Kamera,
   Einstellungsgröße, Bildaufbau, Figurenlesbarkeit, Leere), Ton (Stimmen, SFX, Musik,
   Lautstärken), Untertitel (Lesbarkeit, Timing), Verständlichkeit für Erstseher,
   Rhythmus. Nutze Frame-Extraktion/Standbilder (ffmpeg, `npm run story -- still …`,
   `story shots`) und Audio-Analyse. Sage ehrlich, was du nicht sehen/hören konntest.
B) Konkreter Verbesserungsplan, der die sechs Kritikpunkte einzeln adressiert:
   Szenenänderungen, Einstellungsvielfalt (Shot-Liste), Set-Dressing/Requisiten,
   deutlichere Foto-/Ben-/Doppelgänger-Darstellung, nötige Generator-Erweiterungen
   (klein halten), Zeit-/Aufwandsschätzung, Risiken.
C) Plan zur Freigabe vorlegen und warten.

REGELN:
- Vor meiner Freigabe nichts implementieren.
- Niemals `story approve` oder finalen `story render` ausführen, keine Freigabedateien erzeugen.
- Keine langen Renderings/Benchmarks; nur Standbilder bzw. kurze Preview-Abschnitte.
- Mondsplitter (stories/mondsplitter.yaml, src/scenes/Scenes.tsx, src/story/timeline.json,
  tts/synth.py) und alte Rigs (person) bleiben unverändert.
- Vor jedem Commit: npx tsc --noEmit, npm run test:story,
  npm run story -- check stories/<datei>.yaml.
- Bericht auf Deutsch, ehrlich über Grenzen und Nicht-Getestetes.
```
