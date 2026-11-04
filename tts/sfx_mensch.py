"""Musik für „Der letzte Mensch“ (eigene Synthese, numpy + wave, lizenzfrei): music_mensch.wav.
Struktur (Sekunden im Film): 0–20,6 leere Stadt (kalte Pads, einzelne Glockentöne) · 20,6–24,8 kurzer Moment Freiheit (Dur-Pad, Arpeggio) ·
24,8–32,6 Stille/Telefon · 29–49,5 dunkle Drohne · 38,2–46 Herzschlag + Riser · 46–49,5 Clustersteigerung · 49,5 harter Schnitt (Schwarz).
Aufruf: tts/.venv/bin/python tts/sfx_mensch.py [gesamtlaenge] """
import sys, wave
from pathlib import Path
import numpy as np
SR = 44100
OUT = Path(__file__).resolve().parent.parent / "public/audio"
rng = np.random.default_rng(7)
# Aufruf: sfx_mensch.py <gesamt> <freiheit> <klingeln> <zelle> <anruf> <schritte> <umdrehen> <laecheln> <schwarz>   (Startzeiten der Szenen in s)
A = [float(x) for x in sys.argv[1:]] if len(sys.argv) > 1 else [50.3, 20.6, 24.8, 29.0, 32.6, 38.2, 42.0, 46.0, 49.5]
D, T_FREI, T_RING, T_ZELLE, T_ANRUF, T_STEP, T_UMD, T_LACH, CUT = A
N = int(D * SR); y = np.zeros(N); T = np.arange(N) / SR

def env(t0, t1, a=0.8, r=1.2):
    e = np.zeros(N); i0, i1 = int(t0 * SR), min(N, int(t1 * SR))
    tt = (np.arange(i0, i1) / SR) - t0; L = t1 - t0
    e[i0:i1] = np.minimum(1, tt / a) * np.minimum(1, (L - tt) / r)
    return e

def pad(freqs, t0, t1, amp, a=1.5, r=1.5, trem=0.15):
    e = env(t0, t1, a, r); s = np.zeros(N)
    for k, f in enumerate(freqs):
        s += np.sin(2 * np.pi * f * T + k) * (1 + trem * np.sin(2 * np.pi * (0.13 + 0.03 * k) * T + k))
    return s * e * amp / len(freqs)

def bell(f, t0, amp, dur=3.0):
    i0 = int(t0 * SR); n = min(N - i0, int(dur * SR))
    if n <= 0: return
    tt = np.arange(n) / SR
    y[i0:i0 + n] += amp * (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * 2.76 * f * tt) * np.exp(-3 * tt)) * np.exp(-1.6 * tt)

def thump(t0, amp):
    i0 = int(t0 * SR); n = min(N - i0, int(0.22 * SR))
    if n <= 0: return
    tt = np.arange(n) / SR
    y[i0:i0 + n] += amp * np.sin(2 * np.pi * (70 - 30 * tt / 0.22) * tt) * np.exp(-18 * tt)

# 1) leere Stadt: kalte Quinte + Moll, einzelne Glocken
y += pad([110, 164.8, 220], 0, T_FREI, 0.55, a=2.0, r=1.0)
y += pad([82.4, 123.5], 0, T_RING, 0.4, a=2.0, r=0.4)
for t, f in [(1.0, 659.3), (4.2, 493.9), (7.8, 587.3), (11.0, 392.0), (14.3, 659.3), (17.5, 493.9)]:
    if t < T_FREI: bell(f, t, 0.18)
# 2) kurzer Moment Freiheit: Dur, helles Arpeggio
y += pad([261.6, 329.6, 392.0, 523.3], T_FREI, T_RING, 0.5, a=0.5, r=0.2, trem=0.05)
for i, f in enumerate([261.6, 329.6, 392.0, 523.3] * 3):
    if T_FREI + 0.1 + i * 0.33 < T_RING: bell(f * 2, T_FREI + 0.1 + i * 0.33, 0.12, 1.2)
# Abbruch beim Klingeln
y *= np.where((T > T_RING) & (T < T_ZELLE), np.exp(-(T - T_RING) * 3), 1.0)
# 3) dunkle Drohne ab 29 s
drone = (np.sin(2 * np.pi * 41.2 * T) + np.sin(2 * np.pi * 43.7 * T) + 0.5 * np.sin(2 * np.pi * 82.4 * T)) * env(T_ZELLE, CUT, 3.5, 0.1)
y += drone * 0.45
y += pad([98.0, 116.5, 146.8], T_ANRUF, CUT, 0.35, a=2.5, r=0.1, trem=0.3)
# 4) Herzschlag, wird schneller (38,2 → 46 s)
t = T_STEP; bpm = 62
while t < T_LACH:
    thump(t, 0.7); thump(t + 0.22, 0.45); t += 60.0 / bpm; bpm += (112 - 62) * (60.0 / bpm) / (T_LACH - T_STEP)
# Riser: gefiltertes Rauschen
noise = rng.standard_normal(N); X = np.fft.rfft(noise); f = np.fft.rfftfreq(N, 1 / SR); X *= (f > 1500) * (f < 7000); noise = np.fft.irfft(X, N)
y += noise * env(T_STEP, CUT, 7.0, 0.05) * 0.09 * np.clip((T - T_STEP) / 8, 0, 1) ** 2
# 5) Cluster-Steigerung 46–49,5
y += pad([220, 233.1, 246.9, 261.6, 277.2], T_LACH, CUT, 0.6, a=3.0, r=0.03, trem=0.4)
# harter Schnitt bei CUT, danach Stille
y *= (T <= CUT)
y = y / (np.max(np.abs(y)) + 1e-9) * 0.82
x = (y * 32767).astype("<i2")
with wave.open(str(OUT / "music_mensch.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(x.tobytes())
print(f"music_mensch.wav {D:.1f} s (Schnitt bei {CUT} s)")
