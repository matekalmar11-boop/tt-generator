"""Prüft die Synchronität der Wortzeiten mit der Sprecherspur (Kreuzkorrelation Wortfenster <-> Sprachenergie)."""
import json, sys, wave
import numpy as np
d = sys.argv[1].rstrip('/') + '/'
tl = json.load(open(d + 'timeline.json')); w = wave.open(d + 'vo.wav'); sr = w.getframerate()
a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
hop = int(0.005 * sr); n = int(0.02 * sr)
e = np.sqrt(np.convolve(a * a, np.ones(n) / n, 'same'))[::hop]; v = (e > 0.03 * e.max()).astype(float)
pred = np.zeros_like(v)
for s in tl['sections']:
    for x in s['words']: pred[int(x['a'] / 0.005):int(x['b'] / 0.005)] = 1
sc = []
for lag in range(-60, 61):
    p = np.roll(pred, lag); sc.append(((p * v).sum() / max(1, p.sum()) + ((1 - p) * (1 - v)).sum() / max(1, (1 - p).sum()), lag * 5))
best = max(sc)
inside = (pred * v).sum() / max(1, pred.sum())
print(f"beste Restverschiebung: {best[1]:+d} ms | Anteil Sprache in Wortfenstern: {inside:.0%}")
sys.exit(0 if abs(best[1]) <= 25 else 1)
