"""Gemeinsame Bausteine der Serie "If This Is Your Favorite Color...".

Baut auf der Papier-Engine aus video/paper.py auf (gleicher Look wie das erste Video):
Papier-Ebenen mit Faser-Textur, gerissene Kanten, heller Schnittrand, Schatten, Stop-Motion-Zittern.
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "video"))
from paper import *            # noqa: E402,F401  (W, H, make_layer, draw, glow, rip, ...)

FPS = 12                       # Stop-Motion-Takt; Ausgabe 24 fps, jedes Bild doppelt

_C = {}


def cached(key, fn):
    if key not in _C:
        _C[key] = fn()
    return _C[key]


def clamp(x, a=0.0, b=1.0):
    return min(b, max(a, x))


def ease(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def lin(t, a, b, va, vb, e=False):
    x = clamp((t - a) / (b - a)) if b != a else 1.0
    return va + (vb - va) * (ease(x) if e else x)


def bounce(t, a, dur=0.35):
    """Stop-Motion-Pop: 0 vor a, dann Überschwinger, dann 1."""
    x = (t - a) / dur
    if x < 0:
        return 0.0
    if x >= 1:
        return 1.0
    return [0.45, 1.18, 0.94, 1.04, 1.0][min(4, int(x * 5))]


def canvas():
    return np.zeros((H, W, 3), np.float32)


def C(rgb):
    return tuple(int(v) for v in rgb)


def mix(a, b, k):
    return tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3))


# ---------------------------------------------------------------- gecachte Papier-Ebenen
def TXT(text, size, color, h=6, font=FONT_BLACK, seed=1, rough=0.8, shadow=0.75):
    return cached(("txt", text, size, color, h, font, seed), lambda: make_layer(text_mask(text, size, font), color, h=h, seed=seed, rough=rough, shadow=shadow))


def BG(color, grad=(1.25, 0.7), seed=1):
    return cached(("bg", color, grad, seed), lambda: solid(W + 80, H + 80, color, h=0, shadow=0, grad=grad, seed=seed))


def BAND(w, h, color, amp=18, seed=1, ht=14, top=True, bottom=True, grad=None):
    return cached(("band", w, h, color, amp, seed, ht, top, bottom, grad), lambda: make_layer(torn_band(w, h, amp, seed, top, bottom), color, h=ht, seed=seed, grad=grad))


def RR(w, h, r, color, ht=6, seed=1, rough=0.9, **kw):
    return cached(("rr", w, h, r, color, ht, seed, rough, tuple(sorted(kw.items()))), lambda: make_layer(rrect_mask(w, h, r), color, h=ht, seed=seed, rough=rough, **kw))


def ELL(w, h, color, ht=6, seed=1, rough=1.0, **kw):
    return cached(("ell", w, h, color, ht, seed, rough, tuple(sorted(kw.items()))), lambda: make_layer(ellipse_mask(w, h), color, h=ht, seed=seed, rough=rough, **kw))


def SHAPE(name, w, h, fn, color, ht=6, seed=1, rough=1.0, **kw):
    """Beliebige Form: fn(draw, S) zeichnet mit Koordinaten*S in einen w x h Bereich."""
    return cached(("shape", name, w, h, color, ht, seed, rough, tuple(sorted(kw.items()))), lambda: make_layer(draw_mask(w, h, fn), color, h=ht, seed=seed, rough=rough, **kw))


def draw_group(c, items, x, y, rot=0.0, sc=1.0, op=1.0, shadow=1.0):
    """items: (Layer, dx, dy[, drot[, dsc]]) relativ zum Mittelpunkt; dreht/skaliert die ganze Gruppe."""
    a = math.radians(rot)
    ca, sa = math.cos(a), math.sin(a)
    for it in items:
        L, dx, dy = it[0], it[1], it[2]
        drot = it[3] if len(it) > 3 else 0.0
        dsc = it[4] if len(it) > 4 else 1.0
        if L is None or dsc <= 0.001:
            continue
        px = x + sc * (ca * dx - sa * dy)
        py = y + sc * (sa * dx + ca * dy)
        draw(c, L, px, py, rot + drot, sc * dsc, op=op, shadow=shadow)


def dust(c, t, cam_z=1.0, n=22, seed=1, color=CREAM, size=(6, 14), op=0.55, speed=20.0, up=False):
    """Schwebende Papierschnipsel (Tiefe)."""
    rng = np.random.default_rng(seed)
    for i in range(n):
        x0, y0 = rng.uniform(0, W), rng.uniform(0, H)
        s = rng.uniform(*size)
        vx, vy = rng.uniform(-0.5, 0.5) * speed, rng.uniform(0.3, 1.0) * speed * (-1 if up else 1)
        x = (x0 + vx * t) % W
        y = (y0 + vy * t) % H
        L = RR(int(s), int(s * 0.8) + 2, 2, color, 3, seed=i % 6, rough=0.5)
        draw(c, L, x, y, rot=t * 50 * rng.uniform(-1, 1) + i * 37, op=op)


def load_episode(path):
    ep = json.load(open(path))
    ep["pal"] = {k: C(v) for k, v in ep["palette"].items()}
    return ep


class Timeline:
    """Wortzeiten aus out/<id>/timeline.json; wt('passion') = Startzeit des Wortes."""

    def __init__(self, path):
        d = json.load(open(path))
        self.total = d["total"]
        self.sections = {s["id"]: s for s in d["sections"]}
        self.order = [s["id"] for s in d["sections"]]
        self.words = [w for s in d["sections"] for w in s["words"]]

    @staticmethod
    def norm(w):
        return "".join(ch for ch in w.lower() if ch.isalnum() or ch == "'")

    def word(self, w, section=None, nth=1):
        n = 0
        secs = [self.sections[section]] if section else [self.sections[i] for i in self.order]
        for s in secs:
            for x in s["words"]:
                if self.norm(x["w"]) == self.norm(w):
                    n += 1
                    if n == nth:
                        return x
        raise KeyError(f"Wort '{w}' nicht im Skript ({section})")

    def wt(self, w, section=None, nth=1):
        return self.word(w, section, nth)["a"]

    def sec(self, sid):
        return self.sections[sid]
