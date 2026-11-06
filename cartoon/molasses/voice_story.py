"""Melasse-Flut: Kokoro-Erzählung (gleiche Stimme wie das Parmesan-Video)."""
import sys, json, wave
sys.path.insert(0, "..")
import numpy as np
from kokoro_onnx import Kokoro
import voice_kokoro as vk

PARAS = [
 [("s01", "In January of 1919, a wave of molasses rolled through the streets of Boston.", "hook"), ("s02", "It was twenty-five feet tall, and it moved at thirty-five miles per hour.", "wave")],
 [("s03", "It all started with this tank.", "tank"), ("s04", "It stood fifty feet high, and held over two million gallons of molasses.", "size")],
 [("s05", "Back then, molasses was turned into alcohol, and even explosives.", "uses")],
 [("s06", "But the tank was badly built, and it leaked from day one.", "leak"), ("s07", "The company's fix? They painted it brown, to hide the leaks.", "paint")],
 [("s08", "On January fifteenth, the weather suddenly turned warm.", "warm"), ("s09", "The molasses expanded, and the tank began to groan.", "groan"), ("s10", "Then the rivets popped, and the tank burst.", "burst")],
 [("s11", "A wall of molasses crashed down the street, knocking buildings off their foundations.", "crash")],
 [("s12", "Twenty-one people died, and about a hundred and fifty were hurt.", "toll"), ("s13", "Rescuers struggled to wade through the sticky flood.", "rescue")],
 [("s14", "Fireboats washed the streets with salt water, but the harbor stayed brown until summer.", "harbor")],
 [("s15", "In court, the company blamed anarchists. The judge didn't buy it.", "court"), ("s16", "The disaster changed the law. Now, engineers must approve plans for big buildings.", "law")],
 [("s17", "And on hot summer days, they say Boston's North End still smells sweet.", "finale")],
]
vk.PARAS = PARAS; vk.SPEED = 1.12; vk.GAPP = 0.36
if __name__ == "__main__":
    k = Kokoro(vk.SCR + "/kokoro-v1.0.onnx", vk.SCR + "/voices-v1.0.bin")
    SR = 24000; t = vk.GAP0; track = []; segs = []
    for para in PARAS:
        text = " ".join(s for _, s, _ in para)
        a, sr = k.create(text, voice=vk.VOICE, speed=vk.SPEED, lang="en-us"); a = np.asarray(a, np.float32)
        idx = np.where(np.abs(a) > 0.01)[0]; lead = max(0, idx[0] - int(0.03 * SR)); a = a[lead:idx[-1] + int(0.08 * SR)]
        al = vk.align(k, [s for _, s, _ in para], a, SR)
        for (sid, sent, shot), (ws, b) in zip(para, al):
            words = [dict(w=w, a=round(t + b[i] / SR, 3), b=round(t + b[i + 1] / SR, 3)) for i, w in enumerate(ws)]
            segs.append(dict(id=sid, text=sent, shot=shot, start=words[0]["a"], end=words[-1]["b"], words=words))
        track.append((t, a)); t += len(a) / SR + vk.GAPP
    total = segs[-1]["end"] + 1.6
    buf = np.zeros(int(total * SR) + SR, np.float32)
    for st, a in track: i = int(st * SR); buf[i:i + len(a)] += a
    w = wave.open("vo.wav", "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(buf, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
    json.dump(dict(total=round(total, 3), segs=segs), open("timeline.json", "w"), indent=1)
    for s in segs: print(s["id"], s["start"], s["end"], s["shot"], len(s["words"]))
    print("TOTAL", round(total, 2))
