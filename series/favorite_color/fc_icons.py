"""Papier-Icon-Bibliothek der Serie. Jedes Icon liefert Items für draw_group (relativ zum Mittelpunkt, ~460 px gross).

Neue Episoden wählen Icons über den Namen in der Episoden-JSON (z.B. "heart", "bolt", "leaf", "drop").
Alle Icons nehmen die Episodenpalette `pal` und die lokale Zeit `t` (für Eigenanimation).
"""
import math
from fc_common import *


def _star_pts(cx, cy, r1, r2, n, rot=0.0):
    pts = []
    for i in range(n * 2):
        r = r1 if i % 2 == 0 else r2
        a = rot + i * math.pi / n - math.pi / 2
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def heart_mask_fn(w, h):
    def fn(d, S):
        r = w * 0.27
        d.ellipse([(w * 0.5 - 2 * r) * S, h * 0.08 * S, (w * 0.5) * S, (h * 0.08 + 2 * r) * S], fill=255)
        d.ellipse([(w * 0.5) * S, h * 0.08 * S, (w * 0.5 + 2 * r) * S, (h * 0.08 + 2 * r) * S], fill=255)
        d.polygon([((w * 0.5 - 2 * r + 6) * S, (h * 0.08 + r * 1.25) * S), ((w * 0.5 + 2 * r - 6) * S, (h * 0.08 + r * 1.25) * S), (w * 0.5 * S, h * 0.95 * S)], fill=255)
    return fn


def heart(pal, t=0.0, beat=1.0):
    s = beat
    return [(SHAPE("heart", 440, 420, heart_mask_fn(440, 420), pal["main"], 16, seed=3, shade=1.2), 0, 0, 0, s),
            (SHAPE("heart_s", 200, 190, heart_mask_fn(200, 190), pal["bright"], 4, seed=4, rough=0.8), -70, -60, -12, s)]


def crown(pal, t=0.0):
    def fn(d, S):
        d.polygon([(x * S, y * S) for x, y in [(20, 300), (20, 90), (120, 190), (210, 30), (300, 190), (400, 90), (400, 300)]], fill=255)
    items = [(SHAPE("crown", 420, 320, fn, pal["accent"], 16, seed=5, shade=1.0), 0, 0),
             (RR(400, 60, 12, mix(pal["accent"], (120, 70, 10), 0.35), 6, seed=6), 0, 125)]
    for i, (dx, dy) in enumerate([(-130, 125), (0, 125), (130, 125)]):
        items.append((ELL(54, 54, pal["main"], 4, seed=10 + i), dx, dy))
    for i, (dx, dy) in enumerate([(-190, -70), (0, -170), (190, -70)]):
        items.append((ELL(44, 44, pal["paper"], 4, seed=20 + i), dx, dy))
    return items


def bolt(pal, t=0.0):
    pts = [(170, 0), (40, 230), (150, 230), (90, 440), (300, 170), (185, 170), (260, 0)]
    def fn(d, S):
        d.polygon([(x * S, y * S) for x, y in pts], fill=255)
    return [(SHAPE("bolt", 320, 450, fn, pal["accent"], 18, seed=7, shade=1.0), 0, 0)]


def burst(pal, t=0.0):
    def fn(d, S):
        d.polygon([(x * S, y * S) for x, y in _star_pts(230, 230, 225, 120, 12)], fill=255)
    def fn2(d, S):
        d.polygon([(x * S, y * S) for x, y in _star_pts(130, 130, 128, 70, 8)], fill=255)
    return [(SHAPE("burst", 460, 460, fn, pal["bright"], 14, seed=8), 0, 0, t * 25),
            (SHAPE("burst2", 260, 260, fn2, pal["accent"], 8, seed=9), 0, 0, -t * 40),
            (ELL(110, 110, pal["paper"], 6, seed=10), 0, 0)]


def warning(pal, t=0.0):
    def tri(w, h):
        def fn(d, S):
            d.polygon([(w / 2 * S, 0), (w * S, h * S), (0, h * S)], fill=255)
        return fn
    return [(SHAPE("warn_o", 480, 420, tri(480, 420), pal["main"], 16, seed=11, shade=0.8), 0, 0),
            (SHAPE("warn_i", 360, 312, tri(360, 312), pal["paper"], 4, seed=12), 0, 38),
            (RR(46, 150, 20, pal["ink"], 3, seed=13), 0, 20), (ELL(50, 50, pal["ink"], 3, seed=14), 0, 128)]


def clock(pal, t=0.0, speed=1.0):
    items = [(ELL(460, 460, pal["main"], 16, seed=15, shade=1.0), 0, 0), (ELL(390, 390, pal["paper"], 4, seed=16), 0, 0)]
    for k in range(12):
        a = math.radians(k * 30)
        items.append((RR(12, 40 if k % 3 == 0 else 22, 4, pal["ink"], 1, seed=k, rough=0.3, rim=0, shadow=0), 160 * math.sin(a), -160 * math.cos(a), k * 30))
    am = t * 360 * speed * 1.6; ah = t * 30 * speed * 1.6
    for ang, ln, th in [(ah, 100, 16), (am, 150, 10)]:
        a = math.radians(ang)
        items.append((RR(th, ln, 6, pal["ink"], 3, seed=int(ln), rough=0.4), ln / 2 * math.sin(a), -ln / 2 * math.cos(a), ang))
    items.append((ELL(34, 34, pal["main"], 2, seed=17), 0, 0))
    return items


def slash(pal, t=0.0, reveal=1.0):
    items = []
    for i in range(3):
        L = cached(("slash", i, pal["bright"]), lambda i=i: make_layer(torn_band(560, 70, 16, 30 + i, True, True, freq=18), pal["bright"] if i != 1 else pal["main"], h=14, seed=30 + i))
        items.append((L, (i - 1) * 120, (i - 1) * 40, -52, clamp(reveal * 3 - i)))
    return items


def eye(pal, t=0.0, pupil=1.0, look=(0, 0)):
    def almond(d, S):
        d.chord([0, 40 * S, 500 * S, 420 * S], 200, 340, fill=255)
        d.chord([0, -140 * S, 500 * S, 260 * S], 20, 160, fill=255)
    return [(SHAPE("eye_o", 500, 300, almond, pal["paper"], 14, seed=18, shade=0.8), 0, 0),
            (ELL(210, 210, pal["main"], 4, seed=19), look[0], look[1]), (ELL(int(96 * pupil), int(96 * pupil), pal["ink"], 2, seed=20), look[0], look[1]),
            (ELL(40, 40, (250, 250, 250), 1, seed=21, rim=0, shadow=0), look[0] + 34, look[1] - 34)]


def brain(pal, t=0.0):
    items = []
    for i, (dx, dy, w, h) in enumerate([(-110, -40, 240, 220), (100, -50, 250, 230), (-30, -110, 260, 200), (-140, 70, 220, 180), (90, 80, 240, 180), (0, 30, 240, 220)]):
        items.append((ELL(w, h, mix(pal["bright"], pal["paper"], 0.25), 8, seed=40 + i, shade=0.6), dx, dy))
    for i, (dx, dy, rot) in enumerate([(-90, -40, 30), (80, -60, -20), (-20, 60, 60), (110, 60, 10)]):
        items.append((RR(120, 14, 7, pal["main"], 2, seed=50 + i, rough=0.6), dx, dy, rot))
    items.append((RR(26, 260, 12, pal["main"], 2, seed=58, rough=0.6), 0, -10, 4))
    return items


def chart(pal, t=0.0, grow=1.0):
    items = [(RR(380, 460, 18, pal["paper"], 10, seed=60), 0, 0), (RR(200, 50, 14, pal["ink"], 4, seed=61), 0, -190)]
    items.append((TXT("STUDY", 40, pal["paper"], 2, seed=62), 0, -190))
    for i, hgt in enumerate([120, 190, 150, 260]):
        hh = max(4, int(hgt * clamp(grow * 1.4 - i * 0.15)))
        items.append((RR(54, hh, 6, pal["main"] if i == 3 else mix(pal["main"], pal["paper"], 0.45), 3, seed=63 + i), -105 + i * 70, 170 - hh / 2))
    for i in range(3):
        items.append((RR(260, 10, 5, mix(pal["ink"], pal["paper"], 0.7), 1, seed=70 + i, rough=0.3, rim=0, shadow=0), 0, -120 + i * 28))
    return items


def person(pal, color=None):
    col = color or pal["ink"]
    def body(d, S):
        d.polygon([(x * S, y * S) for x, y in [(20, 420), (40, 250), (110, 190), (290, 190), (360, 250), (380, 420)]], fill=255)
    return [(SHAPE("person_b", 400, 420, body, col, 14, seed=80, shade=1.2), 0, 120), (ELL(210, 230, col, 14, seed=81, shade=1.2), 0, -150)]


def question(pal, color=None):
    return [(TXT("?", 300, color or pal["paper"], 12, seed=82), 0, 0)]


def bubble(pal, text="", t=0.0):
    def tail(d, S):
        d.polygon([(0, 0), (120 * S, 0), (10 * S, 110 * S)], fill=255)
    items = [(RR(760, 300, 80, pal["paper"], 16, seed=90, shade=0.6), 0, 0), (SHAPE("tail", 120, 110, tail, pal["paper"], 10, seed=91), -230, 190)]
    for i, dx in enumerate([-60, 0, 60]):
        items.append((ELL(40, 40, pal["main"], 3, seed=92 + i), dx, -70))
    if text:
        items.append((TXT(text, 50, pal["ink"], 3, seed=95), 0, 40))
    return items


def swatch(pal, color, label="", w=300, h=420):
    items = [(RR(w, h, 18, pal["paper"], 14, seed=100 + sum(color) % 7), 0, 0), (RR(w - 36, int(h * 0.68), 10, color, 4, seed=101 + sum(color) % 5), 0, -int(h * 0.12))]
    if label:
        items.append((TXT(label, 46, pal["ink"], 2, seed=102), 0, int(h * 0.36)))
    return items


# ---- Reserve-Icons für spätere Farben (blau, grün, gelb, lila ...)
def drop(pal, t=0.0):
    def fn(d, S):
        d.ellipse([40 * S, 160 * S, 320 * S, 440 * S], fill=255); d.polygon([(180 * S, 0), (44 * S, 260 * S), (316 * S, 260 * S)], fill=255)
    return [(SHAPE("drop", 360, 450, fn, pal["main"], 16, seed=110, shade=1.0), 0, 0), (ELL(60, 90, pal["paper"], 2, seed=111), -70, 60)]


def leaf(pal, t=0.0):
    def fn(d, S):
        d.chord([0, 0, 440 * S, 300 * S], 180, 360, fill=255); d.chord([0, -150 * S, 440 * S, 300 * S], 0, 180, fill=255)
    return [(SHAPE("leaf", 440, 300, fn, pal["main"], 14, seed=112, shade=1.0), 0, 0, -30), (RR(380, 14, 7, pal["deep"], 2, seed=113), 0, 0, -30)]


def sun(pal, t=0.0):
    def fn(d, S):
        d.polygon([(x * S, y * S) for x, y in _star_pts(230, 230, 228, 150, 14)], fill=255)
    return [(SHAPE("sunr", 460, 460, fn, pal["accent"], 12, seed=114), 0, 0, t * 15), (ELL(260, 260, pal["main"], 8, seed=115, shade=1.0), 0, 0)]


def moon(pal, t=0.0):
    return [(ELL(420, 420, pal["paper"], 14, seed=116, shade=1.0), 0, 0), (ELL(360, 360, pal["dark_bg"], 2, seed=117, rim=0, shadow=0), 110, -60)]


def star(pal, t=0.0):
    def fn(d, S):
        d.polygon([(x * S, y * S) for x, y in _star_pts(220, 220, 215, 95, 5)], fill=255)
    return [(SHAPE("star5", 440, 440, fn, pal["accent"], 14, seed=118, shade=1.0), 0, 0)]


ICONS = dict(heart=heart, crown=crown, bolt=bolt, burst=burst, warning=warning, clock=clock, slash=slash, eye=eye, brain=brain,
             chart=chart, drop=drop, leaf=leaf, sun=sun, moon=moon, star=star)


def icon(name, pal, t=0.0, **kw):
    return ICONS[name](pal, t, **kw)
