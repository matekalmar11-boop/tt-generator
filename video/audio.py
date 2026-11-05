"""Sounddesign: Sprecher (Piper, Thorsten) + synthetisierte Musik und SFX, exakt auf die Szenenzeiten gelegt."""
import numpy as np
from scipy import signal
import wave
from scenes import *

SR = 44100
N = int((TOTAL + 0.2) * SR)
rng = np.random.default_rng(42)


def tt(n): return np.arange(n) / SR


def sos(kind, fc, order=4):
    return signal.butter(order, fc, btype=kind, fs=SR, output="sos")


def filt(x, kind, fc, order=4):
    return signal.sosfilt(sos(kind, fc, order), x)


def bp(x, lo, hi):
    return signal.sosfilt(signal.butter(3, [lo, hi], btype="band", fs=SR, output="sos"), x)


def put(buf, x, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= buf.shape[1]: return
    n = min(len(x), buf.shape[1] - i)
    if i < 0:
        x = x[-i:]; n = min(len(x), buf.shape[1]); i = 0
    gl = gain * (1 - max(0, pan)); gr = gain * (1 + min(0, pan))
    buf[0, i:i + n] += x[:n] * gl
    buf[1, i:i + n] += x[:n] * gr


def ir(sec, tau, seed=1, hp=200):
    r = np.random.default_rng(seed)
    n = int(sec * SR)
    x = r.normal(0, 1, (2, n)) * np.exp(-np.arange(n) / (tau * SR))
    x[:, :int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    x = np.stack([filt(x[0], "highpass", hp, 2), filt(x[1], "highpass", hp, 2)])
    x = np.stack([filt(x[0], "lowpass", 7500, 2), filt(x[1], "lowpass", 7500, 2)])
    return x / np.sqrt((x ** 2).sum() / 2)


def reverb(buf, wet, sec=1.2, tau=0.35, seed=1):
    h = ir(sec, tau, seed)
    out = np.stack([signal.fftconvolve(buf[0], h[0])[:buf.shape[1]], signal.fftconvolve(buf[1], h[1])[:buf.shape[1]]])
    return buf + wet * out * 0.06


# ---------------------------------------------------------------- Bausteine (mono)
def env_exp(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def sine(f, n, ph=0.0): return np.sin(2 * np.pi * f * tt(n) + ph)


def sfx_buzz(dur, f0=165):
    n = int(dur * SR); t = tt(n)
    am = (np.sin(2 * np.pi * 33 * t) > -0.2).astype(float) * 0.7 + 0.3
    x = (np.sign(np.sin(2 * np.pi * f0 * t)) * 0.5 + np.sin(2 * np.pi * f0 * 2 * t) * 0.4) * am
    x += rng.normal(0, 0.08, n)
    x = bp(x, 90, 2500)
    e = np.minimum(1, t / 0.01) * np.minimum(1, (dur - t) / 0.03)
    return x * e * 0.5


def sfx_ping(f=1318.5):
    n = int(0.9 * SR); t = tt(n)
    a = sum(np.sin(2 * np.pi * f * k * t) * g for k, g in [(1, 1), (2.01, 0.35), (3.97, 0.12)]) * env_exp(n, 0.16)
    m = int(0.9 * SR); b = np.zeros(m)
    d = int(0.11 * SR)
    f2 = f * 1.335
    b[d:] = (sum(np.sin(2 * np.pi * f2 * k * t[:m - d]) * g for k, g in [(1, 1), (2.01, 0.3)]) * env_exp(m - d, 0.22))
    return (a + b) * 0.3


def sfx_slap(pitch=1.0, dur=0.12):
    n = int(dur * SR); t = tt(n)
    x = bp(rng.normal(0, 1, n), 700 * pitch, 3800 * pitch) * env_exp(n, 0.022)
    x += sine(150 * pitch, n) * env_exp(n, 0.03) * 0.7
    return x * 0.7


def sfx_tap():
    n = int(0.05 * SR)
    x = bp(rng.normal(0, 1, n), 1500, 4500) * env_exp(n, 0.008)
    return x * 0.28 + sine(240, n) * env_exp(n, 0.012) * 0.15


def sfx_rip(dur=0.62):
    n = int(dur * SR); t = tt(n)
    base = filt(rng.normal(0, 1, n), "highpass", 1400, 2)
    crackle = (rng.random(n) > 0.9965).astype(float)
    crackle = np.convolve(crackle, np.hanning(40), "same") * 9
    body = bp(rng.normal(0, 1, n), 300, 2200) * (0.5 + 0.5 * np.sin(2 * np.pi * 22 * t + 1))
    env = np.clip(t / 0.08, 0, 1) * np.exp(-np.maximum(0, t - 0.35) / 0.12)
    x = (base * 0.55 + body * 0.5) * env * (0.45 + 0.55 * (rng.random(n // 120 + 2).repeat(120)[:n]))
    x += crackle * base * 0.6 * env
    return x / np.abs(x).max() * 0.8


def sfx_boom(dur=1.6, f0=95, f1=38):
    n = int(dur * SR); t = tt(n)
    f = f1 + (f0 - f1) * np.exp(-t / 0.18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * env_exp(n, 0.45)
    x += filt(rng.normal(0, 1, n), "lowpass", 400, 2) * env_exp(n, 0.12) * 0.7
    return x * 0.95


def sfx_bell(f, dur=2.2):
    n = int(dur * SR); t = tt(n)
    parts = [(1, 1.0, 1.4), (2.0, 0.55, 0.9), (2.76, 0.38, 0.6), (5.4, 0.22, 0.35), (8.9, 0.1, 0.2)]
    x = sum(np.sin(2 * np.pi * f * k * t) * g * np.exp(-t / d) for k, g, d in parts)
    x *= np.minimum(1, t / 0.002)
    return x * 0.38


def sfx_shutter():
    n = int(0.22 * SR); x = np.zeros(n)
    for off, g in [(0, 1.0), (int(0.055 * SR), 0.8)]:
        m = int(0.035 * SR)
        x[off:off + m] += bp(rng.normal(0, 1, m), 900, 6500) * env_exp(m, 0.007) * g
    return x * 0.8


def sfx_tick(tock=False):
    n = int(0.09 * SR)
    f = 760 if tock else 1180
    x = bp(rng.normal(0, 1, n), 1800, 6000) * env_exp(n, 0.005) * 0.6
    x += sine(f, n) * env_exp(n, 0.018) * 0.55
    return x * 0.8


def sfx_heart():
    n = int(0.6 * SR); x = np.zeros(n)
    for off, g in [(0, 1.0), (int(0.19 * SR), 0.7)]:
        m = int(0.28 * SR); t = tt(m)
        f = 52 + 30 * np.exp(-t / 0.04)
        thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(m, 0.07)
        x[off:off + m] += thump * g
    return x * 0.9


def sfx_creak(dur=1.5):
    n = int(dur * SR); t = tt(n)
    f = 150 + 70 * np.sin(2 * np.pi * 0.9 * t) + 40 * t
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5
    x = bp(x + rng.normal(0, 0.3, n), 300, 1800)
    e = np.minimum(1, t / 0.2) * np.minimum(1, (dur - t) / 0.4) * (0.6 + 0.4 * np.sin(2 * np.pi * 5.5 * t))
    return x * e * 0.25


def sfx_whoosh(dur=0.5, up=True):
    n = int(dur * SR); t = tt(n)
    x = rng.normal(0, 1, n)
    out = np.zeros(n)
    for i, (lo, hi) in enumerate([(300, 900), (700, 2000), (1500, 4500)]):
        out += bp(x, lo, hi) * np.sin(np.pi * np.clip((t / dur + (0.0 if up else 0.0) - i * 0.15), 0, 1)) ** 2
    return out * 0.5


def sfx_static(dur):
    n = int(dur * SR)
    x = rng.normal(0, 1, n)
    gate = (rng.random(n // 400 + 2) > 0.35).repeat(400)[:n]
    return bp(x, 300, 7000) * gate * 0.3


def sfx_scribble(dur):
    n = int(dur * SR); t = tt(n)
    x = bp(rng.normal(0, 1, n), 1500, 6500)
    return x * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)) ** 2 * np.minimum(1, t / 0.05) * 0.35


def sfx_thump(f=70, dur=0.5):
    n = int(dur * SR)
    return np.sin(2 * np.pi * f * tt(n)) * env_exp(n, 0.12) * 0.8 + filt(rng.normal(0, 1, n), "lowpass", 250, 2) * env_exp(n, 0.05) * 0.4


# ---------------------------------------------------------------- Sprecher
def load_vo():
    vo = np.zeros((2, N))
    for k in TL:
        if k == "_total": continue
        sg = TL[k]
        a, sr = T.trimmed(T.vo_path(k))
        a = signal.resample_poly(a, SR, sr)
        a = filt(a, "highpass", 85, 2)
        rms = np.sqrt((a ** 2).mean())
        a = a / rms * 0.125
        a = np.tanh(a * 1.6) / 1.6 * 1.3          # sanfte Kompression
        a = a + 0.25 * filt(a, "highpass", 3500, 2)   # Präsenz
        if k in ("H2", "H3"):                   # Stimme hinter der Tür: dumpf, doppelt, leicht tiefer, Hall
            lo = filt(a, "lowpass", 2600, 3)
            lo2 = signal.resample(lo, int(len(lo) / 0.965))          # tiefere Doppelstimme
            d = np.zeros(len(lo2) + 2000); d[:len(lo2)] += lo2 * 0.55
            d[:len(lo)] += lo * 0.9
            a = d
        put(vo, a, sg["start"], 1.0)
    # kleiner Raumhall auf Sprache
    vo = reverb(vo, 0.9, 0.9, 0.22, 3)
    # Hall extra für die Stimme hinter der Tür
    door = np.zeros_like(vo)
    for k in ("H2", "H3"):
        sg = TL[k]; i0, i1 = int(sg["start"] * SR), int((sg["end"] + 0.5) * SR)
        door[:, i0:i1] = vo[:, i0:i1]
    vo += reverb(door, 3.0, 1.8, 0.55, 5) - door
    return vo


# ---------------------------------------------------------------- Musik
def music():
    t = tt(N)
    pts = [(0, 0.55), (4.5, 0.5), (7.5, 0.35), (B["s3"] + 1, 0.30), (17, 0.5), (C1.start, 0.6), (B["s4"] + 1.2, 0.28), (D1.start, 0.35),
           (D2.start, 0.6), (CD_START, 0.65), (BELL - 0.27, 1.0), (BELL - 0.24, 0.0), (BELL + 0.05, 0.85), (BELL + 1.2, 0.55),
           (B["s7"], 0.62), (G1.start, 0.8), (G2.end, 0.8), (H1.start, 0.55), (H3.start, 0.85), (I1.start, 0.95), (TOTAL - 0.3, 1.0), (TOTAL, 1.0)]
    I = np.interp(t, [p[0] for p in pts], [p[1] for p in pts])
    I = filt(I, "lowpass", 6, 1)
    L = np.zeros(N); R = np.zeros(N)
    for ch, det in ((0, 1.0), (1, 1.0035)):
        out = np.zeros(N)
        for f, g in [(55, 1.0), (82.41, 0.55), (116.54, 0.42), (164.81, 0.25), (220, 0.16)]:
            ph = 2 * np.pi * f * det * t
            saw = 2 * ((f * det * t) % 1.0) - 1
            out += (saw * 0.55 + np.sin(ph) * 0.8) * g
        lo = filt(out, "lowpass", 380, 4)
        hi = filt(out, "lowpass", 2400, 3)
        mix = lo * (1 - I) + hi * I
        sub = np.sin(2 * np.pi * 55 * det * t) * 0.6
        out = (mix * 0.55 + sub * 0.5) * (0.35 + 0.8 * I) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * t + ch))
        if ch == 0: L = out
        else: R = out
    # gläserner Ton + Dissonanz in der zweiten Hälfte
    glass = np.sin(2 * np.pi * (1760 + 8 * np.sin(2 * np.pi * 0.3 * t)) * t) * 0.5 + np.sin(2 * np.pi * 1864.7 * t) * 0.4
    glass = glass * (0.5 + 0.5 * np.sin(2 * np.pi * 0.17 * t)) * np.clip((t - 30) / 6, 0, 1) * I ** 2 * 0.045
    L += glass; R += glass[::-1] * 0 + glass * 0.8
    # Riser vor der Türklingel
    r0, r1 = CD_START, BELL - 0.27
    m = (t >= r0) & (t < r1)
    x = np.zeros(N)
    n = m.sum()
    sw = rng.normal(0, 1, n)
    rs = bp(sw, 500, 6000) * np.linspace(0, 1, n) ** 2.2 * 0.35
    rs += np.sin(2 * np.pi * np.cumsum(200 + 1500 * np.linspace(0, 1, n) ** 2) / SR) * np.linspace(0, 1, n) ** 3 * 0.08
    x[m] = rs
    L += x; R += x
    # Luft/Papierrauschen
    air = filt(rng.normal(0, 1, N), "highpass", 4500, 2) * 0.006
    L += air; R += air[::-1]
    mus = np.stack([L, R]) * 0.55
    # harter Schnitt: Ton endet exakt vor dem schwarzen Schlussbild
    cut = int((TOTAL - 0.30) * SR)
    mus[:, cut:] = 0
    return mus


# ---------------------------------------------------------------- SFX-Spur
def sfx_track():
    s = np.zeros((2, N))
    P = lambda x, t0, g=1.0, pan=0.0: put(s, x, t0, g, pan)

    def vib(a, b, g=0.9, f0=165):
        P(sfx_buzz(b - a, f0), a, g)

    # --- S1 Hook
    P(sfx_boom(1.2, 130, 45), 0.0, 1.0)
    P(sfx_whoosh(0.28, False), 0.0, 0.7)
    for a, b in [(0, 0.55), (1.0, 1.45), (2.0, 2.3), (3.3, 3.55)]:
        vib(a, b)
    P(sfx_ping(), 1.0, 1.0)
    P(sfx_slap(1.2), 1.0, 0.6)
    P(sfx_slap(0.9), 3.25, 1.0)
    # --- S2
    vib(A2a.start - 0.12, A2a.start + 0.3)
    vib(A2b.start - 0.05, A2b.start + 0.4)
    P(sfx_ping(1568), A2b.start - 0.05, 0.9)
    P(sfx_slap(1.1), A2b.start - 0.05, 0.6)
    words = ["Öffne", "morgen", "auf", "keinen", "Fall", "die", "Haustür."]
    tot = sum(len(w) for w in words); acc = 0.0
    for w in words:
        P(sfx_tap(), A2b.start + A2b.dur * (acc / tot) * 0.95, 0.9, rng.uniform(-0.3, 0.3)); acc += len(w) + 1
    P(sfx_slap(0.7), A2b.end - 0.55, 1.0)
    # --- Rips
    for j in (1, 2, 6, 7, 8, 9):
        b = B[f"s{j + 1}"] if j >= 1 else 0
        P(sfx_rip(), b - 0.22, 1.0, rng.uniform(-0.3, 0.3))
        P(sfx_boom(0.7, 90, 55), b + 0.05, 0.35)
    # --- S3 Schlafzimmer
    for k in range(int(B["s3"]), int(B["s4"]) + 1):
        P(sfx_tick(k % 2 == 1), k + 0.3, 0.35)
    vib(B2.start - 0.05, B2.start + 0.35, 0.8)
    P(sfx_ping(1174.7), B2.start - 0.05, 0.8)
    sh = B2.start + 0.95
    P(sfx_shutter(), sh, 1.0)
    P(sfx_boom(0.8, 110, 50), sh, 0.5)
    P(sfx_slap(0.8), sh + 0.14, 1.0)
    P(sfx_whoosh(0.4), sh + 0.1, 0.7)
    P(sfx_scribble(1.0), B3.start + 0.5, 0.9)
    P(sfx_slap(1.0), B4.start + 0.1, 1.0)
    P(sfx_whoosh(0.35), B4.end - 0.1, 0.8)
    # --- S4
    for i in range(6):
        P(sfx_thump(180, 0.12) * 0.5, C1.start - 0.05 + i * 0.11, 0.9); P(sfx_tap() * 1.4, C1.start - 0.05 + i * 0.11, 0.9)
    P(sfx_whoosh(0.4), C1.start + 0.1, 0.8)
    te = C1.start + 0.85
    P(sfx_boom(1.2, 100, 40), te, 0.8)
    P(sfx_creak(1.7), te + 0.2, 0.8)
    # --- S5
    vib(D1.start + 0.5, D1.end + 0.4, 0.9)
    P(sfx_ping(1480), D1.start + 0.6, 0.9)
    vib(D2.start - 0.1, D2.start + 0.35, 0.95)
    P(sfx_ping(1760), D2.start, 1.0)
    P(sfx_slap(0.9), D2.start, 0.7)
    P(sfx_whoosh(0.5), CD_START - 0.1, 0.9)
    for k in range(30):
        P(sfx_tick(k % 2 == 1), CD_START + k * CD_STEP, 0.9 + 0.2 * (k / 30))
    # Herzschlag
    t_ = C1.start + 0.2
    while t_ < BELL - 0.3:
        bpm = 62 + 72 * ((t_ - (C1.start)) / (BELL - C1.start)) ** 1.3
        if not (B["s4"] + 1.0 < t_ < D1.start):
            P(sfx_heart(), t_, 0.55 + 0.4 * (t_ / BELL))
        t_ += 60.0 / bpm
    # --- S6 Türklingel
    P(sfx_boom(1.6, 120, 36), BELL, 1.0)
    P(sfx_bell(659.3), BELL, 1.0)
    P(sfx_bell(523.3), BELL + 0.42, 1.0)
    P(sfx_thump(60, 0.5), BELL + 0.02, 0.9)
    P(sfx_thump(60, 0.5), BELL + 0.45, 0.7)
    P(sfx_tick(True), E2.start, 1.2)
    P(sfx_slap(0.7), E2.start, 0.8)
    # --- S7 Türspion
    P(sfx_tick(False), B["s7"] + 0.6, 1.3)
    P(sfx_whoosh(1.0), B["s7"] + 0.6, 0.9)
    P(sfx_boom(1.4, 80, 34), B["s7"] + 0.6, 0.6)
    # Herzschlag wieder ab S7
    t_ = B["s7"] + 0.4
    while t_ < TOTAL - 0.3:
        bpm = 80 + 25 * min(1, (t_ - B["s7"]) / 14)
        P(sfx_heart(), t_, 0.55 + 0.3 * min(1, (t_ - B["s7"]) / 14))
        t_ += 60.0 / bpm
    # --- S8 letzte Nachricht
    vib(B["s8"] + 0.1, B["s8"] + 0.7, 1.0)
    vib(G1.end - 0.2, G1.end + 0.5, 1.0)
    P(sfx_ping(1397), G1.end + 0.1, 1.0)
    P(sfx_static(0.3), G1.end + 0.05, 1.0)
    vib(G2.start - 0.1, G2.start + 0.35, 1.0)
    P(sfx_static(0.25), G2.start, 0.9)
    words = ["Mach", "nicht", "denselben", "Fehler", "wie", "ich."]
    tot = sum(len(w) + 1 for w in words); acc = 0.0
    for w in words:
        P(sfx_slap(1.0 + 0.1 * (acc % 3)), G2.start + G2.dur * (acc / tot) * 0.92, 0.45); acc += len(w) + 1
    # --- S9
    P(sfx_creak(1.2), H1.start + 0.4, 0.5)
    P(sfx_thump(55, 0.5), H2.start - 0.03, 1.0)
    for ta in [H3.start + 0.15, H3.start + 0.55, H3.start + 1.0, H3.start + 1.35, H3.start + 1.75]:
        P(sfx_thump(65, 0.35), ta, 0.9)
        P(sfx_tap() * 2, ta + 0.05, 0.9)
    # --- S10
    P(sfx_slap(0.6), B["s10"] + 0.05, 0.9)
    P(sfx_boom(1.4, 90, 40), B["s10"] + 0.05, 0.6)
    words = ["WER", "HAT", "DIE", "ERSTE", "NACHRICHT", "GESCHICKT?"]
    tot = sum(len(w) + 1 for w in words); acc = 0.0
    for w in words:
        P(sfx_slap(0.8), I1.start + I1.dur * (acc / tot) * 0.9, 1.0); acc += len(w) + 1
    s = reverb(s, 0.9, 1.0, 0.3, 9)
    cut = int((TOTAL - 0.30) * SR)
    s[:, cut:] = 0
    return s


def mix():
    vo = load_vo()
    mus = music()
    sfx = sfx_track()
    # Ducking der Musik unter der Sprache
    env = filt(np.abs(vo[0]) + np.abs(vo[1]), "lowpass", 7, 1)
    env = np.clip(env / 0.09, 0, 1)
    env = filt(env, "lowpass", 4, 1)
    duck = 1 - 0.62 * np.clip(env * 1.4, 0, 1)
    # Sprachband der Musik zusätzlich ausdünnen (1-4 kHz), damit die Stimme immer vorne steht
    mus = mus - 0.55 * np.stack([bp(mus[0], 900, 4200), bp(mus[1], 900, 4200)])
    mus = mus * duck
    sfx = sfx * (1 - 0.72 * np.clip(env * 1.4, 0, 1))
    out = vo * 1.3 + mus * 0.42 + sfx * 0.78
    out = out[:, :int(TOTAL * SR)]
    out = np.tanh(out * 0.9) / np.tanh(0.9) * 0.9
    pk = np.abs(out).max()
    out = out / pk * 0.8
    cut = int((TOTAL - 0.30) * SR)
    out[:, cut:] = 0
    return out


if __name__ == "__main__":
    import sys
    o = mix()
    path = sys.argv[1]
    w = wave.open(path, "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(o.T, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
    print("ok", o.shape, o.shape[1] / SR)
