"""Prozedurale Sounds für den Film-Erklärtest „Die Truman Show“ (M1): numpy + wave, eigene Synthese, keine Fremdaufnahmen.
Erzeugt NUR neue Dateien; bestehende Sounds bleiben unberührt.   Aufruf: tts/.venv/bin/python tts/sfx_truman.py [name …]"""
import sys, wave
from pathlib import Path
import numpy as np

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "public/audio"
rng = np.random.default_rng(23)
T = lambda d: np.arange(int(d * SR)) / SR

def fft_filter(x, lo=None, hi=None, edge=0.15):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo: m *= np.clip((f - lo * (1 - edge)) / (lo * edge * 2 + 1e-9), 0, 1)
    if hi: m *= np.clip((hi * (1 + edge) - f) / (hi * edge * 2 + 1e-9), 0, 1)
    return np.fft.irfft(X * m, len(x))

def reverb(x, wet=0.25, tail=1.2):
    n = int(tail * SR); ir = rng.standard_normal(n) * np.exp(-5.5 * np.arange(n) / n); ir /= np.abs(ir).sum() / 8
    L = len(x) + n; y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[:len(x)]
    return x * (1 - wet) + y * wet

def save(name, x, peak=0.85):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    a = int(0.004 * SR); x[:a] *= np.linspace(0, 1, a); x[-a:] *= np.linspace(1, 0, a)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype("<i2").tobytes())
    print(f"{name}.wav  {len(x) / SR:.2f} s")

def add(y, x, at):
    s = int(at * SR); n = min(len(x), len(y) - s)
    if n > 0: y[s:s + n] += x[:n]

def rec_beep():                      # kurzer Kamera-Piepton (REC startet)
    y = np.zeros(int(0.5 * SR)); t = T(0.09)
    b = np.sin(2 * np.pi * 1760 * t) * np.minimum(1, np.minimum(t / 0.005, (0.09 - t) / 0.01))
    add(y, b, 0.0); add(y, b, 0.16); return y

def live_sting():                    # Sendebeginn: heller Aufwärts-Akkord + Luftrauschen
    d = 1.3; t = T(d); y = np.zeros(len(t))
    for i, f in enumerate((523.25, 659.25, 783.99, 1046.5)):
        s = int(i * 0.07 * SR); tt = T(d - i * 0.07)
        add(y, (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-3.2 * tt) * 0.6, i * 0.07)
    n = fft_filter(rng.standard_normal(len(t)), 2500, 9000) * np.exp(-9 * t) * 0.5
    return reverb(y + n, 0.22, 0.9)

def cam_servo():                     # leises Motorsurren, wenn die Linse nachführt
    d = 0.7; t = T(d); f = 330 + 160 * np.sin(np.pi * np.clip(t / d, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = (np.sin(ph) + 0.4 * np.sin(2 * ph)) * np.minimum(1, np.minimum(t / 0.08, (d - t) / 0.12))
    return y * 0.5 + fft_filter(rng.standard_normal(len(t)), 800, 3500) * 0.08 * np.minimum(1, t / 0.1)

def cable_snap():                    # Kabel reißt: Peitschenknall + metallisches Zischen
    d = 0.6; t = T(d); n = int(0.03 * SR)
    snap = np.zeros(len(t)); snap[:n] = fft_filter(rng.standard_normal(n), 2000, 12000) * np.exp(-90 * np.arange(n) / SR)
    zing = np.sin(2 * np.pi * (2400 - 1400 * t / d) * t) * np.exp(-9 * t) * 0.3
    return snap * 1.4 + zing

def fall_whistle():                  # fallendes Objekt: absinkender Pfeifton wird lauter, dazu Windrauschen
    d = 0.95; t = T(d); f = 1500 - 900 * (t / d) ** 0.8
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = (t / d) ** 1.6
    return (np.sin(ph) * 0.45 + fft_filter(rng.standard_normal(len(t)), 500, 4000) * 0.55) * env

def light_crash():                   # Einschlag: Wumms, Metallklang, Glasscherben, Nachklappern
    d = 2.2; t = T(d); y = np.zeros(len(t))
    thud = np.sin(2 * np.pi * (95 - 55 * np.minimum(1, t / 0.25)) * t) * np.exp(-9 * t) * 1.6
    nz = fft_filter(rng.standard_normal(len(t)), 150, 6000) * np.exp(-18 * t) * 1.0
    clang = sum(np.sin(2 * np.pi * f * t) * np.exp(-k * t) for f, k in ((420, 7), (673, 9), (1180, 11), (1710, 14))) * 0.35
    glass = np.zeros(len(t))
    for i in range(34):
        at = 0.015 + (rng.random() ** 1.7) * 0.9; n = int(0.02 * SR)
        g = fft_filter(rng.standard_normal(n), 3000, 14000) * np.exp(-110 * np.arange(n) / SR) * (0.5 + rng.random() * 0.5)
        add(glass, g, at)
    y = thud + nz + clang + glass * 0.9
    for at, g in ((0.55, 0.30), (0.78, 0.2), (1.0, 0.12)):             # Klappern der Trümmer
        n = int(0.09 * SR); add(y, fft_filter(rng.standard_normal(n), 500, 5000) * np.exp(-50 * np.arange(n) / SR) * g, at)
    return reverb(y, 0.2, 0.7)

def music_show(d=22.0):              # Sendermusik: fröhlich, leicht überzuckert (Dur-7, Pizzicato), kippt gegen Ende ins Unruhige
    t = T(d); y = np.zeros(len(t)); bpm = 112; beat = 60 / bpm
    chords = [(261.63, 329.63, 392.0, 493.88), (220.0, 261.63, 329.63, 392.0), (174.61, 220.0, 261.63, 329.63), (196.0, 246.94, 293.66, 349.23)]
    for bar in range(int(d / (beat * 4)) + 1):
        ch = chords[bar % 4]; t0 = bar * beat * 4
        for i in range(8):                                   # Achtel-Arpeggio
            f = ch[[0, 1, 2, 3, 2, 1, 2, 1][i]] * (2 if i % 2 else 1)
            tt = T(0.38); n = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)) * np.exp(-9 * tt) * 0.5
            add(y, n, t0 + i * beat / 2)
        tt = T(beat * 3.8); pad = sum(np.sin(2 * np.pi * f * tt) for f in ch) * 0.1 * np.minimum(1, tt / 0.3) * np.minimum(1, (beat * 3.8 - tt) / 0.4)
        add(y, pad, t0)
        tt = T(0.5); add(y, np.sin(2 * np.pi * (ch[0] / 2) * tt) * np.exp(-5 * tt) * 0.5, t0)     # Bass
        add(y, np.sin(2 * np.pi * (ch[0] / 2) * tt) * np.exp(-5 * tt) * 0.4, t0 + beat * 2)
    # ab ~12 s leises, tiefes Schweben darunter (etwas stimmt nicht)
    ramp = np.clip((t - 11.0) / 8.0, 0, 1)
    y += np.sin(2 * np.pi * 58 * t) * 0.28 * ramp + np.sin(2 * np.pi * 61.5 * t) * 0.22 * ramp
    return reverb(y, 0.15, 1.2)

def music_show_long():
    return music_show(56.0)

JOBS = {"rec_beep": rec_beep, "live_sting": live_sting, "cam_servo": cam_servo, "cable_snap": cable_snap,
        "fall_whistle": fall_whistle, "light_crash": light_crash, "music_show": music_show, "music_show_long": music_show_long}

if __name__ == "__main__":
    for name in (sys.argv[1:] or JOBS):
        save(name, JOBS[name]())
