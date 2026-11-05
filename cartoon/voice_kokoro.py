"""Englische Erzählung mit Kokoro (neuronales TTS), in zusammenhängenden Absätzen erzeugt -> natürliche Satzmelodie.
Schreibt vo.wav + timeline.json (Segmente = Sätze, Wortzeiten für Ein-Wort-Untertitel)."""
import json, re, sys, wave
import numpy as np
from scipy import signal
from kokoro_onnx import Kokoro

SCR = "/tmp/claude-0/-home-user-tt-generator/03fcd1a6-0fb0-57ba-bc08-d1175731e387/scratchpad/kokoro"
VOICE, SPEED = "am_fenrir", 1.06
# Absätze: Liste von (segment-id, Satz, Shot-Tag)
PARAS = [
 [("s01", "In Italy, there are banks that don't hold gold.", "bank"), ("s02", "They hold cheese.", "wheel_in"), ("s03", "Specifically, Parmesan.", "hero")],
 [("s04", "One wheel weighs about forty kilos, and is worth hundreds of euros.", "weight")],
 [("s05", "It all starts with a cheesemaker.", "dairy"), ("s06", "But Parmesan takes years to age, before it can ever be sold.", "aging"), ("s07", "So how does he pay the bills while he waits?", "bills")],
 [("s08", "He rolls a wheel straight into the bank.", "roll"), ("s09", "The banker checks it, takes it, and hands him cash.", "cash")],
 [("s10", "Then the cheese goes into a vault.", "vault"), ("s11", "Shelves, and shelves, and shelves.", "shelves"), ("s12", "Hundreds of thousands of wheels, stacked all the way up.", "stack")],
 [("s13", "Robots roll through the aisles, turning and brushing every wheel.", "robots"), ("s14", "Each one is branded with a code, so the bank knows exactly whose cheese it is.", "brand")],
 [("s15", "Inspectors tap every single wheel, listening for cracks.", "inspect"), ("s16", "It sounds crazy, but it works. The longer the cheese waits, the more it's worth.", "works")],
 [("s17", "When it's ready, the owner sells it, repays the loan, and keeps the profit.", "sold"), ("s18", "And if he can't pay? The bank simply sells the cheese.", "stamp")],
 [("s19", "Finally, something that gets better with age.", "finale")],
]
GAP0, GAPP = 0.4, 0.42

def env(a, sr, win=0.01):
    n = max(1, int(win * sr)); return np.sqrt(np.convolve(a * a, np.ones(n) / n, "same"))

def weights(k, words):
    w = []
    for t in words:
        ph = k.tokenizer.phonemize(re.sub(r"[^\w']", "", t), "en-us") if re.sub(r"[^\w']", "", t) else ""
        base = sum(0.5 if c in "ˈˌː" else 1.0 for c in ph) or len(t)
        w.append(base)
    return np.array(w)

def align(k, text_sents, a, sr):
    """Wortgrenzen je Satz; Satzgrenzen an Sprechpausen eingerastet."""
    e = env(a, sr); thr = 0.04 * e.max()
    idx = np.where(e > thr)[0]; s0, s1 = idx[0], idx[-1]
    # Pausen >= 110 ms innerhalb der Sprache
    sil = e < thr; runs = []; i = s0
    while i < s1:
        if sil[i]:
            j = i
            while j < s1 and sil[j]: j += 1
            if (j - i) / sr >= 0.11: runs.append((i, j))
            i = j
        else: i += 1
    allw = [(si, w) for si, s in enumerate(text_sents) for w in s.split()]
    wt = weights(k, [w for _, w in allw])
    pw = np.array([ (5 if w[-1] in ".?!" else 3 if w[-1] == "," else 0) for _, w in allw ], float)
    tot = (wt + pw).sum(); cum = np.concatenate([[0], np.cumsum(wt + pw)]) / tot
    pos = s0 + cum * (s1 - s0)
    # Satzgrenzen
    bounds = [s0]
    first_idx = {}
    for gi, (si, _) in enumerate(allw): first_idx.setdefault(si, gi)
    for si in range(1, len(text_sents)):
        g = first_idx[si]; guess = pos[g]
        cand = [r for r in runs if abs((r[0] + r[1]) / 2 - guess) < 0.5 * sr]
        r = min(cand, key=lambda r: abs((r[0] + r[1]) / 2 - guess)) if cand else None
        bounds.append((r[0], r[1]) if r else (int(guess), int(guess)))
    out = []
    for si, s in enumerate(text_sents):
        ws = s.split(); g0 = first_idx[si]; g1 = g0 + len(ws)
        st = s0 if si == 0 else bounds[si][1]
        en = s1 if si == len(text_sents) - 1 else bounds[si + 1][0]
        ww = wt[g0:g1] + np.array([2.5 if w[-1] in ",.?!" else 0 for w in ws])
        ww = ww.copy(); ww[-1] -= 2.5 if ws[-1][-1] in ".?!" else 0   # Schlusspause liegt in der Lücke
        c = np.concatenate([[0], np.cumsum(ww)]) / ww.sum(); b = st + c * (en - st)
        for i in range(1, len(b) - 1):
            lo, hi = int(b[i] - 0.07 * sr), int(b[i] + 0.07 * sr); seg = e[max(0, lo):hi]
            if len(seg): b[i] = max(0, lo) + int(np.argmin(seg))
        b = np.maximum.accumulate(b)
        mn = int(0.1 * sr)                                     # Mindestdauer pro Wort (Untertitel-Lesbarkeit)
        for i in range(len(b) - 1):
            if b[i + 1] < b[i] + mn: b[i + 1] = b[i] + mn
        if b[-1] > en: b = st + (b - st) * (en - st) / (b[-1] - st)
        out.append((ws, b))
    return out

if __name__ == "__main__":
    k = Kokoro(SCR + "/kokoro-v1.0.onnx", SCR + "/voices-v1.0.bin")
    SR = 24000; t = GAP0; track = []; segs = []
    for para in PARAS:
        text = " ".join(s for _, s, _ in para)
        a, sr = k.create(text, voice=VOICE, speed=SPEED, lang="en-us"); assert sr == SR
        a = np.asarray(a, np.float32)
        idx = np.where(np.abs(a) > 0.01)[0]; lead = max(0, idx[0] - int(0.03 * SR)); a = a[lead:idx[-1] + int(0.08 * SR)]
        al = align(k, [s for _, s, _ in para], a, SR)
        for (sid, sent, shot), (ws, b) in zip(para, al):
            words = [dict(w=w, a=round(t + b[i] / SR, 3), b=round(t + b[i + 1] / SR, 3)) for i, w in enumerate(ws)]
            segs.append(dict(id=sid, text=sent, shot=shot, start=words[0]["a"], end=words[-1]["b"], words=words))
        track.append((t, a)); t += len(a) / SR + GAPP
    total = segs[-1]["end"] + 1.6
    buf = np.zeros(int(total * SR) + SR, np.float32)
    for st, a in track: i = int(st * SR); buf[i:i + len(a)] += a
    w = wave.open("vo_new.wav", "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(buf, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
    json.dump(dict(total=round(total, 3), segs=segs), open("timeline_new.json", "w"), indent=1)
    for s in segs: print(s["id"], s["start"], s["end"], s["shot"], len(s["words"]))
    print("TOTAL", round(total, 2))
