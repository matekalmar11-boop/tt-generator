"""Spracherzeugung aus der Story-YAML (Schritt 3): Piper (offline, kostenlos) + ffmpeg.

Aufruf (von tools/voice.ts):  python tts/yaml_tts.py <job.json>
Job: {fps, outDir, lines: [{id, hash, model, units: [{display, spoken}], profile: {model, lengthScale, noiseScale, noiseW, sentenceGap, loudness, effect}}]}
Ergebnis: <outDir>/vo_<id>.wav und <outDir>/result.json  {id: {seconds, timingMode, words: [{w,start,end}] (Sekunden), env: [0..1 je Videoframe]}}

Wort-Timings: ECHT aus den Phonem-Ausrichtungen des Piper-Modells (Anzahl Samples je Phonem, Wortgrenzen = Leerzeichen-Phoneme),
umgerechnet auf die fertige (mit Effekten/Lautheit bearbeitete) Datei. Nur wenn Phonem-Wörter und Textwörter nicht übereinstimmen
(z. B. Ziffern), wird auf Satzgrenzen-verankerte Schätzung zurückgefallen – das steht dann als timingMode "proportional" im Ergebnis.
"""
import json, re, subprocess, sys, wave
from pathlib import Path
import numpy as np
from piper import PiperVoice, SynthesisConfig

job = json.loads(Path(sys.argv[1]).read_text())
FPS, OUT = job["fps"], Path(job["outDir"])
_voices = {}

def load(model):
    if model not in _voices:
        _voices[model] = PiperVoice.load(model, include_alignments=True)
    return _voices[model]

def trim_bounds(x, sr, thr=0.008):
    idx = np.where(np.abs(x) > thr)[0]
    if not len(idx): return 0, len(x)
    return max(0, idx[0] - int(0.03 * sr)), min(len(x), idx[-1] + int(0.08 * sr))

def sentences(units):
    """Einheiten zu Sätzen gruppieren (Satzende = . ! ? am Einheitenende)."""
    out, cur = [], []
    for u in units:
        cur.append(u)
        if re.search(r"[.!?][)“\"«]*$", u["spoken"]): out.append(cur); cur = []
    if cur: out.append(cur)
    return out

PUNCT = set('.,!?;:-—…"“”«»()')

def phoneme_words(chunk_al):
    """Piper-Phonemausrichtung -> [(start_sample, end_sample)] je Wort (Grenzen: Leerzeichen-Phonem; ^/$ gehören nicht zu Wörtern)."""
    words, cur_start, spoken_end, pos = [], None, 0, 0
    for a in chunk_al:
        n = int(a.num_samples)
        if a.phoneme in ("^", "$"):
            pos += n; continue
        if a.phoneme == " ":
            if cur_start is not None: words.append((cur_start, spoken_end))
            cur_start = None; pos += n; continue
        if cur_start is None: cur_start = pos
        pos += n
        if a.phoneme not in PUNCT: spoken_end = pos   # Satzzeichen-Phoneme sind Pausen: sie verlängern das Wort nicht
    if cur_start is not None: words.append((cur_start, spoken_end))
    return words

def synth_line(ln):
    p = ln["profile"]; voice = load(ln["model"]); sr = voice.config.sample_rate
    cfg = SynthesisConfig(length_scale=p["lengthScale"], noise_scale=p["noiseScale"], noise_w_scale=p["noiseW"])
    parts, spans, cursor, aligned = [], [], 0, True   # spans: pro Textwort (Start, Ende) in Samples
    for sent in sentences(ln["units"]):
        text = " ".join(u["spoken"] for u in sent)
        chunks = list(voice.synthesize(text, cfg, include_alignments=True))
        x = np.concatenate([c.audio_float_array for c in chunks])
        a, b = trim_bounds(x, sr)
        # Phonem-Wörter über alle Chunks des Satzes (Piper teilt nur bei Satzzeichen-Grenzen, die wir schon getrennt haben)
        words, off = [], 0
        for c in chunks:
            if c.phoneme_alignments is None: aligned = False; break
            words += [(s + off, e + off) for s, e in phoneme_words(c.phoneme_alignments)]
            off += len(c.audio_float_array)
        want = sum(len(u["spoken"].split()) for u in sent)
        if aligned and len(words) == want:
            k = 0
            for u in sent:
                m = len(u["spoken"].split())
                s0, e0 = words[k][0], words[k + m - 1][1]; k += m
                spans.append((cursor + max(0, s0 - a), cursor + max(0, e0 - a)))
        else:
            aligned = False
            spans += [None] * len(sent)
        seg = x[a:b]
        parts += [seg, np.zeros(int(p["sentenceGap"] * sr), dtype=np.float32)]
        cursor += len(seg) + int(p["sentenceGap"] * sr)
    return np.concatenate(parts[:-1]), sr, spans if aligned else None

def write_wav(path, x, sr):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())

def read_wav(path):
    with wave.open(str(path)) as w:
        return np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32767, w.getframerate()

def ffmpeg_chain(p):
    """Klangeffekte aus dem Sprecherprofil + Ziel-Lautheit. Tonhöhe: asetrate (tiefer/höher) + atempo gleicht die Dauer wieder aus."""
    fx, e = [], p.get("effect") or {}
    pitch = e.get("pitch", 1) or 1
    if abs(pitch - 1) > 1e-6: fx += [f"asetrate={{SR_PITCH:.0f}}", "aresample={SR}", f"atempo={1 / pitch:.5f}"]
    if e.get("lowpassHz"): fx.append(f"lowpass=f={e['lowpassHz']}")
    if e.get("eq"): fx.append(f"equalizer=f={e['eq']['freqHz']}:t=q:w=1:g={e['eq']['gainDb']}")
    if e.get("echo"): fx.append(f"aecho=0.8:0.5:{e['echo']['delayMs']}:{e['echo']['decay']}")
    return fx, pitch

def loudnorm_two_pass(src, dst, target, pre_af):
    """Zwei Durchgänge: erst messen, dann linear auf die Ziel-Lautheit (genauer als Einzeldurchgang, besonders bei kurzen Zeilen)."""
    base = ["ffmpeg", "-v", "info", "-y", "-i", str(src)]
    af1 = ",".join(filter(None, [pre_af, f"loudnorm=I={target}:TP=-1.5:LRA=11:print_format=json"]))
    r = subprocess.run(base + ["-af", af1, "-f", "null", "-"], capture_output=True, text=True, check=True)
    m = json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])
    ln = (f"loudnorm=I={target}:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
          f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    af2 = ",".join(filter(None, [pre_af, ln]))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", af2, "-ar", "44100", str(dst)], check=True)

def env_of(y, sr):
    nf = int(np.ceil(len(y) / sr * FPS)); w = int(sr / FPS)
    env = np.array([np.sqrt(np.mean(y[i * w:(i + 1) * w] ** 2)) if len(y[i * w:(i + 1) * w]) else 0 for i in range(nf)])
    return [round(float(v), 2) for v in np.clip(env / (np.percentile(env, 90) + 1e-9), 0, 1)]

def fallback_spans(units, dur):
    """Schätzung proportional zur Wortlänge (nur wenn keine Phonemausrichtung passt)."""
    w = [max(2, len(re.sub(r"\W", "", u["display"]))) for u in units]
    tot, c, out = sum(w), 0.0, []
    for x in w: out.append((c, c + dur * x / tot)); c += dur * x / tot
    return out

results = {}
for ln in job["lines"]:
    raw, final = OUT / f"_raw_{ln['id']}.wav", OUT / f"vo_{ln['id']}.wav"
    x, sr, spans = synth_line(ln)
    write_wav(raw, x * 0.9, sr)
    fx, pitch = ffmpeg_chain(ln["profile"])
    af = ",".join(fx).replace("{SR_PITCH:.0f}", str(int(sr * pitch))).replace("{SR}", str(sr))
    loudnorm_two_pass(raw, final, ln["profile"]["loudness"], af)
    raw.unlink()
    y, fsr = read_wav(final)
    dur_raw, dur = len(x) / sr, len(y) / fsr
    if spans is not None:
        k = dur / dur_raw   # Effekte können die Dauer leicht verändern -> Zeiten mitskalieren
        words = [{"w": u["display"], "start": round(min(s / sr * k, dur), 3), "end": round(min(e / sr * k, dur), 3)} for u, (s, e) in zip(ln["units"], spans)]
        mode = "aligned"
    else:
        sp = fallback_spans(ln["units"], dur)
        words = [{"w": u["display"], "start": round(s, 3), "end": round(e, 3)} for u, (s, e) in zip(ln["units"], sp)]
        mode = "proportional"
    results[ln["id"]] = {"seconds": round(dur, 3), "timingMode": mode, "words": words, "env": env_of(y, fsr)}
    print(f"  {ln['id']}: {dur:5.2f} s  Wort-Timing: {mode}")
(OUT / "result.json").write_text(json.dumps(results, ensure_ascii=False))
