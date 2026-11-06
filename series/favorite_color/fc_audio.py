"""Ton einer Episode: Stimme + atmosphärische Musik (Stimmung je Abschnitt) + Papier-Sounddesign.
Alle Zeitpunkte kommen aus denselben Wortzeiten wie die Bilder (fc_scenes.Episode).

Aufruf: python3 fc_audio.py episodes/red.json   -> out/<id>/mix.wav
"""
import os, sys, wave
import numpy as np
from scipy import signal
from fc_common import load_episode, Timeline
from fc_scenes import Episode

SR = 44100
rng = np.random.default_rng(11)


def tt(n): return np.arange(n) / SR
def filt(x, k, fc, o=4): return signal.sosfilt(signal.butter(o, fc, btype=k, fs=SR, output="sos"), x)
def bp(x, lo, hi): return signal.sosfilt(signal.butter(3, [lo, hi], btype="band", fs=SR, output="sos"), x)
def ex(n, tau): return np.exp(-np.arange(n) / (tau * SR))


def put(buf, x, t0, g=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= buf.shape[1] or len(x) == 0: return
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), buf.shape[1] - i)
    buf[0, i:i + n] += x[:n] * g * (1 - max(0, pan)); buf[1, i:i + n] += x[:n] * g * (1 + min(0, pan))


# ---------------------------------------------------------------- Sounddesign (Papier & Akzente)
def paper_rip(d=0.55):
    n = int(d * SR); t = tt(n)
    base = filt(rng.normal(0, 1, n), "highpass", 1300, 2)
    body = bp(rng.normal(0, 1, n), 300, 2400) * (0.5 + 0.5 * np.sin(2 * np.pi * 21 * t))
    crack = np.convolve((rng.random(n) > 0.996).astype(float), np.hanning(30), "same")
    env = np.clip(t / 0.06, 0, 1) * np.exp(-np.maximum(0, t - 0.3) / 0.1)
    x = (base * 0.5 + body * 0.5 + crack * base * 0.5) * env * (0.5 + 0.5 * rng.random(n // 140 + 2).repeat(140)[:n])
    return x / (np.abs(x).max() + 1e-9) * 0.7

def slap(pitch=1.0):
    n = int(0.12 * SR)
    return (bp(rng.normal(0, 1, n), 700 * pitch, 3800 * pitch) * ex(n, 0.02) + np.sin(2 * np.pi * 150 * pitch * tt(n)) * ex(n, 0.03) * 0.8) * 0.6

def pop(f=520):
    n = int(0.14 * SR); t = tt(n); fr = f * (1 + 0.8 * np.exp(-t / 0.03))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * ex(n, 0.045) * 0.5

def boom(d=1.6, f0=110, f1=38):
    n = int(d * SR); t = tt(n); fr = f1 + (f0 - f1) * np.exp(-t / 0.15)
    return (np.sin(2 * np.pi * np.cumsum(fr) / SR) * ex(n, 0.5) + filt(rng.normal(0, 1, n), "lowpass", 400, 2) * ex(n, 0.1) * 0.6) * 0.9

def whoosh(d=0.4):
    n = int(d * SR); t = np.linspace(0, 1, n)
    return bp(rng.normal(0, 1, n), 500, 4000) * np.sin(np.pi * t) ** 2 * 0.4

def chime(f, d=1.6):
    n = int(d * SR); t = tt(n)
    return sum(np.sin(2 * np.pi * f * k * t) * g for k, g in [(1, 1), (2.0, 0.35), (3.01, 0.15)]) * ex(n, 0.55) * 0.28

def sparkle():
    s = np.zeros(int(1.1 * SR))
    for k, f in enumerate([1568, 1976, 2349, 3136, 2637]):
        c = chime(f, 0.6) * 0.45; i = int(k * 0.06 * SR); s[i:i + len(c)] += c[:len(s) - i]
    return s

def heartbeat():
    n = int(0.62 * SR); x = np.zeros(n)
    for off, g in [(0, 1.0), (int(0.2 * SR), 0.7)]:
        m = int(0.3 * SR); t = tt(m); fr = 50 + 32 * np.exp(-t / 0.04)
        x[off:off + m] += np.sin(2 * np.pi * np.cumsum(fr) / SR) * ex(m, 0.07) * g
    return x * 0.9

def zap():
    n = int(0.5 * SR); t = tt(n); fr = 2400 * np.exp(-t / 0.08) + 120
    x = np.sign(np.sin(2 * np.pi * np.cumsum(fr) / SR)) * 0.3 + bp(rng.normal(0, 1, n), 2000, 9000) * 0.5
    return x * ex(n, 0.12) * 0.6

def confetti(d=1.0):
    n = int(d * SR); x = np.zeros(n)
    for _ in range(40):
        i = int(rng.uniform(0, 0.75) * n); m = int(0.03 * SR)
        x[i:i + m] += bp(rng.normal(0, 1, m), 2000, 8000)[:len(x[i:i + m])] * ex(m, 0.006)[:len(x[i:i + m])] * rng.uniform(0.3, 1)
    return x * 0.55

def crack():
    n = int(0.5 * SR)
    return (bp(rng.normal(0, 1, n), 800, 7000) * ex(n, 0.05) + np.sin(2 * np.pi * 90 * tt(n)) * ex(n, 0.1) * 0.6) * 0.9

def beep2():
    s = np.zeros(int(0.9 * SR))
    for k, f in enumerate([880, 660, 880]):
        m = int(0.18 * SR); i = int(k * 0.24 * SR); s[i:i + m] += np.sign(np.sin(2 * np.pi * f * tt(m))) * 0.18 * np.minimum(1, tt(m) / 0.005) * np.minimum(1, (0.18 - tt(m)) / 0.02)
    return filt(s, "lowpass", 3500, 2)

def tick(hi=False):
    n = int(0.05 * SR)
    return (bp(rng.normal(0, 1, n), 1800, 6000) * ex(n, 0.005) + np.sin(2 * np.pi * (1350 if hi else 950) * tt(n)) * ex(n, 0.012)) * 0.45

def swish():
    n = int(0.22 * SR); t = np.linspace(0, 1, n)
    return bp(rng.normal(0, 1, n), 1500, 7000) * np.sin(np.pi * t) ** 3 * 0.6

def ekg_beep():
    n = int(0.12 * SR); return np.sin(2 * np.pi * 1000 * tt(n)) * np.minimum(1, (0.12 - tt(n)) / 0.03) * 0.22

def stamp():
    n = int(0.6 * SR); t = tt(n); fr = 70 * (1 + 1.5 * np.exp(-t / 0.03))
    return (np.sin(2 * np.pi * np.cumsum(fr) / SR) * ex(n, 0.09) + bp(rng.normal(0, 1, n), 300, 3000) * ex(n, 0.03) * 0.8) * 1.0


def water(d=1.0):
    n = int(d * SR); t = tt(n); x = filt(rng.normal(0, 1, n), "lowpass", 900, 2) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.9 * t))
    return x * np.sin(np.pi * np.clip(t / d, 0, 1)) * 0.5

def plink(f=1400):
    n = int(0.25 * SR); t = tt(n); fr = f * (1 + 0.6 * np.exp(-t / 0.02))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * ex(n, 0.05) * 0.45

def clang():
    n = int(1.0 * SR); t = tt(n)
    return sum(np.sin(2 * np.pi * f * t) * g for f, g in [(523, 1), (1290, 0.5), (2130, 0.3)]) * ex(n, 0.25) * 0.3

def chain():
    s_ = np.zeros(int(0.8 * SR))
    for k in range(6):
        c = clink(1700 + 300 * rng.random()) * 0.7; i = int(k * 0.1 * SR); s_[i:i + len(c)] += c[:len(s_) - i]
    return s_

def clink(f=2400):
    n = int(0.4 * SR); t = tt(n); return (np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f * 2.76 * t)) * ex(n, 0.08) * 0.3

def wind(d=1.6):
    n = int(d * SR); t = tt(n); x = bp(rng.normal(0, 1, n), 300, 2500) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * t + 1))
    return x * np.sin(np.pi * np.clip(t / d, 0, 1)) * 0.45

def rain(d=1.6):
    n = int(d * SR); x = np.zeros(n)
    for _ in range(int(d * 45)):
        i = int(rng.uniform(0, 1) * (n - 2000)); m = int(0.015 * SR)
        x[i:i + m] += bp(rng.normal(0, 1, m), 2500, 9000) * ex(m, 0.004) * rng.uniform(0.3, 1)
    return (x + filt(rng.normal(0, 1, n), "lowpass", 2000, 2) * 0.08) * np.sin(np.pi * np.clip(tt(n) / d, 0, 1)) * 0.7

def fanfare():
    s_ = np.zeros(int(1.6 * SR))
    for k, f in enumerate([523, 659, 784, 1047]):
        c = chime(f, 1.2) * 0.8; i = int(k * 0.09 * SR); s_[i:i + len(c)] += c[:len(s_) - i]
    return s_


# ---------------------------------------------------------------- Musik
A = lambda m: 440 * 2 ** ((m - 69) / 12)

def pad_note(freqs, d, bright=0.5):
    n = int(d * SR); t = tt(n); x = np.zeros(n)
    for f in freqs:
        for det in (-0.004, 0.0, 0.004):
            ph = 2 * np.pi * f * (1 + det) * t
            x += np.sin(ph) * 0.6 + (2 * ((f * (1 + det) * t) % 1) - 1) * 0.25 * bright
    x = filt(x, "lowpass", 900 + 1600 * bright, 2)
    env = np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.8 + 0.0)
    return x * np.clip(env, 0, 1) / len(freqs)

def pluck(f, d=0.9):
    n = int(d * SR); t = tt(n)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) + 0.15 * np.sin(6 * np.pi * f * t)) * ex(n, 0.25) * np.minimum(1, t / 0.004)

def kick():
    n = int(0.3 * SR); t = tt(n); return np.sin(2 * np.pi * np.cumsum(50 + 90 * np.exp(-t / 0.04)) / SR) * ex(n, 0.1)

def music(E, total):
    N = int((total + 0.5) * SR); m = np.zeros((2, N)); P = lambda x, t, g, p=0.0: put(m, x, t, g, p)
    b = E.b; bpm = 90; beat = 60 / bpm
    # warme Akkorde (Am F C G), dunkel (Am-Bb Cluster), neugierig (Dm9 / Am9), Auflösung (F C)
    warm = [[57, 64, 69, 72], [53, 60, 65, 69], [48, 55, 64, 67], [55, 62, 67, 71]]
    curious = [[50, 57, 64, 65, 69], [45, 52, 60, 64, 71]]
    sections = [(0.0, b["traits"], "warm"), (b["traits"], b["shadow"], "warm"), (b["shadow"], b["fact"], "dark"), (b["fact"], b["outro"], "curious"), (b["outro"], total, "resolve")]
    for a0, a1, mood in sections:
        t = a0; k = 0
        while t < a1 - 0.2:
            d = min(4 * beat, a1 - t + 0.6)
            if mood in ("warm", "resolve"):
                ch = warm[k % 4] if mood == "warm" else [[53, 60, 65, 69], [48, 55, 64, 67], [48, 55, 64, 72]][min(k, 2)]
                P(pad_note([A(x) for x in ch], d + 0.6, 0.55), t, 0.55)
                P(pad_note([A(ch[0] - 12)], d + 0.6, 0.2), t, 0.5)
                for q in range(4):
                    P(kick(), t + q * beat, 0.32 if q % 2 == 0 else 0.0)
                    P(pluck(A(ch[(q + k) % len(ch)] + 12), beat * 1.6), t + q * beat + beat / 2, 0.12, (-0.3 if q % 2 else 0.3))
            elif mood == "dark":
                P(pad_note([A(45), A(46), A(57)], d + 0.6, 0.15), t, 0.75)
                P(pad_note([A(33)], d + 0.6, 0.05), t, 0.7)
            else:
                ch = curious[k % 2]
                P(pad_note([A(x) for x in ch], d + 0.6, 0.35), t, 0.45)
                for q in range(4):
                    P(pluck(A(ch[(q * 2 + k) % len(ch)] + 12), beat * 2), t + q * beat, 0.14, (-0.25 if q % 2 else 0.25))
            t += 4 * beat; k += 1
    # Spannungs-Riser in die dunkle Seite + harter Abbruch vor dem Riss
    n = int(1.4 * SR); r = bp(rng.normal(0, 1, n), 600, 6000) * np.linspace(0, 1, n) ** 2.5 * 0.35
    P(r, b["shadow"] - 1.4, 0.8)
    m = m / (np.abs(m).max() + 1e-9) * 0.6
    fade = np.clip((total - np.arange(N) / SR) / 1.4, 0, 1); m *= fade
    return m


# ---------------------------------------------------------------- SFX-Spur
def sfx(E, total):
    N = int((total + 0.5) * SR); s = np.zeros((2, N)); P = lambda x, t, g=1.0, p=0.0: put(s, x, t, g, p)
    b = E.b
    # Hook
    P(boom(1.8, 130, 40), 0.0, 1.0); P(slap(0.8), 0.0, 0.9)
    for i in range(len(E.ep["color_name"])): P(slap(1.0 + 0.15 * i), 0.02 + i * 0.07, 0.8, (i - 1) * 0.3)
    P(slap(1.2), 0.25, 0.6); P(whoosh(0.5), 0.2, 0.5)
    P(slap(0.9), E.t_psych - 0.05, 0.9); P(pop(700), E.t_psych - 0.03, 0.6)
    # Übergänge: Papier reißt
    for k in ("traits", "shadow", "fact", "outro"): P(paper_rip(), b[k] - 0.2, 0.9, rng.uniform(-0.3, 0.3))
    P(slap(0.8), b["traits"] + 0.35, 0.7)          # Farbkarte landet
    # Eigenschaften
    fx = dict(crown=lambda t: P(sparkle(), t, 0.8), heart=lambda t: [P(heartbeat(), t + k * 0.67, 0.75) for k in range(3)],
              bolt=lambda t: P(zap(), t, 0.8), burst=lambda t: P(confetti(), t, 0.9), warning=lambda t: P(beep2(), t, 0.9),
              clock=lambda t: [P(tick(k % 2), t + k * 0.12, 0.8) for k in range(14)],
              slash=lambda t: [P(swish(), t + k * 0.13, 0.9, (k - 1) * 0.4) for k in range(3)],
              wave=lambda t: P(water(1.3), t, 0.8), shield=lambda t: P(clang(), t, 0.7), anchor=lambda t: P(chain(), t, 0.8),
              drop=lambda t: [P(plink(1500 - 300 * k), t + k * 0.25, 0.7) for k in range(3)], snow=lambda t: P(wind(1.6), t, 0.9),
              moon=lambda t: P(chime(659, 1.8), t, 0.5), cloud=lambda t: P(rain(1.8), t, 0.9))
    for name, word, ti in E.traits:
        P(slap(1.0), ti - 0.08, 0.7); P(pop(560), ti - 0.04, 0.5); P(whoosh(0.3), ti - 0.12, 0.35)
        fx.get(name, lambda t: None)(ti)
    for k in range(4): P(pop(640 + 80 * k), E.t_people + 0.1 + k * 0.12, 0.5, (k - 1.5) * 0.3)
    # dunkle Seite
    P(crack(), E.t_another - 0.05, 1.0); P(boom(1.6, 90, 34), E.t_another - 0.05, 0.9)
    for name, word, ti in E.shadow:
        P(slap(0.8), ti - 0.08, 0.7); P(whoosh(0.3), ti - 0.12, 0.35)
        fx.get(name, lambda t: None)(ti)
    t_ = b["shadow"] + 0.3
    while t_ < E.t_same - 0.1: P(heartbeat(), t_, 0.35); t_ += 0.9
    P(whoosh(0.5), E.t_same - 0.1, 0.6); P(slap(1.0), E.t_left - 0.1, 0.7); P(heartbeat(), E.t_left, 0.6); P(slap(1.2), E.t_right - 0.1, 0.7); P(chime(1318, 0.8), E.t_right, 0.35)
    # Fakt
    P(slap(1.1), E.t_studies - 0.1, 0.7); [P(pop(500 + 90 * k), E.t_studies + 0.15 + k * 0.2, 0.45) for k in range(4)]
    for b_ in E.fbeats:
        if b_["kind"] == "ekg":
            for q in (0.3, 0.75): P(ekg_beep(), b_["t"] + q * 1.1, 0.8)
        else:
            P(pop(900), b_["t"] - 0.12, 0.6); P(whoosh(0.3), b_["t"] - 0.15, 0.35)
            fx.get(b_.get("icon", "eye"), lambda t: P(chime(988, 1.0), t, 0.35))(b_["t"])
    if E.fact_end == "caveat":
        for k in range(3): P(slap(0.9 + 0.1 * k), E.t_but - 0.08 + k * 0.24, 0.65)
        P(stamp(), E.t_cant - 0.05 + 0.15, 1.0)
    elif E.fact_end == "stat":
        for k in range(3): P(slap(0.8 + 0.15 * k), E.t_but - 0.05 + k * 0.18, 0.65)
        P(fanfare(), E.t_but + 0.6, 0.8); P(confetti(1.0), E.t_but + 0.6, 0.7)
    # Outro
    P(slap(0.9), b["outro"] + 0.05, 0.7); P(pop(600), E.t_comment - 0.08, 0.7); P(whoosh(0.35), E.t_comment + 0.2, 0.5)
    P(chime(784, 2.2), E.t_end, 0.7); P(chime(1175, 2.2), E.t_end + 0.12, 0.5)
    for i in range(len(E.ep.get("teaser_colors", []))): P(slap(1.1 + 0.1 * i), E.t_end + 0.25 + i * 0.1, 0.55, (i - 1.5) * 0.3)
    return s


def voice(out, total):
    with wave.open(os.path.join(out, "vo.wav")) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768; sr = w.getframerate()
    a = signal.resample_poly(a, SR, sr); a = filt(a, "highpass", 80, 2)
    a = a + 0.28 * bp(a, 2200, 5500) - 0.1 * bp(a, 180, 400)            # Klarheit
    env = filt(np.abs(a), "lowpass", 12, 1) + 1e-4                        # sanfter Kompressor
    g = np.clip((0.10 / env) ** 0.55, 0.6, 3.0); a = a * filt(g, "lowpass", 20, 1); a = np.tanh(a * 1.3) / 1.3
    N = int((total + 0.5) * SR); v = np.zeros((2, N)); n = min(N, len(a)); v[0, :n] = a[:n]; v[1, :n] = a[:n]
    return v / (np.abs(v).max() + 1e-9)


def main(ep_path):
    ep = load_episode(ep_path)
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", ep["id"])
    T = Timeline(os.path.join(out, "timeline.json")); E = Episode(ep, T); total = T.total
    v = voice(out, total); m = music(E, total); s = sfx(E, total)
    env = filt(np.abs(v[0]), "lowpass", 8, 1); env = filt(np.clip(env / 0.1, 0, 1), "lowpass", 5, 1); k = np.clip(env * 1.6, 0, 1)
    m = (m - 0.55 * np.stack([bp(m[0], 900, 4200), bp(m[1], 900, 4200)])) * (1 - 0.65 * k)   # Musik weicht der Stimme
    s = s * (1 - 0.45 * k)
    VG, MG, SG = 0.95, 0.26, 0.5
    out_ = v * VG + m * MG + s * SG
    out_ = np.tanh(out_ * 0.95) / np.tanh(0.95); out_ = out_ / np.abs(out_).max() * 0.85
    out_ = out_[:, :int(total * SR)]
    band = lambda x, a, b: np.sqrt((bp(x, 300, 4000)[int(a * SR):int(b * SR)] ** 2).mean() + 1e-12)
    worst = sorted((round(float(20 * np.log10(band(v[0] * VG, s_["start"], s_["end"]) / np.sqrt(band(m[0] * MG, s_["start"], s_["end"]) ** 2 + band(s[0] * SG, s_["start"], s_["end"]) ** 2))), 1), s_["id"]) for s_ in T.sections.values())
    print("Sprache über Musik+SFX (dB, Sprachband) je Abschnitt:", worst)
    with wave.open(os.path.join(out, "mix.wav"), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(out_.T, -1, 1) * 32767).astype(np.int16).tobytes())
    print("->", os.path.join(out, "mix.wav"))


if __name__ == "__main__":
    main(sys.argv[1])
