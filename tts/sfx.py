"""Prozedural erzeugte Soundeffekte + Hintergrundmusik (numpy, lizenzfrei, keine externen Dateien)."""
from pathlib import Path
import numpy as np
from scipy import signal
import soundfile as sf

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "public/audio"
rng = np.random.default_rng(7)
t_ = lambda d: np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def env_exp(d, k): return np.exp(-k * t_(d))
def lp(x, f, o=4): return signal.sosfilt(signal.butter(o, f, "low", fs=SR, output="sos"), x)
def hp(x, f, o=4): return signal.sosfilt(signal.butter(o, f, "high", fs=SR, output="sos"), x)
def bp(x, f0, f1, o=3): return signal.sosfilt(signal.butter(o, [f0, f1], "band", fs=SR, output="sos"), x)
def fade(x, a=0.005, b=0.02):
    x = x.copy(); na, nb = int(a * SR), int(b * SR); x[:na] *= np.linspace(0, 1, na); x[-nb:] *= np.linspace(1, 0, nb); return x
def norm(x, peak=0.9): return x / (np.max(np.abs(x)) + 1e-9) * peak
def save(name, x, peak=0.9): sf.write(OUT / f"{name}.wav", fade(norm(x, peak)).astype(np.float32), SR, subtype="PCM_16")
def reverb(x, wet=0.3, tail=1.2):
    ir = noise(tail) * np.exp(-4.5 * t_(tail)); ir = lp(ir, 5000)
    y = signal.fftconvolve(x, ir)[: len(x) + int(tail * SR)]
    x = np.pad(x, (0, len(y) - len(x))); return x * (1 - wet) + y / (np.max(np.abs(y)) + 1e-9) * np.max(np.abs(x)) * wet * 2
def sweep(d, f0, f1, shape="exp"):
    f = np.geomspace(f0, f1, int(d * SR)) if shape == "exp" else np.linspace(f0, f1, int(d * SR))
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def saw(f, d): return signal.sawtooth(2 * np.pi * np.cumsum(np.full(int(d * SR), f) if np.isscalar(f) else f) / SR)

# --- Soundeffekte ---
def crack():
    d = 1.4; n = hp(noise(d), 1500) * env_exp(d, 18)
    thump = sweep(d, 120, 35) * env_exp(d, 6)
    ticks = sum(np.roll(hp(noise(d), 3000) * env_exp(d, 60), int(s * SR)) for s in (0.05, 0.11, 0.19, 0.3)) * 0.5
    return reverb(n * 0.8 + thump * 1.2 + ticks, 0.25, 1.0)
def whoosh(d=0.7, f0=300, f1=4000):
    x = noise(d); sw = np.geomspace(f0, f1, len(x)); out = np.zeros_like(x)
    for i in range(0, len(x), 512):
        c = sw[i]; out[i:i+512] = bp(np.pad(x[i:i+512], (256, 256)), c * 0.7, min(c * 1.4, 20000), 2)[256:-256][: len(out[i:i+512])] if False else 0
    y = bp(x, 400, 6000) * np.sin(np.pi * np.linspace(0, 1, len(x))) ** 1.5
    am = np.sin(np.pi * np.linspace(0, 1, len(x))) ** 2
    return lp(x, 1200) * am * 0.6 + hp(x, 2500) * am * (np.linspace(0.2, 1, len(x))) * 0.5
def boom(d=2.2):
    return lp(noise(d), 300) * env_exp(d, 3.5) * 0.7 + sweep(d, 90, 28) * env_exp(d, 2.2) * 1.2
def chime(d=2.2, notes=(587.3, 740, 880, 1174.7, 1480)):
    y = np.zeros(int(d * SR))
    for i, f in enumerate(notes):
        s = int(i * 0.09 * SR); n = len(y) - s
        tone = (np.sin(2 * np.pi * f * np.arange(n) / SR) + 0.35 * np.sin(2 * np.pi * f * 2.76 * np.arange(n) / SR)) * np.exp(-3.2 * np.arange(n) / SR)
        y[s:] += tone
    return reverb(y, 0.4, 1.5)
def riser(d=3.0):
    n = bp(noise(d), 200, 9000); a = np.linspace(0, 1, len(n)) ** 2.2
    return n * a * 0.5 + sweep(d, 80, 900) * a * 0.5 + saw(np.geomspace(60, 400, int(d * SR)), d) * a * 0.15
def roar(d=1.8):
    f0 = np.concatenate([np.geomspace(90, 200, int(0.35 * SR)), np.geomspace(200, 70, int(d * SR) - int(0.35 * SR))])
    f0 = f0 * (1 + 0.04 * np.sin(2 * np.pi * 28 * t_(d)))
    src = saw(f0, d) * 0.6 + noise(d) * 0.5
    y = bp(src, 300, 1200) * 1.0 + bp(src, 1500, 3200) * 0.5 + lp(src, 200) * 0.8
    a = np.minimum(1, t_(d) / 0.12) * np.exp(-1.1 * np.maximum(0, t_(d) - 0.5))
    return reverb(y * a, 0.2, 1.2)
def sword():
    d = 1.0; n = hp(noise(d), 4000) * env_exp(d, 9) * np.minimum(1, t_(d) / 0.15)
    ring = sum(np.sin(2 * np.pi * f * t_(d)) * np.exp(-6 * t_(d)) * a for f, a in ((2400, 1), (3610, 0.6), (5230, 0.4)))
    return reverb(n * 0.8 + ring * 0.5, 0.2, 0.8)
def steps(d=3.0, every=0.42, n=7):
    y = np.zeros(int(d * SR))
    for i in range(n):
        s = int((0.1 + i * every) * SR); L = min(int(0.12 * SR), len(y) - s)
        if L <= 0: break
        y[s:s+L] += lp(noise(0.12)[:L], 500) * np.exp(-40 * np.arange(L) / SR) * (1 if i % 2 else 0.8)
    return y
def wind(d=10.0):
    x = bp(noise(d), 150, 900, 2); m = 0.6 + 0.4 * lp(noise(d), 0.4, 1); m = m / m.max()
    y = x * (0.4 + 0.6 * np.abs(lp(noise(d), 0.7, 1)) / np.abs(lp(noise(d), 0.7, 1)).max())
    return y
def rumble(d=5.0):
    x = lp(noise(d), 90) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t_(d))) * np.minimum(1, t_(d) / 1.2)
    return x + sweep(d, 40, 30) * 0.5
def stinger(d=3.2):
    chord = sum(saw(f, d) * 0.2 for f in (73.4, 110, 116.5, 174.6, 233.1))  # dissonant D-Bb-A cluster
    return reverb(lp(chord, 1600) * env_exp(d, 1.1) + boom(d) * 0.8, 0.3, 1.6)
def heartbeat(d=3.0, bpm=84):
    y = np.zeros(int(d * SR)); step = 60 / bpm
    for i in range(int(d / step)):
        for off, g in ((0, 1), (0.18, 0.7)):
            s = int((i * step + off) * SR); L = int(0.25 * SR)
            if s + L < len(y): y[s:s+L] += sweep(0.25, 80, 40) * np.exp(-16 * t_(0.25)) * g
    return y
def magic_hum(d=4.0):
    y = sum(np.sin(2 * np.pi * f * t_(d) + np.sin(2 * np.pi * 5 * t_(d)) * 0.3) for f in (293.7, 440, 587.3, 880)) * (np.minimum(1, t_(d) / 1.0) * np.minimum(1, (d - t_(d)) / 1.0))
    return reverb(y, 0.35, 1.5) * 0.4

# --- Musik: d-Moll, Pad + Arpeggio + Puls, Spannung steigt ---
def music(d=48.0):
    n = int(d * SR); T = t_(d); out = np.zeros(n)
    chords = [(146.8, 174.6, 220.0), (116.5, 146.8, 174.6), (130.8, 155.6, 196.0), (110.0, 146.8, 164.8)]  # Dm Bb Cm A..
    bar = 4.0
    for b in range(int(d / bar) + 1):
        ch = chords[b % 4]; s = int(b * bar * SR); L = min(int(bar * SR), n - s)
        if L <= 0: break
        seg = np.zeros(L)
        for f in ch:
            for det in (0.996, 1.0, 1.004):
                seg += saw(f * det, L / SR)[:L] * 0.08
        a = np.minimum(1, np.arange(L) / (0.8 * SR)) * np.minimum(1, (L - np.arange(L)) / (0.8 * SR))
        out[s:s+L] += lp(seg, 900 + 90 * b) * a
        bass = np.sin(2 * np.pi * (ch[0] / 2) * np.arange(L) / SR) * 0.25 * a
        out[s:s+L] += bass
    # Arpeggio (ab 8 s), 8tel bei 100 bpm
    step = 60 / 100 / 2
    for i in range(int((d - 8) / step)):
        tm = 8 + i * step; b = int(tm // bar); ch = chords[b % 4]
        f = ch[[0, 1, 2, 1][i % 4]] * 4 if i % 8 < 4 else ch[[2, 1, 0, 1][i % 4]] * 2
        s = int(tm * SR); L = int(0.45 * SR)
        if s + L > n: break
        k = np.arange(L) / SR
        out[s:s+L] += (np.sin(2 * np.pi * f * k) + 0.3 * np.sin(2 * np.pi * 2 * f * k)) * np.exp(-7 * k) * 0.09 * min(1, (tm - 8) / 10 + 0.4)
    # Puls (ab 22 s), wird dichter ab 36 s
    for i in range(int((d - 22) / 0.6)):
        tm = 22 + i * 0.6 * (1 if tm_ < 36 else 0.5) if False else 22 + i * 0.6
        s = int(tm * SR); L = int(0.3 * SR)
        if s + L > n: break
        out[s:s+L] += sweep(0.3, 70, 38) * np.exp(-12 * t_(0.3)) * 0.35 * min(1, (tm - 22) / 10 + 0.3)
    out = reverb(out, 0.25, 2.0)[:n]
    fade_out = np.minimum(1, (d - T) / 3.0)
    return out * fade_out

jobs = {"crack": crack(), "whoosh": whoosh(0.7), "whoosh_fast": whoosh(0.4, 500, 6000), "boom": boom(), "chime": chime(),
        "riser": riser(), "roar": roar(), "sword": sword(), "steps": steps(), "wind": wind(), "rumble": rumble(),
        "stinger": stinger(), "heartbeat": heartbeat(), "magic_hum": magic_hum()}
for k, v in jobs.items(): save(k, v)
save("music", music(), 0.8)
print("ok", sorted(p.name for p in OUT.glob("*.wav") if not p.name.startswith("vo_")))
