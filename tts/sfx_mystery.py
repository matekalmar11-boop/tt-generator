"""Zusätzliche prozedurale Sounds für „Die Nachricht von morgen“ (numpy + wave, lizenzfrei, keine externen Dateien).
Erzeugt NUR die neuen Dateien (ping, ring, shutter, beep_drop, door_latch, music_mystery) – bestehende Sounds bleiben unberührt.
Aufruf: tts/.venv/bin/python tts/sfx_mystery.py [name …]"""
import sys, wave
from pathlib import Path
import numpy as np

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "public/audio"
rng = np.random.default_rng(11)
T = lambda d: np.arange(int(d * SR)) / SR

def fft_filter(x, lo=None, hi=None, edge=0.15):
    """Bandfilter über FFT mit weichen Flanken (lo = Hochpass-Grenze, hi = Tiefpass-Grenze in Hz)."""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo: m *= np.clip((f - lo * (1 - edge)) / (lo * edge * 2 + 1e-9), 0, 1)
    if hi: m *= np.clip((hi * (1 + edge) - f) / (hi * edge * 2 + 1e-9), 0, 1)
    return np.fft.irfft(X * m, len(x))

def reverb(x, wet=0.25, tail=1.8):
    n = int(tail * SR); ir = rng.standard_normal(n) * np.exp(-5.5 * np.arange(n) / n); ir /= np.abs(ir).sum() / 8
    L = len(x) + n; y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[:len(x)]
    return x * (1 - wet) + y * wet

def save(name, x, peak=0.85):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    a = int(0.004 * SR); x[:a] *= np.linspace(0, 1, a); x[-a:] *= np.linspace(1, 0, a)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype("<i2").tobytes())
    print(f"{name}.wav  {len(x) / SR:.2f} s")

def tone(f, d, k):
    t = T(d); return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-k * t)

def ping():                       # Benachrichtigung: zwei helle Glockentöne
    y = np.zeros(int(0.9 * SR)); a = tone(1318.5, 0.9, 7); b = tone(1760, 0.8, 8)
    y += a * 0.8; s = int(0.11 * SR); y[s:s + len(b)] += b[:len(y) - s] * 0.7
    return reverb(y, 0.18, 0.8)

def ring():                       # Telefon: ein Ruf aus vier Doppeltönen (in der Szene vor dem Abheben)
    y = np.zeros(int(1.0 * SR))
    for call in (0.0,):
        for i in range(4):
            s = int((call + i * 0.2) * SR); d = 0.12; t = T(d)
            seg = (np.sin(2 * np.pi * 1046.5 * t) + np.sin(2 * np.pi * 1318.5 * t)) * np.minimum(1, np.minimum(t / 0.01, (d - t) / 0.02))
            y[s:s + len(seg)] += seg
    return y

def shutter():                    # Kamera-Auslöser: zwei Klicks
    y = np.zeros(int(0.45 * SR))
    for off, d, lo, hi, g in ((0.0, 0.03, 1500, 7000, 1.0), (0.09, 0.06, 300, 3000, 0.8)):
        n = int(d * SR); c = fft_filter(rng.standard_normal(n), lo, hi) * np.exp(-60 * np.arange(n) / SR) * g
        s = int(off * SR); y[s:s + n] += c
    return y

def beep_drop():                  # Verbindung weg: drei absteigende Pieptöne
    y = np.zeros(int(1.0 * SR))
    for i, f in enumerate((620, 520, 430)):
        d = 0.14; t = T(d); s = int(i * 0.22 * SR)
        y[s:s + len(t)] += np.sin(2 * np.pi * f * t) * np.minimum(1, np.minimum(t / 0.01, (d - t) / 0.02))
    return y

def door_latch():                 # langsames Knarren der Klinke, am Ende ein metallisches Klacken
    d = 2.4; t = T(d); n = len(t)
    f = 190 - 70 * (t / 1.7).clip(0, 1) + 6 * np.sin(2 * np.pi * 5 * t)
    saw = ((np.cumsum(f) / SR) % 1) * 2 - 1
    stick = (rng.random(n // 400 + 2)); stick = np.interp(np.arange(n), np.arange(0, n, 400)[:len(stick)], stick[:len(np.arange(0, n, 400))])
    env = np.minimum(1, t / 0.25) * np.clip((1.75 - t) / 0.2, 0, 1) * (0.35 + 0.65 * stick)
    y = fft_filter(saw * env, 280, 2600) * 0.9 + fft_filter(rng.standard_normal(n) * env, 700, 3500) * 0.12
    s = int(1.85 * SR); m = int(0.5 * SR); k = np.arange(m) / SR
    y[s:s + m] += (fft_filter(rng.standard_normal(m), 900, 6000) * np.exp(-90 * k) * 1.2 + np.sin(2 * np.pi * 3100 * k) * np.exp(-40 * k) * 0.5 + np.sin(2 * np.pi * 110 * k) * np.exp(-30 * k) * 0.9)[:len(y) - s]
    return reverb(y, 0.12, 0.6)

def music_mystery(d=40.0):        # dunkle Drohne, kleine Sekunde als Unruhe, Puls wird dichter
    n = int(d * SR); t = T(d); y = np.zeros(n)
    swell = 0.7 + 0.3 * np.sin(2 * np.pi * 0.11 * t)
    for f, g in ((55.0, 0.55), (55.45, 0.45), (82.4, 0.25), (110.0, 0.12)):
        y += np.sin(2 * np.pi * f * t + 0.4 * np.sin(2 * np.pi * 0.07 * t)) * g * swell
    pad = np.zeros(n)
    for f in (220.0, 233.1, 329.6):
        pad += (((np.cumsum(np.full(n, f * (1 + 0.003 * np.sin(2 * np.pi * 0.2 * t)))) / SR) % 1) * 2 - 1) * 0.05
    y += fft_filter(pad, None, 700) * np.clip((t - 3) / 6, 0, 1) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t + 1))
    hi = (np.sin(2 * np.pi * 1760 * t) + np.sin(2 * np.pi * 1864.7 * t)) * 0.012 * np.clip((t - 12) / 10, 0, 1) * (0.5 + 0.5 * np.sin(2 * np.pi * 5.5 * t))
    y += hi
    tm = 5.0
    while tm < d - 2:                                    # Puls: erst 1,0 s, ab 20 s 0,8 s, ab 28 s 0,62 s Abstand
        step = 1.0 if tm < 20 else 0.8 if tm < 28 else 0.62
        s = int(tm * SR); L = int(0.35 * SR)
        if s + L < n:
            k = np.arange(L) / SR; f0 = 70 - 30 * np.minimum(1, k / 0.25)
            y[s:s + L] += np.sin(2 * np.pi * np.cumsum(f0) / SR) * np.exp(-11 * k) * 0.5 * min(1, (tm - 5) / 12 + 0.35)
        tm += step
    y = reverb(y, 0.22, 2.2)
    return y * np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 3.0)

JOBS = {"ping": ping, "ring": ring, "shutter": shutter, "beep_drop": beep_drop, "door_latch": door_latch, "music_mystery": music_mystery}
if __name__ == "__main__":
    for name in (sys.argv[1:] or JOBS):
        save(name, JOBS[name](), 0.8 if name == "music_mystery" else 0.85)
