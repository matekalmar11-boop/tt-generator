# tt-generator

TikTok-Video-Generator mit React, TypeScript und Remotion (1080×1920, 30 FPS).
Test-Komposition `TikTokTest`: 10 s, blockartige 3D-Figur (three.js), schnelle Kamerafahrten, animierte deutsche Untertitel.

```bash
npm install
npm run dev      # Remotion Studio (Vorschau im Browser)
npm run still    # Einzelbild -> out/frame.png
npm run render   # MP4 -> out/tiktok-test.mp4
```

Hinweis: Ohne GPU wird WebGL per `--gl=swangle` (Software) gerendert. Fertiges Beispiel: `renders/tiktok-test.mp4`.
