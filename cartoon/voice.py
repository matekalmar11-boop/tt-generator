"""Englischer Sprecher (Piper Ryan-High, offene Alternative zu ElevenLabs) + Wort-Zeitstempel für Ein-Wort-Untertitel."""
import json, re, wave, numpy as np
from piper import PiperVoice, SynthesisConfig
from scipy import signal

SCR = "/tmp/claude-0/-home-user-tt-generator/03fcd1a6-0fb0-57ba-bc08-d1175731e387/scratchpad"
MODEL = SCR + "/voice/en/en_US-ryan-high.onnx"
OUT = SCR + "/cartoon"
SR = 22050

# id, Text, Shot-Tag, Pause davor (s)
SCRIPT = [
 ("s01", "In Italy, there are banks that don't hold gold.", "bank", 0.35),
 ("s02", "They hold cheese.", "wheel_in", 0.22),
 ("s03", "Specifically, Parmesan.", "hero", 0.18),
 ("s04", "One wheel weighs about forty kilos, and is worth hundreds of euros.", "weight", 0.2),
 ("s05", "It all starts with a cheesemaker.", "dairy", 0.3),
 ("s06", "But Parmesan takes years to age, before it can ever be sold.", "aging", 0.2),
 ("s07", "So how does he pay the bills while he waits?", "bills", 0.25),
 ("s08", "He rolls a wheel straight into the bank.", "roll", 0.25),
 ("s09", "The banker checks it, takes it, and hands him cash.", "cash", 0.2),
 ("s10", "Then the cheese goes into a vault.", "vault", 0.28),
 ("s11", "Shelves, and shelves, and shelves.", "shelves", 0.22),
 ("s12", "Hundreds of thousands of wheels, stacked all the way up.", "stack", 0.15),
 ("s13", "Robots roll through the aisles, turning and brushing every wheel.", "robots", 0.25),
 ("s14", "Each one is branded with a code, so the bank knows exactly whose cheese it is.", "brand", 0.2),
 ("s15", "Inspectors tap every single wheel, listening for cracks.", "inspect", 0.25),
 ("s16", "It sounds crazy, but it works. The longer the cheese waits, the more it's worth.", "works", 0.3),
 ("s17", "When it's ready, the owner sells it, repays the loan, and keeps the profit.", "sold", 0.25),
 ("s18", "And if he can't pay? The bank simply sells the cheese.", "stamp", 0.25),
 ("s19", "Finally, something that gets better with age.", "finale", 0.35),
]
LS = 0.99


def energy_env(a, sr, win=0.01):
    n = int(win * sr)
    e = np.sqrt(np.convolve(a * a, np.ones(n) / n, "same"))
    return e


def synth(voice, text):
    chunks, phon = [], []
    for ch in voice.synthesize(text, SynthesisConfig(length_scale=LS, noise_scale=0.62, noise_w_scale=0.8)):
        chunks.append(ch.audio_float_array); phon.append(ch.phonemes)
        sil = np.zeros(int(0.09 * SR), np.float32)   # kurze Satzpause zwischen Sätzen
        chunks.append(sil)
    a = np.concatenate(chunks)[:-int(0.09 * SR)]
    return a, [p for ph in phon for p in ph + [" "]]


def word_times(text, a, phon, t_off):
    """Wortgrenzen: Gewicht nach Phonemzahl, dann am nächsten Energie-Minimum eingerastet."""
    words = text.split()
    wp, cur = [], []
    for p in phon:
        if p == " ":
            if cur: wp.append(cur); cur = []
        else: cur.append(p)
    if cur: wp.append(cur)
    if len(wp) != len(words):
        wp = [[c for c in w] for w in words]
    w = []
    for ws, raw in zip(wp, words):
        wt = sum(0.5 if p in "ːˈˌ" else 1.0 for p in ws) + (2.5 if raw[-1] in ",.?!" else 0)
        w.append(wt)
    w = np.array(w); cum = np.concatenate([[0], np.cumsum(w)]) / w.sum()
    idx = np.where(np.abs(a) > 0.02)[0]
    s0, s1 = (idx[0], idx[-1]) if len(idx) else (0, len(a) - 1)
    b = s0 + cum * (s1 - s0)
    env = energy_env(a, SR)
    for i in range(1, len(b) - 1):
        lo, hi = int(b[i] - 0.09 * SR), int(b[i] + 0.09 * SR)
        seg = env[max(0, lo):hi]
        if len(seg): b[i] = max(0, lo) + int(np.argmin(seg))
    b = np.maximum.accumulate(b)
    return [dict(w=words[i], a=round(t_off + b[i] / SR, 3), b=round(t_off + b[i + 1] / SR, 3)) for i in range(len(words))]


if __name__ == "__main__":
    voice = PiperVoice.load(MODEL, config_path=MODEL + ".json")
    t = 0.0
    full = []
    tl = []
    for sid, text, shot, gap in SCRIPT:
        a, ph = synth(voice, text)
        a = np.asarray(a, np.float32)
        idx = np.where(np.abs(a) > 0.012)[0]
        a = a[max(0, idx[0] - int(0.02 * SR)): idx[-1] + int(0.05 * SR)]
        a = a / (np.abs(a).max() + 1e-9) * 0.9
        t += gap
        full.append((t, a))
        tl.append(dict(id=sid, text=text, shot=shot, start=round(t, 3), end=round(t + len(a) / SR, 3), words=word_times(text, a, ph, t)))
        t += len(a) / SR
    total = t + 1.6
    track = np.zeros(int(total * SR) + SR, np.float32)
    for st, a in full:
        i = int(st * SR); track[i:i + len(a)] += a
    w = wave.open(OUT + "/vo.wav", "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(track, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
    json.dump(dict(total=round(total, 3), segs=tl), open(OUT + "/timeline.json", "w"), indent=1)
    for s in tl: print(s["id"], s["start"], s["end"], s["shot"])
    print("TOTAL", round(total, 2), "voice", round(sum(x['end'] - x['start'] for x in tl), 1))
