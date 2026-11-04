# Freigaben für den finalen Export

Hier liegt je Geschichte eine Datei `<story-id>.json`, erzeugt von `npm run story -- approve <datei> --confirm <hash>`.
Sie bindet die Freigabe an den **Inhalt** der Geschichte (YAML-Daten, Zeitleiste inkl. Wort-Timings, alle Audiodateien).
Jede Änderung macht sie ungültig – dann verweigert `npm run story -- render` den Export, bis neu freigegeben wurde.
Freigaben werden nur von der verantwortlichen Person erteilt, nie automatisch.
