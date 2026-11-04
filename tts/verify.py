"""Prüft die fertige MP4: Container-/Stream-Daten, Hörbarkeit, deutsche Sprache (Whisper-ASR) und Untertitel-Sync.
Aufruf: tts/.venv/bin/python tts/verify.py out/tiktok-fantasy.mp4"""
import difflib, json, re, subprocess, sys, wave
from pathlib import Path
import numpy as np
import sherpa_onnx

ROOT = Path(__file__).resolve().parent.parent
mp4 = sys.argv[1]
TL = json.loads((ROOT / "src/story/timeline.json").read_text())
FPS = TL["fps"]

def sh(*a): return subprocess.run(a, capture_output=True, text=True).stdout

# 1) ffprobe
probe = json.loads(sh("ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", mp4))
v = next(s for s in probe["streams"] if s["codec_type"] == "video")
a = next((s for s in probe["streams"] if s["codec_type"] == "audio"), None)
print("== ffprobe ==")
print(f"Format-Dauer: {float(probe['format']['duration']):.2f}s | Größe {int(probe['format']['size'])/1e6:.1f} MB")
print(f"Video: {v['codec_name']} {v['width']}x{v['height']} fps={v['r_frame_rate']} frames={v.get('nb_frames')} pix_fmt={v['pix_fmt']} dauer={float(v['duration']):.2f}s")
if a: print(f"Audio: {a['codec_name']} {a['sample_rate']}Hz ch={a['channels']} bitrate={a.get('bit_rate')} dauer={float(a['duration']):.2f}s")
else: print("Audio: FEHLT!"); sys.exit(1)

# 2) Audio extrahieren, Pegel prüfen
tmp = ROOT / "out/_mix16k.wav"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp4, "-vn", "-ac", "1", "-ar", "16000", str(tmp)], check=True)
with wave.open(str(tmp)) as w: x = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32768
print("\n== Hörbarkeit ==")
vol = sh("ffmpeg", "-hide_banner", "-i", mp4, "-vn", "-af", "volumedetect", "-f", "null", "-") 
err = subprocess.run(["ffmpeg", "-hide_banner", "-i", mp4, "-vn", "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
print("\n".join(l.split("] ")[-1] for l in err.splitlines() if "mean_volume" in l or "max_volume" in l))
sec = int(len(x) / 16000)
rms = [float(np.sqrt(np.mean(x[i*16000:(i+1)*16000] ** 2))) for i in range(sec)]
silent = [i for i, r in enumerate(rms) if r < 0.003]
print(f"Sekunden mit Pegel < -50 dBFS (stumm): {len(silent)} von {sec} {silent}")

# 3) Whisper-ASR (deutsch)
M = ROOT / "tts/asr/sherpa-onnx-whisper-small"
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=str(M/"small-encoder.int8.onnx"), decoder=str(M/"small-decoder.int8.onnx"),
    tokens=str(M/"small-tokens.txt"), language="de", task="transcribe", num_threads=4)
def asr(seg):
    seg = np.concatenate([np.zeros(3200, np.float32), seg, np.zeros(3200, np.float32)])
    s = rec.create_stream(); s.accept_waveform(16000, seg); rec.decode_stream(s); return s.result.text
norm = lambda t: re.sub(r"[^a-zäöüß ]", "", t.lower().replace("ß", "ss")).split()
def sim(a, b):
    A, B = " ".join(norm(a)), " ".join(norm(b)); return difflib.SequenceMatcher(None, A, B).ratio()

print("\n== Sprachverständlichkeit (ganze Zeilen aus dem fertigen Mix) ==")
rows = []
for sc in TL["scenes"]:
    for l in sc["lines"]:
        s0 = max(0, int((l["startFrame"] / FPS - 0.2) * 16000)); s1 = int(((l["startFrame"] + l["durationFrames"]) / FPS + 0.3) * 16000)
        got = asr(x[s0:s1]); r = sim(l["text"], got); rows.append(r)
        print(f"{l['id']} [{l['voice']:8s}] Ähnlichkeit {r:.2f} | Soll: {l['text']}\n{'':24s}| ASR:  {got.strip()}")
print(f"Mittlere Ähnlichkeit: {np.mean(rows):.2f}")

# 4) Untertitel-Sync: Chunk-Fenster (wie im Video) transkribieren, mit Verschiebung vergleichen
def chunks():
    out = []
    for sc in TL["scenes"]:
        for l in sc["lines"]:
            cur = []
            def fl():
                nonlocal cur
                if cur: out.append((cur[0]["start"], cur[-1]["end"], [w["w"] for w in cur])); cur = []
            for w in l["words"]:
                if len(cur) >= 3 or len(" ".join([c["w"] for c in cur] + [w["w"]])) > 24: fl()
                cur.append(w)
                if re.search(r"[.!?:,]$", w["w"]): fl()
            fl()
    return out
CH = chunks()
def score(shift):
    res = []
    for a_, b_, ws in CH:
        s0 = max(0, int(((a_ - 3) / FPS + shift) * 16000)); s1 = int(((b_ + 3) / FPS + shift) * 16000)
        res.append(sim(" ".join(ws), asr(x[s0:s1])))
    return np.array(res)
print(f"\n== Untertitel-Synchronisation ({len(CH)} Häppchen) ==")
base = score(0.0)
print(f"Zeitfenster exakt wie Untertitel (±0.1 s): mittlere Wortähnlichkeit {base.mean():.2f}, {int((base >= 0.6).sum())}/{len(CH)} Häppchen ≥ 0.6")
for sft in (-0.6, 0.6):
    s_ = score(sft); print(f"Fenster um {sft:+.1f} s verschoben:                    mittlere Wortähnlichkeit {s_.mean():.2f}")
for (a_, b_, ws), r in zip(CH, base):
    if r < 0.6: print(f"  schwach: {a_/FPS:6.2f}s '{' '.join(ws)}' ({r:.2f})")
tmp.unlink()
