"""Drachenstimme verständlicher neu erzeugen (milderer Effekt), Zeilenlängen bleiben identisch -> Timeline-Frames ändern sich nicht."""
import json, re, subprocess, sys, wave
from pathlib import Path
import numpy as np
from piper import PiperVoice, SynthesisConfig

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/audio"
TLP = ROOT / "src/story/timeline.json"
TL = json.loads(TLP.read_text()); FPS = TL["fps"]
voice = PiperVoice.load(str(ROOT / "tts/models/vits-piper-de_DE-thorsten-medium/de_DE-thorsten-medium.onnx"))
SR = voice.config.sample_rate
CFG = SynthesisConfig(length_scale=1.05, noise_scale=0.5, noise_w_scale=0.6)
RATE = float(sys.argv[1]) if len(sys.argv) > 1 else 0.9   # Tonhöhe (1.0 = unverändert)

def trim(x, thr=0.008):
    i = np.where(np.abs(x) > thr)[0]; return x[max(0, i[0] - int(0.03 * SR)): i[-1] + int(0.08 * SR)]
def speak(text):
    parts = []
    for s in re.split(r"(?<=[.!?])\s+", text.strip()):
        parts += [trim(np.concatenate([c.audio_float_array for c in voice.synthesize(s, CFG)])), np.zeros(int(0.24 * SR), np.float32)]
    return np.concatenate(parts[:-1])
def wavw(p, x, sr):
    with wave.open(str(p), "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())
def wavr(p):
    with wave.open(str(p)) as w: return np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32767, w.getframerate()

for sc in TL["scenes"]:
    for l in sc["lines"]:
        if l["voice"] != "dragon": continue
        target = l["durationFrames"] / FPS   # gleiche Dauer wie vorher
        raw = OUT / "_raw.wav"; wavw(raw, speak(l["text"]) * 0.9, SR)
        cur = len(wavr(raw)[0]) / SR
        # Tonhöhe senken (asetrate), dann Tempo so anpassen, dass genau die Zielsprechdauer entsteht
        tempo = (cur / RATE) / (target * 0.985)
        tempo = min(1.4, max(0.8, tempo))
        fin = OUT / f"vo_{l['id']}.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af",
            f"asetrate={int(SR*RATE)},aresample={SR},atempo={tempo:.4f},lowpass=f=6000,equalizer=f=140:t=q:w=1:g=3,aecho=0.8:0.5:40:0.15,loudnorm=I=-14:TP=-1.5",
            "-ar", "44100", str(fin)], check=True); raw.unlink()
        y, sr = wavr(fin); d = len(y) / sr
        # auf exakte Zeilenlänge bringen
        n = int(round(target * sr)); y = np.pad(y, (0, max(0, n - len(y))))[:n]; wavw(fin, y, sr)
        nf = l["durationFrames"]; w_ = int(sr / FPS)
        env = np.array([np.sqrt(np.mean(y[i*w_:(i+1)*w_] ** 2)) if len(y[i*w_:(i+1)*w_]) else 0 for i in range(nf)])
        l["env"] = [round(float(v), 2) for v in np.clip(env / (np.percentile(env, 90) + 1e-9), 0, 1)]
        # Wort-Timing: gemessene Pausen an Satzzeichen verankern, sonst proportional
        toks = l["text"].split(); br = [i for i, t in enumerate(toks[:-1]) if re.search(r"[.,!?:;]$", t)]
        e = np.array([np.sqrt(np.mean(y[i:i+int(0.01*sr)] ** 2)) for i in range(0, len(y) - int(0.01*sr), int(0.01*sr))])
        q = e < 0.02; pauses = []; i = 0
        while i < len(q):
            if q[i]:
                j = i
                while j < len(q) and q[j]: j += 1
                if (j - i) * 0.01 >= 0.11 and i > 5 and j < len(q) - 5: pauses.append((i * 0.01, j * 0.01))
                i = j
            else: i += 1
        wt = [max(2, len(re.sub(r"\W", "", t))) for t in toks]
        dur = d if d < target else target
        if br and len(pauses) >= len(br):
            pauses = sorted(sorted(pauses, key=lambda p: p[1] - p[0], reverse=True)[:len(br)])
            bounds = [0.0] + [(a + b) / 2 for a, b in pauses] + [dur]; groups = []; s0 = 0
            for b in br + [len(toks) - 1]: groups.append(list(range(s0, b + 1))); s0 = b + 1
            spans = [None] * len(toks)
            for g, (t0, t1) in zip(groups, zip(bounds[:-1], bounds[1:])):
                tot = sum(wt[i] for i in g); c = t0
                for i in g: dd = (t1 - t0) * wt[i] / tot; spans[i] = (c, c + dd); c += dd
            mode = "anchored"
        else:
            tot = sum(wt) + 3 * len(br); c = 0.0; spans = []
            for i, t in enumerate(toks):
                dd = dur * wt[i] / tot; spans.append((c, c + dd)); c += dd + (dur * 3 / tot if i in br else 0)
            sc_ = dur / c; spans = [(a * sc_, b * sc_) for a, b in spans]; mode = "proportional"
        l["timingMode"] = mode
        l["words"] = [{"w": w, "start": l["startFrame"] + round(a * FPS), "end": l["startFrame"] + max(round(b * FPS), round(a * FPS) + 2)} for w, (a, b) in zip(toks, spans)]
        print(l["id"], f"tempo={tempo:.3f} dauer {cur:.2f}->{target:.2f}s {mode}")
TLP.write_text(json.dumps(TL, ensure_ascii=False, indent=1))
