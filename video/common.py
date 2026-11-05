"""Gemeinsame Bausteine: Zeitplan, Cache, Kamera, Text/Handy/Figuren-Sprites."""
import json
import math
from paper import *
import timeline as T

TL = json.load(open(T.WORK + "/timeline.json"))
TOTAL = TL["_total"]
FPS = 12                      # Stop-Motion-Takt (Ausgabe 24 fps, jedes Bild 2x)

_C = {}


def cached(key, fn):
    if key not in _C:
        _C[key] = fn()
    return _C[key]


from types import SimpleNamespace


def seg(i):
    return SimpleNamespace(**TL[i])


def ease(x):
    x = min(1, max(0, x))
    return x * x * (3 - 2 * x)


def lin(t, a, b, va, vb, e=False):
    x = (t - a) / (b - a) if b != a else 1.0
    x = min(1, max(0, x))
    if e:
        x = ease(x)
    return va + (vb - va) * x


def bounce(t, a, dur=0.35):
    """Pop-Skalierung (Stop-Motion-Überschwinger): 0 vor a, dann 1.25->0.93->1."""
    x = (t - a) / dur
    if x < 0:
        return 0.0
    if x >= 1:
        return 1.0
    return [0.45, 1.18, 0.94, 1.04, 1.0][min(4, int(x * 5))]


def buzz(t, spans, amp=7.0, f=0):
    """Vibrieren: Zitter-Offset (dx,dy,rot), wenn t in einem der Zeitfenster liegt."""
    for a, b in spans:
        if a <= t < b:
            r = np.random.default_rng(f * 97 + 13)
            return r.uniform(-amp, amp), r.uniform(-amp, amp) * 0.6, r.uniform(-1.4, 1.4) * amp / 7
    return 0.0, 0.0, 0.0


class Cam:
    def __init__(self, z=1.0, px=0.0, py=0.0, cx=W / 2, cy=H / 2):
        self.z, self.px, self.py, self.cx, self.cy = z, px, py, cx, cy

    def at(self, x, y, d):
        """Parallax: d=0 Hintergrund .. 1 Vordergrund. -> (X,Y,Skala)"""
        z = 1 + (self.z - 1) * (0.2 + 0.8 * d) if self.z != 1 else 1.0
        X = self.cx + (x - self.cx) * z - self.px * (0.1 + d)
        Y = self.cy + (y - self.cy) * z - self.py * (0.1 + d)
        return X, Y, z


def canvas():
    return np.zeros((H, W, 3), np.float32)


# ---------------------------------------------------------------- Text
def TXT(text, size, color, h=5, font=FONT_BLACK, seed=1, rough=0.7, shadow=0.7, stroke=0):
    key = ("txt", text, size, color, h, font, seed, stroke)
    return cached(key, lambda: make_layer(text_mask(text, size, font, stroke=stroke), color, h=h, seed=seed, rough=rough, shadow=shadow))


def BG(color, grad=(1.35, 0.65), seed=1):
    return cached(("bg", color, grad, seed), lambda: solid(W + 80, H + 80, color, h=0, shadow=0, grad=grad, seed=seed))


def BAND(w, h, color, amp=18, seed=1, ht=14, top=True, bottom=True, grad=None):
    return cached(("band", w, h, color, amp, seed, ht, top, bottom, grad),
                  lambda: make_layer(torn_band(w, h, amp, seed, top, bottom), color, h=ht, seed=seed, grad=grad))


def RR(w, h, r, color, ht=6, seed=1, rough=0.9, **kw):
    return cached(("rr", w, h, r, color, ht, seed, rough, tuple(sorted(kw.items()))),
                  lambda: make_layer(rrect_mask(w, h, r), color, h=ht, seed=seed, rough=rough, **kw))


def ELL(w, h, color, ht=6, seed=1, rough=1.0, **kw):
    return cached(("ell", w, h, color, ht, seed, rough, tuple(sorted(kw.items()))),
                  lambda: make_layer(ellipse_mask(w, h), color, h=ht, seed=seed, rough=rough, **kw))


def POLY(name, pts, w, h, color, ht=6, seed=1, rough=1.0, blur=0, **kw):
    def b():
        m = poly_mask(pts, w, h)
        if blur:
            m = cv2.GaussianBlur(m, (0, 0), blur)
            m = np.where(m > 127, 255, 0).astype(np.uint8)
            m = cv2.GaussianBlur(m, (0, 0), 0.8)
        return make_layer(m, color, h=ht, seed=seed, rough=rough, **kw)
    return cached(("poly", name, w, h, color, ht, seed, rough), b)


def layer_from_rgb(img, ht=8, seed=1, rough=0.6):
    """Foto/Bildausschnitt (HxWx3 uint8) als Papier-Ebene (zum Beispiel für das Polaroid)."""
    h, w = img.shape[:2]
    mask = np.full((h, w), 255, np.uint8)
    L = make_layer(mask, (128, 128, 128), h=ht, seed=seed, rough=rough, rim=0.2)
    pad = L.pad
    rgba = L.rgba.copy()
    big = cv2.copyMakeBorder(img, pad, pad, pad, pad, cv2.BORDER_REPLICATE)
    rgba[:, :, :3] = big
    L.rgba = rgba
    return L


# ---------------------------------------------------------------- Gruppen (Eltern-Kind-Transform)
def draw_group(c, items, x, y, rot=0.0, sc=1.0, op=1.0, shadow=1.0, bright=1.0, jit=None):
    """items: (Layer, dx, dy, drot, dsc) relativ zum Gruppenmittelpunkt."""
    a = math.radians(rot)
    ca, sa = math.cos(a), math.sin(a)
    for it in items:
        L, dx, dy = it[0], it[1], it[2]
        drot = it[3] if len(it) > 3 else 0.0
        dsc = it[4] if len(it) > 4 else 1.0
        px = x + sc * (ca * dx - sa * dy)
        py = y + sc * (sa * dx + ca * dy)
        draw(c, L, px, py, rot + drot, sc * dsc, op=op, shadow=shadow, bright=bright)


# ---------------------------------------------------------------- Figuren
def _person_back_mask():
    w, h = 460, 700
    def fn(d, S):
        d.polygon([(x * S, y * S) for x, y in [(30, 700), (24, 500), (60, 395), (140, 345), (320, 345), (400, 395), (436, 500), (430, 700)]], fill=255)
    m = draw_mask(w, h, fn)
    m = cv2.GaussianBlur(m, (0, 0), 14)
    m = np.where(m > 127, 255, 0).astype(np.uint8)
    return m


def PERSON_BODY(color=(11, 12, 22), seed=2):
    return cached(("pbody", color, seed), lambda: make_layer(_person_back_mask(), color, h=14, seed=seed, rough=1.2, shade=1.4, rimcol=(110, 150, 220), rim=0.55))


def HEAD(kind, color=(11, 12, 22), seed=3):
    """kind: back | q (3/4) | side | front"""
    def b():
        w, h = 300, 340
        if kind == "back":
            m = draw_mask(w, h, lambda d, S: d.ellipse([30 * S, 20 * S, 270 * S, 320 * S], fill=255))
        elif kind == "q":
            m = draw_mask(w, h, lambda d, S: (d.ellipse([60 * S, 20 * S, 255 * S, 320 * S], fill=255), d.polygon([(235 * S, 170 * S), (282 * S, 200 * S), (240 * S, 215 * S)], fill=255)))
        elif kind == "side":
            m = draw_mask(w, h, lambda d, S: (d.ellipse([70 * S, 20 * S, 230 * S, 320 * S], fill=255), d.polygon([(215 * S, 160 * S), (285 * S, 200 * S), (222 * S, 225 * S)], fill=255)))
        else:
            m = draw_mask(w, h, lambda d, S: d.ellipse([30 * S, 20 * S, 270 * S, 320 * S], fill=255))
        L = make_layer(m, color, h=12, seed=seed, rough=1.1, shade=1.4, rimcol=(110, 150, 220), rim=0.55)
        return L
    return cached(("head", kind, color, seed), b)


def FACE_VOID(w=150, h=210):
    return cached(("face", w, h), lambda: make_layer(ellipse_mask(w, h), (2, 3, 6), h=1, seed=9, rough=1.0, rim=0.0, shadow=0.0))


def draw_person(c, x, y, sc=1.0, head="back", head_dx=0.0, head_dy=0.0, bright=1.0, color=(11, 12, 22), op=1.0, lift=1.0, rot=0.0, headrot=0.0):
    """Sitzende Papier-Figur (Mittelpunkt des Torsos ~ (x,y)). Kopf getrennt animierbar."""
    body = PERSON_BODY(color)
    draw(c, body, x, y, rot=rot, sc=sc, op=op, bright=bright, shadow=lift)
    hd = HEAD(head, color)
    hx, hy = x + head_dx * sc, y - 150 * sc + head_dy * sc
    draw(c, hd, hx, hy, rot=headrot, sc=sc, op=op, bright=bright, shadow=lift)
    if head == "front":
        draw(c, FACE_VOID(), hx, hy + 12 * sc, sc=sc, op=op, shadow=0)
    elif head == "q":
        draw(c, FACE_VOID(110, 200), hx + 38 * sc, hy + 14 * sc, sc=sc, op=op, shadow=0)


# ---------------------------------------------------------------- Handy
PW, PH = 540, 1060


def phone_items(screen=ICE, body=INK):
    key = ("phone", screen, body)
    def b():
        bd = make_layer(rrect_mask(PW, PH, 66), body, h=26, seed=5, rough=1.0, shade=1.5, rim=0.6, rimcol=(96, 110, 150))
        sc_ = make_layer(rrect_mask(PW - 52, PH - 60, 46), screen, h=2, seed=6, rough=0.4, rim=0.12, shadow=0.15)
        notch = make_layer(rrect_mask(150, 34, 17), (4, 4, 8), h=1, seed=7, rough=0.3, rim=0.0, shadow=0.0)
        return [(bd, 0, 0), (sc_, 0, 0), (notch, 0, -PH / 2 + 62)]
    return cached(key, b)


def screen_glow(c, x, y, k=0.55, col=(70, 120, 230), r=820):
    glow(c, x, y, r, col, k)


def ring_mask(size, thick, start=0.0, sweep=360.0):
    def fn(d, S):
        box = [thick * S / 2, thick * S / 2, (size - thick / 2) * S, (size - thick / 2) * S]
        d.arc(box, start - 90, start - 90 + sweep, fill=255, width=int(thick * S))
    return draw_mask(size, size, fn)


def hand_ring(c, x, y, size, thick, sweep, color=RED, seed=1, ht=6, rot=0.0):
    """Mit der Hand ausgeschnittener roter Kreis (wird Stück für Stück gezeichnet)."""
    sweep = max(8, min(360, sweep))
    L = make_layer(ring_mask(size, thick, 0, sweep), color, h=ht, seed=seed, rough=1.6)
    draw(c, L, x, y, rot=rot)


# ---------------------------------------------------------------- Untertitel
def _wrap(words, f, maxw):
    lines, cur = [], []
    for wd in words:
        trial = cur + [wd]
        wtxt = " ".join(t for t, _ in trial)
        if f.getlength(wtxt) <= maxw or not cur:
            cur = trial
        else:
            lines.append(cur); cur = [wd]
    if cur: lines.append(cur)
    return lines


def subtitle_layers(en, size=78, maxw=960):
    """Baut aus 'text *rot* text|zeile2' Papier-Sticker: schwarzer Hintergrund + cremefarbene/rote Buchstaben."""
    def b():
        f = ImageFont.truetype(FONT_BLACK, size)
        raw = en.split("|")
        lines = []
        for part in raw:
            toks = []
            emph = False
            for piece in part.split("*"):
                for wd in piece.split():
                    toks.append((wd, emph))
                emph = not emph
            lines += _wrap(toks, f, maxw)
        lh = int(size * 1.18)
        pad = 26
        wmax = 0
        widths = []
        for ln in lines:
            wl = f.getlength(" ".join(t for t, _ in ln)); widths.append(wl); wmax = max(wmax, wl)
        Wd, Hd = int(wmax) + 2 * pad + 30, lh * len(lines) + 2 * pad
        norm = Image.new("L", (Wd, Hd), 0); emp = Image.new("L", (Wd, Hd), 0)
        dn, de = ImageDraw.Draw(norm), ImageDraw.Draw(emp)
        sp = f.getlength(" ")
        for i, ln in enumerate(lines):
            x = (Wd - widths[i]) / 2
            y = pad + i * lh
            for t, em in ln:
                (de if em else dn).text((x, y), t, font=f, fill=255)
                x += f.getlength(t) + sp
        nm, em_ = np.asarray(norm), np.asarray(emp)
        both = np.maximum(nm, em_)
        back = cv2.dilate(both, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
        back = cv2.GaussianBlur(back, (0, 0), 3.0)
        back = np.where(back > 100, 255, 0).astype(np.uint8)
        Lb = make_layer(back, (6, 7, 12), h=12, seed=11, rough=1.6, rim=0.35, shadow=0.9)
        Ln = make_layer(nm, CREAM, h=2.5, seed=12, rough=0.5, rim=0.25, shadow=0.5)
        Le = make_layer(em_, BRED, h=2.5, seed=13, rough=0.5, rim=0.25, shadow=0.5)
        return Lb, Ln, Le
    return cached(("sub", en, size), b)


def draw_subtitle(c, en, t_in, f, cy=1385):
    """Sticker poppt im Stop-Motion-Takt ein (t_in = Sekunden seit Einblendung)."""
    Lb, Ln, Le = subtitle_layers(en)
    s = bounce(t_in, 0, 0.30)
    if s <= 0:
        return
    jx, jy, jr = jitter(77, f, 1.4)
    x, y = W / 2 + jx, cy + jy
    rot = -0.7 + jr * 1.3
    draw(c, Lb, x, y, rot=rot, sc=s)
    draw(c, Ln, x, y, rot=rot, sc=s, shadow=0.6)
    draw(c, Le, x, y, rot=rot, sc=s, shadow=0.6)


def LT(layer, left, y, *rest):
    """Linksbündiges Item für draw_group (Text beginnt bei x=left)."""
    return (layer, left + (layer.w - 2 * layer.pad) / 2, y) + tuple(rest)
