# Hinweise für KI-Agenten in diesem Repository

- **Freigabe-Schranke:** `npm run story -- approve … --confirm …` und `npm run story -- render …` (finaler Export) nur ausführen, wenn die Person im aktuellen Gespräch ausdrücklich dazu auffordert. Niemals selbst freigeben, `approvals/*.json` nicht von Hand erzeugen oder bearbeiten, und die Schranke (tools/export.ts) nicht umgehen (z. B. durch direktes `remotion render` der Composition `StoryAny`).
- Keine langen Renderings oder Benchmarks ohne Aufforderung; für Prüfungen Standbilder oder `story preview` mit kurzen Abschnitten verwenden.
- Der Mondsplitter (`stories/mondsplitter.yaml`, `src/scenes/Scenes.tsx`, `src/story/timeline.json`, `tts/synth.py`) ist Referenz und bleibt unverändert.
- Prüfungen vor jedem Commit: `npx tsc --noEmit`, `npm run test:story`, `npm run story -- check stories/<datei>.yaml`.
