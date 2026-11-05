"""Zeitplan: Sprechersegmente (DE) mit englischen Untertiteln und Pausen davor.
Alle Zeiten des Videos (Szenen, SFX, Untertitel) werden daraus abgeleitet."""
import json, os, wave
import numpy as np

SCR = "/tmp/claude-0/-home-user-tt-generator/03fcd1a6-0fb0-57ba-bc08-d1175731e387/scratchpad"
WORK = SCR + "/work"
VOICE = SCR + "/voice/v.onnx"

# id, deutscher Text, englischer Untertitel (*..* = rot hervorgehoben), length_scale, Pause davor (s)
SEGS = [
 ("A1", "Um dreiundzwanzig Uhr siebenundvierzig bekam ich eine Nachricht von meiner eigenen Nummer.",
        "At *11:47 PM* I got a text|from my *own number*.", 0.97, 0.7),
 ("A2a","Darin stand:", "It said:", 1.0, 0.35),
 ("A2b","Öffne morgen auf keinen Fall die Haustür.", "*Do NOT* open the|front door tomorrow.", 0.98, 0.15),
 ("B1", "Ich dachte, jemand wollte mich verarschen.", "I figured someone|was messing with me.", 0.98, 1.45),
 ("B2", "Doch dann kam ein Foto.", "Then a *photo* came in.", 1.0, 0.25),
 ("B3", "Es zeigte mich, wie ich gerade auf meinem Bett saß.", "It showed me, sitting|on my bed. *Right now.*", 1.0, 0.85),
 ("B4", "Aufgenommen von hinter mir.", "Taken from *behind me.*", 1.05, 0.30),
 ("C1", "Ich drehte mich sofort um.", "I spun around.", 0.95, 1.1),
 ("C2", "Niemand war da.", "*Nobody* was there.", 1.12, 0.35),
 ("D1", "Dann vibrierte mein Handy erneut:", "Then my phone buzzed again:", 1.0, 1.5),
 ("D2", "Du hast noch dreißig Sekunden. Versteck dich.", "You have *30 seconds.*|*Hide.*", 1.0, 0.25),
 ("E1", "Plötzlich klingelte es an der Haustür.", "Suddenly, the *doorbell* rang.", 0.95, 6.2),
 ("E2", "Dreiundzwanzig Uhr achtundvierzig.", "*11:48 PM.*", 1.0, 0.25),
 ("F1", "Durch den Türspion sah ich jemanden,", "Through the peephole|I saw someone", 1.0, 1.2),
 ("F2", "der genauso aussah wie ich.", "who looked *exactly like me.*", 1.05, 0.12),
 ("G1", "Mein Handy vibrierte ein letztes Mal:", "My phone buzzed|one last time:", 1.0, 1.2),
 ("G2", "Mach nicht denselben Fehler wie ich.", "Don't make the *same mistake*|I did.", 1.02, 0.15),
 ("H1", "Dann hörte ich meine eigene Stimme hinter der Tür:", "Then I heard my own voice|behind the door:", 1.0, 1.1),
 ("H2", "Ich weiß, dass du da bist.", "I *know* you're in there.", 1.05, 0.45),
 ("H3", "Ich habe die Nachricht damals auch bekommen.", "I got the message|back then, too.", 1.02, 0.25),
 ("I1", "Wer hat die erste Nachricht geschickt?", "*Who* sent the *first* message?", 1.1, 1.9),
]
END_HOLD = 1.4   # Stille/Standbild nach dem letzten Satz bis zum harten Schnitt

def vo_path(i): return f"{WORK}/vo/{i}.wav"

def load_wav(p):
    w = wave.open(p); sr = w.getframerate()
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return a, sr

def trimmed(p, thr=0.012):
    a, sr = load_wav(p)
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0: return a, sr
    s = max(0, idx[0] - int(0.02 * sr)); e = min(len(a), idx[-1] + int(0.06 * sr))
    return a[s:e], sr

def build():
    t = 0.0; out = {}
    for i, de, en, ls, gap in SEGS:
        a, sr = trimmed(vo_path(i)); d = len(a) / sr
        out[i] = dict(id=i, de=de, en=en, start=round(t + gap, 3), dur=round(d, 3), end=round(t + gap + d, 3))
        t = t + gap + d
    out["_total"] = round(t + END_HOLD, 3)
    return out

if __name__ == "__main__":
    tl = build()
    json.dump(tl, open(WORK + "/timeline.json", "w"), indent=1, ensure_ascii=False)
    for k, v in tl.items():
        if k != "_total": print(k, v["start"], v["end"], v["dur"])
    print("TOTAL", tl["_total"])
