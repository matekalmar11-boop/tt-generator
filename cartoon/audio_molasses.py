"""Ton für die Melasse-Story: Moll-Musik + SFX auf Shot-Zeiten. Aufruf: TLDIR=molasses python3 audio_molasses.py out.wav"""
import os, sys
os.environ.setdefault("TLDIR", "molasses")
import numpy as np
import audio as A
from audio import *

S = A.S
cuts = [S('s01', .5), S('s02'), S('s02', .55), S('s03'), S('s04'), S('s04', .5), S('s05'), S('s05', .5), S('s06'), S('s06', .55), S('s07'), S('s08'), S('s08', .55), S('s09'), S('s10'), S('s11'), S('s11', .6), S('s12'), S('s12', .5), S('s13'), S('s14'), S('s14', .55), S('s15'), S('s15', .55), S('s16'), S('s16', .55), S('s17')]
hz = lambda f, d: np.sin(2 * np.pi * f * tt(int(d * SR)))
def squelch(d):
    n = int(d * SR); t = tt(n); x = filt(rng.normal(0, 1, n), "lowpass", 500, 2) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t))
    return x * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.15) * 0.8
def crash():
    n = int(0.9 * SR); t = tt(n); return (filt(rng.normal(0, 1, n), "lowpass", 1800, 2) * ex(n, 0.18) * 0.8 + thud(55, 0.9) * 0.9)[:n]
def rise(d, f0, f1):
    n = int(d * SR); f = np.linspace(f0, f1, n); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, tt(n) / 0.05) * 0.25
def horn(d=1.2):
    n = int(d * SR); t = tt(n); return filt(np.sign(np.sin(2 * np.pi * 110 * t)) * 0.4 + np.sign(np.sin(2 * np.pi * 138 * t)) * 0.3, "lowpass", 700, 2) * np.minimum(1, t / 0.08) * np.minimum(1, (d - t) / 0.3) * 0.6
def spray(d):
    n = int(d * SR); t = tt(n); return bp(rng.normal(0, 1, n), 1500, 7000) * np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.3) * 0.35

def scribble(d):
    n = int(d * SR); t = tt(n); return bp(rng.normal(0, 1, n), 1200, 6000) * (0.5 + 0.5 * np.sin(2 * np.pi * 8 * t)) ** 2 * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.08) * 0.4

def sfx():
    s = np.zeros((2, N)); P = lambda x, t, g=1.0, p=0.0: put(s, x, t, g, p)
    for c in cuts: P(whoosh(0.28), c - 0.12, 0.45, rng.uniform(-.3, .3))
    # Hook: Welle rollt an
    P(rumble(S('s03') - S('s01', 0) - 1.0), 0.0, 0.9); P(thud(48, 1.4), 0.0, 1.0); P(squelch(S('s02', .8) - S('s01', .5)), S('s01', .5), 0.5)
    P(pop(900), S('s02'), 0.9); P(thud(70), S('s02'), 0.7); P(pop(700), S('s02', .55), 0.9); P(thud(70), S('s02', .55), 0.7)
    # Tank
    P(thud(45, 1.6), S('s03') + 0.1, 0.8); P(whirr(S('s04') - S('s03'), 90), S('s03'), 0.25)
    d4 = S('s04', .5) - S('s04'); P(ding(), S('s04') + 0.4 * d4, 0.8); P(rise(0.5 * (S('s04', .5) - S('s04')), 300, 900), S('s04'), 0.5)
    d4b = S('s05') - S('s04', .5)
    for i in range(15): P(thud(90 + 4 * i, 0.3), S('s04', .5) + 0.04 * i * d4b + 0.05, 0.55); P(tok(520 + 25 * i), S('s04', .5) + 0.04 * i * d4b + 0.05, 0.5)
    P(pop(600), S('s04', .5) + 0.5 * d4b, 0.8)
    # Alkohol & Sprengstoff
    d5 = S('s05', .5) - S('s05')
    for i in range(5): P(clink(2200 + 200 * i), S('s05') + i * 0.1 * d5, 0.7, rng.uniform(-.4, .4))
    d5b = S('s06') - S('s05', .5); tc = S('s05', .5) + 0.35 * d5b; P(crash(), tc, 1.0); P(thud(40, 1.2), tc, 1.0); P(whoosh(0.5), tc + 0.05, 0.6)
    # Leck, Pinsel
    t = S('s06') + 0.2
    while t < S('s07'): P(clink(1200 + 400 * rng.random()) * 0.6, t, 0.35, rng.uniform(-.3, .3)); t += 0.3 + 0.2 * rng.random()
    t = S('s07') + 0.2
    while t < S('s08') - 0.3: P(scribble(0.45), t, 0.6); t += 0.85
    # Wärme
    P(rise(S('s08', .55) - S('s08'), 250, 1300), S('s08'), 0.5); P(chime(880, 1.2), S('s08', .55) - 0.1, 0.7)
    # Tank ächzt
    P(creak(S('s10') - S('s09')), S('s09'), 1.0); P(thud(38, S('s10') - S('s09')), S('s09'), 0.6)
    t = S('s09') + 0.3; gap = 0.5
    while t < S('s10') + 0.5: P(tok(1700 + 200 * rng.random()), t, 0.8, rng.uniform(-.4, .4)); gap = max(0.07, gap * 0.82); t += gap
    # Explosion
    tb = S('s10') + 0.55
    P(thud(35, 2.0), tb, 1.4); P(crash(), tb, 1.3); P(clink(1500), tb + 0.05, 0.9); P(sfx_burst(), tb, 0.7); P(squelch(S('s11') - tb + 1.0), tb + 0.1, 0.8)
    # Welle zerstört Häuser (Zeitpunkt, an dem die Front jedes Hauses erreicht)
    d11a = S('s11', .6) - S('s11')
    for z in [-20.8, -13.6, -6.4, 0.8]:
        u = (z - 3.3 + 30) / 32; P(crash(), S('s11') + max(0, min(1, u)) * d11a, 0.9, -0.4); 
    d11b = S('s12') - S('s11', .6)
    for z in [8, 0.8]:
        u = (z - 3.3 - 2) / 9; P(crash(), S('s11', .6) + max(0, min(1, u)) * d11b, 0.9, 0.4)
    P(squelch(S('s12') - S('s11')), S('s11'), 0.7)
    # Opfer
    P(chime(196, 3.0), S('s12'), 0.8); P(chime(147, 3.0), S('s12') + 0.1, 0.7); d12 = S('s12', .5) - S('s12'); P(thud(60), S('s12') + 0.2 * d12 + 0.0, 0.6); P(thud(60), S('s12', .5) + 0.0, 0.6)
    t = S('s13') + 0.2
    while t < S('s14'): P(squelch(0.3), t, 0.55, rng.uniform(-.3, .3)); t += 0.98
    # Hafen
    P(horn(1.3), S('s14'), 0.8); P(spray(S('s14', .55) - S('s14')), S('s14'), 0.7)
    # Gericht
    d15 = S('s15', .55) - S('s15'); P(pop(500), S('s15'), 0.8)
    d15b = S('s16') - S('s15', .55); P(pop(300), S('s15', .55) + 0.15 * d15b, 0.9)
    t = S('s15', .55) + 0.4 * d15b
    while t < S('s16') - 0.05: P(thud(120, 0.25), t, 1.0); P(tok(450), t, 0.9); t += np.pi / 9.0
    # Gesetz
    d16 = S('s16', .55) - S('s16'); ts = S('s16') + 0.8 * d16; P(thud(70, 0.5), ts, 1.0); P(ding(), ts, 0.7); P(cash(), ts + 0.05, 0.5)
    d16b = S('s17') - S('s16', .55)
    for i in range(6): P(pop(500 + 60 * i), S('s16', .55) + 0.08 * i + 0.1, 0.7)
    # Finale
    P(sparkle(), S('s17') + 0.2, 0.9); P(chime(784, 2.4), S('s17') + 0.1, 0.8); P(chime(988, 2.4), S('s17') + 0.5, 0.6)
    return s
def sfx_burst():
    n = int(0.6 * SR); return bp(rng.normal(0, 1, n), 200, 6000) * ex(n, 0.12) * 0.9

if __name__ == "__main__":
    _music = A.music
    A.music = lambda: _music(bpm=100, prog=[(57, [69, 72, 76]), (50, [62, 65, 69]), (52, [64, 68, 71]), (57, [69, 72, 76])])
    A.sfx_track = sfx
    A.mix(sys.argv[1])
