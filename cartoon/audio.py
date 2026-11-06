"""Ton: Ryan-Stimme + verspielte Musik + SFX, alles auf die Shot-Zeiten gelegt (synthetisch)."""
import json, wave, sys
import numpy as np
from scipy import signal

SR = 44100
import os
TL = json.load(open(os.environ.get("TLDIR", ".") + "/timeline.json")); TOTAL = TL["total"]
SEG = {s["id"]: s for s in TL["segs"]}
S = lambda i, f=0.0: SEG[i]["start"] + f * (SEG[i]["end"] - SEG[i]["start"])
rng = np.random.default_rng(7)
N = int((TOTAL + 0.3) * SR)
tt = lambda n: np.arange(n) / SR
def filt(x, k, fc, o=4): return signal.sosfilt(signal.butter(o, fc, btype=k, fs=SR, output="sos"), x)
def bp(x, lo, hi): return signal.sosfilt(signal.butter(3, [lo, hi], btype="band", fs=SR, output="sos"), x)
def ex(n, tau): return np.exp(-np.arange(n) / (tau * SR))
def put(buf, x, t0, g=1.0, pan=0.0):
    i = int(t0 * SR)
    if i < 0 or i >= buf.shape[1]: return
    n = min(len(x), buf.shape[1] - i)
    buf[0, i:i + n] += x[:n] * g * (1 - max(0, pan)); buf[1, i:i + n] += x[:n] * g * (1 + min(0, pan))

# ---------------- SFX
def whoosh(d=0.35):
    n = int(d * SR); x = rng.normal(0, 1, n); t = np.linspace(0, 1, n)
    out = bp(x, 400, 3500) * np.sin(np.pi * t) ** 2
    return out * 0.35
def pop(f=520):
    n = int(0.14 * SR); t = tt(n); fr = f * (1 + 0.8 * np.exp(-t / 0.03))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * ex(n, 0.04) * 0.5
def thud(f=70, d=0.45):
    n = int(d * SR); t = tt(n); fr = f * (1 + 1.2 * np.exp(-t / 0.05))
    return (np.sin(2 * np.pi * np.cumsum(fr) / SR) * ex(n, 0.12) + filt(rng.normal(0, 1, n), "lowpass", 300, 2) * ex(n, 0.04) * 0.4) * 0.9
def clink(f=2400):
    n = int(0.5 * SR); t = tt(n)
    return (np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f * 2.76 * t)) * ex(n, 0.09) * 0.25
def tok(f=900):
    n = int(0.09 * SR); t = tt(n)
    return (np.sin(2 * np.pi * f * t) * ex(n, 0.015) + bp(rng.normal(0, 1, n), 1500, 5000) * ex(n, 0.01) * 0.4) * 0.7
def rumble(d):
    n = int(d * SR); t = tt(n)
    x = filt(rng.normal(0, 1, n), "lowpass", 220, 2) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
    return x * np.minimum(1, t / 0.1) * np.minimum(1, (d - t) / 0.2) * 0.8
def chime(f, d=1.4):
    n = int(d * SR); t = tt(n)
    return sum(np.sin(2 * np.pi * f * k * t) * g for k, g in [(1, 1), (2, 0.4), (3.01, 0.2)]) * ex(n, 0.5) * 0.3
def ding():
    return chime(1568, 0.9) * 1.2
def clunk():
    return thud(55, 0.9) + filt(rng.normal(0, 1, int(0.9 * SR)), "bandpass" if False else "lowpass", 900, 2) * ex(int(0.9 * SR), 0.05) * 0.5
def creak(d):
    n = int(d * SR); t = tt(n); f = 160 + 90 * np.sin(2 * np.pi * 1.1 * t) + 30 * t
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5
    return bp(x + rng.normal(0, 0.2, n), 300, 1600) * np.minimum(1, t / 0.1) * np.minimum(1, (d - t) / 0.3) * 0.25
def sizzle(d):
    n = int(d * SR); t = tt(n)
    return filt(rng.normal(0, 1, n), "highpass", 4000, 2) * (rng.random(n // 300 + 2) > 0.4).repeat(300)[:n] * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.15) * 0.2
def whirr(d, f0=180):
    n = int(d * SR); t = tt(n)
    x = np.sign(np.sin(2 * np.pi * f0 * t + 3 * np.sin(2 * np.pi * 5 * t))) * 0.3 + rng.normal(0, 0.05, n)
    return filt(x, "lowpass", 1200, 2) * np.minimum(1, t / 0.15) * np.minimum(1, (d - t) / 0.2) * 0.4
def tick(hi=False):
    n = int(0.06 * SR)
    return (bp(rng.normal(0, 1, n), 1800, 6000) * ex(n, 0.006) + np.sin(2 * np.pi * (1300 if hi else 900) * tt(n)) * ex(n, 0.015)) * 0.4
def cash():
    s = np.zeros(int(1.2 * SR))
    for off, f in [(0, 2000), (0.09, 2600), (0.2, 3100)]:
        c = clink(f); i = int(off * SR); s[i:i + len(c)] += c[:len(s) - i]
    return s + chime(1320, 1.2) * 0.4
def sparkle():
    s = np.zeros(int(1.0 * SR))
    for k, f in enumerate([1760, 2217, 2637, 3520]):
        c = chime(f, 0.5) * 0.5; i = int(k * 0.07 * SR); s[i:i + len(c)] += c[:len(s) - i]
    return s

def sfx_track():
    s = np.zeros((2, N)); P = lambda x, t, g=1.0, p=0.0: put(s, x, t, g, p)
    cuts = [0, S("s01", .62), S("s02"), S("s03"), S("s04"), S("s04", .5), S("s05"), S("s06"), S("s06", .5), S("s07"), S("s08"), S("s09"), S("s09", .55), S("s10"), S("s11"), S("s12"), S("s13"), S("s14"), S("s14", .5), S("s15"), S("s15", .55), S("s16"), S("s17"), S("s17", .36), S("s17", .7), S("s18"), S("s18", .5), S("s19")]
    for i, c in enumerate(cuts[1:]): P(whoosh(0.28), c - 0.12, 0.55, rng.uniform(-.3, .3))
    P(pop(), 0.15, 0.8)
    # s02 Laib rollt herein + Schreck
    P(rumble(S("s03") - S("s02")), S("s02"), 0.7); P(thud(60), S("s03") - 0.12, 0.8)
    # s03 Glitzern
    P(sparkle(), S("s03") + 0.1, 0.8); P(sparkle(), S("s03") + 0.9, 0.6)
    # s04 Waage, Münzen
    P(tok(500), S("s04") + 0.2, 0.7)
    for k in range(8): P(clink(2000 + 150 * (k % 4)), S("s04", .5) + 0.1 + k * 0.12, 0.7, rng.uniform(-.4, .4))
    P(pop(380), S("s04", .5) + 0.5, 0.9)
    # s05 Käserei
    P(whirr(S("s06") - S("s05"), 140), S("s05"), 0.25)
    # s06 Kalender blättern, Uhr
    for k in range(6): P(tok(700 + 40 * k), S("s06") + 0.2 + k * 0.17, 0.55)
    for k in range(int((S("s07") - S("s06", .5)) / 0.12)): P(tick(k % 2), S("s06", .5) + k * 0.12, 0.5)
    # s07 Rechnungen poppen
    for k in range(9): P(pop(420 + 30 * k), S("s07") + 0.06 + (k * 0.07 + 0.1) * (S("s08") - S("s07")) * 0.35, 0.65)
    # s08 Laib rollt zur Bank
    P(rumble(S("s09") - S("s08")), S("s08"), 0.6); P(thud(65), S("s09") - 0.1, 0.9)
    # s09 Banker klopft, Bargeld
    for k in range(6):
        t = S("s09") + (np.pi / 2 + k * np.pi) / 9.0
        if t < S("s09", .55): P(tok(700), t, 0.6)
    P(cash(), S("s09", .55) + 0.05, 0.9); P(pop(300), S("s09", .55) + 0.0, 0.7)
    # s10 Tresortür
    P(creak(1.2), S("s10") + 0.1, 0.8); P(clunk(), S("s10") + 1.0 * (S("s11") - S("s10")) * 0.2 + 0.05, 0.8); P(creak(0.9), S("s10") + 0.45 * (S("s11") - S("s10")), 0.6)
    # s11-12 Regale
    P(whoosh(1.2), S("s11"), 0.5)
    # s13 Roboter
    P(whirr(S("s14") - S("s13"), 200), S("s13"), 0.5); P(whirr(S("s14") - S("s13"), 260), S("s13") + 0.1, 0.3)
    # s14 Brandzeichen
    P(thud(80), S("s14") + 0.25, 0.9); P(sizzle(0.9), S("s14") + 0.3, 0.9); P(ding(), S("s14", .5) + 0.2, 0.6)
    # s15 Klopfen: Hammer trifft bei lt = (pi/2 + k pi)/7
    for k in range(1, 9):
        t = S("s15") + (k * np.pi) / 7.0     # Arm ist bei sin=0 voll nach vorn gestreckt: Hammer trifft den Laib
        if t < S("s15", .55): P(tok(620), t, 0.9)
    P(clink(1700), S("s15", .55) + 0.4, 0.8); P(pop(700), S("s15", .55) + 0.1, 0.6)
    # s16 Wert steigt
    for k in range(14): P(clink(1900 + 110 * k), S("s16") + 0.1 + k * 0.25, 0.4, rng.uniform(-.4, .4))
    P(sparkle(), S("s16") + 0.2, 0.6)
    # s17 Verkauf
    P(ding(), S("s17") + 0.1, 0.9); P(thud(70), S("s17") + 0.05, 0.7); P(cash(), S("s17", .36) + 0.5, 0.8)
    for k in range(14): P(clink(1900 + 130 * (k % 5)), S("s17", .7) + 0.1 + k * 0.1, 0.55, rng.uniform(-.5, .5))
    # s18 Stempel
    P(thud(60, 0.7), S("s18", .5) + 0.35 * (S("s19") - S("s18", .5)) * 0.95, 1.0); P(ding(), S("s18", .5) + 0.35 * (S("s19") - S("s18", .5)) * 0.95, 0.5)
    # s19 Finale
    P(sparkle(), S("s19") + 0.1, 0.9); P(chime(1046, 2.0), S("s19") + 0.1, 0.8); P(chime(1318, 2.0), S("s19") + 0.3, 0.6)
    return s

# ---------------- Musik: leichter, verspielter Zupf-Groove
def note(f, d, kind="pluck"):
    n = int(d * SR); t = tt(n)
    if kind == "pluck":
        x = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) + 0.25 * np.sin(2 * np.pi * 3 * f * t)) * ex(n, 0.16)
    elif kind == "bass":
        x = (np.sin(2 * np.pi * f * t) + 0.4 * np.sign(np.sin(2 * np.pi * f * t))) * ex(n, 0.22); x = filt(x, "lowpass", 600, 2)
    else:
        x = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)) * ex(n, 0.5)
    return x * np.minimum(1, t / 0.004)
def kick():
    n = int(0.25 * SR); t = tt(n); return np.sin(2 * np.pi * np.cumsum(55 + 110 * np.exp(-t / 0.04)) / SR) * ex(n, 0.09)
def hat(): n = int(0.05 * SR); return filt(rng.normal(0, 1, n), "highpass", 7000, 2) * ex(n, 0.012) * 0.4
def rim(): n = int(0.08 * SR); return (np.sin(2 * np.pi * 1100 * tt(n)) + bp(rng.normal(0, 1, n), 1500, 6000) * 0.5) * ex(n, 0.02) * 0.5
def music(bpm=120, prog=None, mix_=1.0):
    m = np.zeros((2, N)); P = lambda x, t, g, p=0.0: put(m, x, t, g, p)
    beat = 60 / bpm
    A = lambda midi: 440 * 2 ** ((midi - 69) / 12)
    prog = prog or [(57, [69, 72, 76]), (53, [65, 69, 72]), (48, [67, 72, 76]), (55, [67, 71, 74])]   # Am F C G
    arps = [0, 1, 2, 1, 0, 1, 2, 1]
    t = 0.0; bar = 0
    while t < TOTAL:
        root, ch = prog[bar % 4]
        for b in range(4):
            tb = t + b * beat
            P(note(A(root - (12 if b % 2 == 0 else 0) if True else root), beat * 0.9, "bass"), tb, 0.5)
            P(kick(), tb, 0.55) if b in (0, 2) else P(rim(), tb, 0.35)
            for h in range(2): P(hat(), tb + h * beat / 2, 0.22 if h else 0.3)
            for q in range(2):
                tq = tb + q * beat / 2
                P(note(A(ch[arps[(b * 2 + q) % 8]] + (12 if (bar // 2) % 2 and q else 0) * 0 if False else A(ch[arps[(b * 2 + q) % 8]])), beat * 0.45, "pluck"), tq, 0.42, (-0.2 if q else 0.2))
        t += 4 * beat; bar += 1
    m = m / np.abs(m).max() * 0.6
    # Fade am Ende
    n = N; fade = np.clip((TOTAL - 0.2 - np.arange(n) / SR) / 1.2, 0, 1); m *= fade
    # Intro etwas leiser, dann voller
    m *= np.clip(0.55 + np.arange(n) / SR / 4, 0, 1)
    return m

def vo():
    w = wave.open(os.environ.get("TLDIR", ".") + "/vo.wav"); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768; sr = w.getframerate()
    a = signal.resample_poly(a, SR, sr); a = filt(a, "highpass", 80, 2)
    a = a + 0.30 * bp(a, 2200, 5500) - 0.12 * bp(a, 180, 420)    # Präsenz/Klarheit, Dröhnen raus
    env = filt(np.abs(a), "lowpass", 12, 1) + 1e-4              # Kompressor: Lautstärke der Sätze angleichen
    g = np.clip((0.10 / env) ** 0.65, 0.6, 3.5); g = filt(g, "lowpass", 20, 1)
    a = a * g; a = np.tanh(a * 1.4) / 1.4
    v = np.zeros((2, N)); v[0, :min(N, len(a))] = a[:N]; v[1] = v[0]; return v

def mix(path):
    v = vo(); m = music(); s = sfx_track()
    env = filt(np.abs(v[0]), "lowpass", 8, 1); env = np.clip(env / 0.12, 0, 1); env = filt(env, "lowpass", 5, 1)
    k = np.clip(env * 1.6, 0, 1)
    m = (m - 0.6 * np.stack([bp(m[0], 900, 4200), bp(m[1], 900, 4200)])) * (1 - 0.8 * k)
    s = s * (1 - 0.55 * k)
    out = v * 1.0 / (np.abs(v).max() + 1e-6) * 0.95 + m * 0.17 + s * 0.40
    out = out[:, :int(TOTAL * SR)]
    out = np.tanh(out * 0.95) / np.tanh(0.95)
    out = out / np.abs(out).max() * 0.85
    # SNR-Kontrolle im Sprachband
    band = lambda x, a, b: np.sqrt((bp(x, 300, 4000)[int(a * SR):int(b * SR)] ** 2).mean() + 1e-12)
    vv = v[0, :out.shape[1]] / (np.abs(v).max()) * 0.9
    worst = []
    for sg in TL["segs"]:
        a, b = sg["start"], sg["end"]
        o = np.sqrt(band(m[0] * 0.17, a, b) ** 2 + band(s[0] * 0.40, a, b) ** 2)
        worst.append((round(float(20 * np.log10(band(vv, a, b) / o)), 1), sg["id"]))
    print("min Sprach-SNR dB:", sorted(worst)[:4])
    w = wave.open(path, "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(out.T, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()

if __name__ == "__main__": mix(sys.argv[1])
