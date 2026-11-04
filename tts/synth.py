"""Deutsche Sprachsynthese (offline, kostenlos): sherpa-onnx + Piper-Stimme "Thorsten" (CC0).
Liest story/script.json, erzeugt public/audio/vo_*.wav und src/story/timeline.json."""
import json, re, subprocess, sys, wave
from pathlib import Path
import numpy as np
from piper import PiperVoice, SynthesisConfig

ROOT = Path(__file__).resolve().parent.parent
MODEL = ROOT / "tts/models/vits-piper-de_DE-thorsten-medium"
OUT = ROOT / "public/audio"
OUT.mkdir(parents=True, exist_ok=True)
script = json.loads((ROOT / "story/script.json").read_text())
FPS = script["fps"]

voice = PiperVoice.load(str(MODEL / "de_DE-thorsten-medium.onnx"))
SR = voice.config.sample_rate
CFG = SynthesisConfig(length_scale=1.08, noise_scale=0.6, noise_w_scale=0.7)

def speak(text):
    """Satzweise synthetisieren, mit kurzer Pause zwischen den Sätzen verbinden."""
    parts = []
    for sent in re.split(r"(?<=[.!?])\s+", text.strip()):
        x = np.concatenate([c.audio_float_array for c in voice.synthesize(sent, CFG)])
        parts.append(trim(x)); parts.append(np.zeros(int(0.24 * SR), dtype=np.float32))
    return np.concatenate(parts[:-1])

def write_wav(path, x, sr):
    x = np.clip(x, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((x * 32767).astype("<i2").tobytes())

def read_wav(path):
    with wave.open(str(path)) as w:
        return np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32767, w.getframerate()

def trim(x, thr=0.008):
    idx = np.where(np.abs(x) > thr)[0]
    return x[max(0, idx[0] - int(0.03 * SR)): idx[-1] + int(0.08 * SR)]

def internal_pauses(x, min_len=0.11, win=0.01):
    """Stille-Lücken im Satz (Sekunden) -> Anker für Wort-Timing an Satzzeichen."""
    n = int(win * SR); e = np.array([np.sqrt(np.mean(x[i:i+n] ** 2)) for i in range(0, len(x) - n, n)])
    quiet = e < 0.012; res = []; i = 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]: j += 1
            if (j - i) * win >= min_len and i > 5 and j < len(quiet) - 5: res.append((i * win, j * win))
            i = j
        else: i += 1
    return res

def word_timing(text, dur, pauses):
    """Verteilt Wortzeiten über die Sprechdauer; Satzzeichen-Pausen werden mit gemessenen Stillen verankert."""
    toks = text.split()
    breaks = [i for i, t in enumerate(toks[:-1]) if re.search(r"[.,!?:;]$", t)]
    w = [max(2, len(re.sub(r"\W", "", t))) + (1.5 if re.search(r"[aeiouäöü]{2}", t.lower()) else 0) for t in toks]
    if breaks and len(pauses) >= len(breaks):
        pauses = sorted(sorted(pauses, key=lambda p: p[1] - p[0], reverse=True)[:len(breaks)])
        bounds = [0.0] + [(a + b) / 2 for a, b in pauses] + [dur]
        groups = []; s = 0
        for b in breaks + [len(toks) - 1]:
            groups.append(list(range(s, b + 1))); s = b + 1
        out = [None] * len(toks)
        for g, (t0, t1) in zip(groups, zip(bounds[:-1], bounds[1:])):
            tot = sum(w[i] for i in g); c = t0
            for i in g:
                d = (t1 - t0) * w[i] / tot; out[i] = (c, c + d); c += d
        return toks, out, "anchored"
    tot = sum(w) + 3 * len(breaks); c = 0.0; out = []
    for i, t in enumerate(toks):
        d = dur * w[i] / tot; out.append((c, c + d)); c += d + (dur * 3 / tot if i in breaks else 0)
    scale = dur / c
    return toks, [(a * scale, b * scale) for a, b in out], "proportional"

timeline = {"fps": FPS, "scenes": []}
cursor = 0
GAP = 0.28
for sc in script["scenes"]:
    t = sc["pre"]; lines = []
    for ln in sc["lines"]:
        x = speak(ln["text"])
        raw = OUT / f"_raw_{ln['id']}.wav"; write_wav(raw, x * 0.9, SR)
        final = OUT / f"vo_{ln['id']}.wav"
        if ln["voice"] == "dragon":  # tiefere, hallende Drachenstimme
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af",
                f"asetrate={int(SR*0.78)},aresample={SR},atempo=1.2,lowpass=f=3800,aecho=0.8:0.6:60|120:0.35|0.2,loudnorm=I=-16:TP=-1.5",
                "-ar", "44100", str(final)], check=True)
        else:
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af", "loudnorm=I=-16:TP=-1.5",
                            "-ar", "44100", str(final)], check=True)
        raw.unlink()
        y, sr = read_wav(final)
        d = len(y) / sr
        # Wort-Timing auf der (ggf. bearbeiteten) Datei bestimmen
        pauses = []
        n = int(0.01 * sr); e = np.array([np.sqrt(np.mean(y[i:i+n] ** 2)) for i in range(0, len(y) - n, n)])
        thr = 0.012 if ln["voice"] != "dragon" else 0.02
        q = e < thr; i = 0
        while i < len(q):
            if q[i]:
                j = i
                while j < len(q) and q[j]: j += 1
                if (j - i) * 0.01 >= 0.11 and i > 5 and j < len(q) - 5: pauses.append((i * 0.01, j * 0.01))
                i = j
            else: i += 1
        toks, spans, mode = word_timing(ln["text"], d, pauses)
        nf = int(np.ceil(d * FPS)); w_ = int(sr / FPS)
        env = np.array([np.sqrt(np.mean(y[i*w_:(i+1)*w_] ** 2)) if len(y[i*w_:(i+1)*w_]) else 0 for i in range(nf)])
        env = np.clip(env / (np.percentile(env, 90) + 1e-9), 0, 1)  # Lippensync-Hüllkurve pro Videoframe
        start = cursor + round(t * FPS)
        lines.append({"id": ln["id"], "text": ln["text"], "voice": ln["voice"], "file": f"audio/vo_{ln['id']}.wav",
            "startFrame": start, "durationFrames": int(np.ceil(d * FPS)), "seconds": round(d, 3), "timingMode": mode, "env": [round(float(v), 2) for v in env],
            "words": [{"w": w_, "start": start + round(a * FPS), "end": start + max(round(b * FPS), round(a * FPS) + 2)} for w_, (a, b) in zip(toks, spans)]})
        print(f"{ln['id']} {d:5.2f}s {mode:12s} {ln['text'][:50]}")
        t += d + GAP
    dur = round((t - GAP + sc["post"]) * FPS)
    timeline["scenes"].append({"id": sc["id"], "startFrame": cursor, "durationFrames": dur, "lines": lines})
    cursor += dur
timeline["totalFrames"] = cursor
(ROOT / "src/story/timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1))
print("TOTAL", cursor, "frames =", round(cursor / FPS, 1), "s")
