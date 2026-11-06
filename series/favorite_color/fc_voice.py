"""Sprecherspur für eine Episode: Kokoro-TTS mit freigelegtem Dauer-Ausgang -> exakte Wortzeiten.

Aufruf: python3 fc_voice.py episodes/red.json
Schreibt out/<id>/vo.wav (24 kHz) und out/<id>/timeline.json.
"""
import json, os, re, sys, wave
import numpy as np
import onnxruntime as ort
from kokoro_onnx import Kokoro

KOKORO_DIR = os.environ.get("KOKORO_DIR", "/tmp/claude-0/-home-user-tt-generator/03fcd1a6-0fb0-57ba-bc08-d1175731e387/scratchpad/kokoro")
SR, HOP = 24000, 600            # 1 Dauer-Einheit des Modells = 600 Samples = 25 ms
SECTION_GAP, LEAD, TAIL = 0.68, 0.22, 2.4
ALIGN_OFFSET = -0.055          # gemessen: Modell-Dauern liegen ~55 ms hinter dem hörbaren Einsatz (Kreuzkorrelation mit der Energie)


def dur_model_path():
    """Kokoro-ONNX mit zusätzlichem Ausgang '/encoder/Clip_output_0' (Phonem-Dauern)."""
    p = os.path.join(KOKORO_DIR, "kokoro-v1.0-dur.onnx")
    if not os.path.exists(p):
        import onnx
        m = onnx.load(os.path.join(KOKORO_DIR, "kokoro-v1.0.onnx"))
        m.graph.output.append(onnx.helper.make_tensor_value_info("/encoder/Clip_output_0", onnx.TensorProto.FLOAT, None))
        onnx.save(m, p)
    return p


def tts_text(display):
    """Großgeschriebene Wörter (RED) für die Aussprache klein schreiben, damit sie nicht buchstabiert werden."""
    return re.sub(r"\b[A-Z]{2,}\b", lambda m: m.group(0).lower(), display)


def synth_section(k, sess, text, voice, speed):
    ph = k.tokenizer.phonemize(tts_text(text), "en-us")
    vocab = k.tokenizer.vocab
    kept = [(i, c) for i, c in enumerate(ph) if c in vocab]
    toks = [vocab[c] for _, c in kept]
    assert len(toks) <= 510, "Abschnitt zu lang für eine Synthese"
    style = np.asarray(k.get_voice_style(voice)[len(toks)], np.float32).reshape(1, 256)
    audio, dur = sess.run(None, {"tokens": np.array([[0, *toks, 0]], np.int64), "style": style, "speed": np.array([speed], np.float32)})
    dur = dur.ravel()
    # Startzeit (Samples) jedes behaltenen Phonem-Zeichens; dur[0] ist der Start-Token
    starts = np.concatenate([[0], np.cumsum(dur)]) * HOP
    char_t = {}
    for j, (i, c) in enumerate(kept):
        char_t[i] = (starts[j + 1], starts[j + 2])
    # Wörter im Phonemstring (durch Leerzeichen getrennt) <-> Wörter im Anzeigetext
    disp = text.split()
    spans, cur = [], []
    for i, c in enumerate(ph):
        if c == " ":
            if cur: spans.append(cur); cur = []
        else: cur.append(i)
    if cur: spans.append(cur)
    if len(spans) != len(disp):
        raise RuntimeError(f"Wortzahl passt nicht: {len(spans)} Phonemwörter vs {len(disp)} Textwörter in: {text}")
    words = []
    for w, sp in zip(disp, spans):
        ts = [char_t[i] for i in sp if i in char_t and ph[i] not in ",.?!;:"]
        a = min(t[0] for t in ts); b = max(t[1] for t in ts)
        words.append(dict(w=w, a=max(0.0, a / SR + ALIGN_OFFSET), b=b / SR + ALIGN_OFFSET))
    return np.asarray(audio, np.float32), words


def main(ep_path):
    ep = json.load(open(ep_path))
    out = os.path.join(os.path.dirname(os.path.abspath(ep_path)), "..", "out", ep["id"]); os.makedirs(out, exist_ok=True)
    k = Kokoro(os.path.join(KOKORO_DIR, "kokoro-v1.0.onnx"), os.path.join(KOKORO_DIR, "voices-v1.0.bin"))
    sess = ort.InferenceSession(dur_model_path(), providers=["CPUExecutionProvider"])
    t, parts, secs = LEAD, [], []
    for sec in ep["sections"]:
        a, words = synth_section(k, sess, sec["text"], ep["voice"], ep.get("speed", 1.0))
        # führende Stille kürzen (Wortzeiten mitverschieben)
        lead = max(0.0, words[0]["a"] - 0.04); i0 = int(lead * SR)
        a = a[i0:]; end = words[-1]["b"] - lead + 0.12; a = a[:int(end * SR)]
        for w in words: w["a"] = round(t + w["a"] - lead, 3); w["b"] = round(t + w["b"] - lead, 3)
        secs.append(dict(id=sec["id"], text=sec["text"], start=words[0]["a"], end=words[-1]["b"], words=words))
        parts.append((t, a)); t += len(a) / SR + SECTION_GAP
    total = secs[-1]["end"] + TAIL
    buf = np.zeros(int(total * SR) + SR // 2, np.float32)
    for st, a in parts: i = int(st * SR); buf[i:i + len(a)] += a
    buf = buf / (np.abs(buf).max() + 1e-6) * 0.95
    with wave.open(os.path.join(out, "vo.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((buf * 32767).astype(np.int16).tobytes())
    json.dump(dict(id=ep["id"], total=round(total, 3), sections=secs), open(os.path.join(out, "timeline.json"), "w"), indent=1)
    for s in secs: print(f"{s['id']:7s} {s['start']:6.2f} – {s['end']:6.2f}  ({len(s['words'])} Wörter)")
    print("TOTAL", round(total, 2), "s")


if __name__ == "__main__":
    main(sys.argv[1])
