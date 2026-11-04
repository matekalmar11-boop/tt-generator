#!/usr/bin/env bash
# Einmalige Einrichtung der Spracherzeugung (kostenlos, offline nutzbar): Python-Umgebung, piper-tts, Modell de_DE-thorsten-medium (CC0).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -x tts/.venv/bin/python ] || python3 -m venv tts/.venv
tts/.venv/bin/pip install piper-tts numpy onnx
M=tts/models/vits-piper-de_DE-thorsten-medium
if [ ! -f "$M/de_DE-thorsten-medium.onnx" ]; then
  mkdir -p tts/models
  # Quelle: sherpa-onnx-Release "tts-models" (GitHub). Alternativ: huggingface.co/rhasspy/piper-voices (de/de_DE/thorsten/medium)
  curl -L -o /tmp/thorsten.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-de_DE-thorsten-medium.tar.bz2
  tar -xjf /tmp/thorsten.tar.bz2 -C tts/models
fi
command -v ffmpeg >/dev/null || echo "WARNUNG: ffmpeg fehlt (apt install ffmpeg)"
echo "Fertig. Prüfen: npm run story -- voice stories/<datei>.yaml --check"
