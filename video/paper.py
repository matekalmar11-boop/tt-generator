"""Mini-Engine für 2.5D-Paper-Cut-Stop-Motion: Papier-Texturen, Ausschnitte mit Kantenlicht,
Schattenwurf zwischen den Ebenen, Parallax, Glow, Rip-Übergänge."""
import math
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
FONT_BLACK = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
FONT_XB = "/usr/share/fonts/opentype/inter/InterDisplay-ExtraBold.otf"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

# Farbpalette (RGB)
INK = (9, 10, 16)
CHAR = (26, 28, 40)
NAVY0 = (9, 15, 36)
NAVY1 = (16, 28, 62)
NAVY2 = (26, 46, 92)
BLUE = (44, 78, 140)
ICE = (150, 196, 255)
CREAM = (236, 228, 208)
RED = (206, 28, 40)
DRED = (112, 14, 24)
BRED = (255, 64, 70)


# ---------------------------------------------------------------- Rauschen / Textur
def smooth_noise(h, w, scale, seed):
    rng = np.random.default_rng(seed)
    small = rng.random((h // scale + 3, w // scale + 3)).astype(np.float32)
    return cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC)


_master = {}


def master_texture():
    """Großes Papier-Muster (multiplikativ um 1.0): Fasern, Körnung, Knicke."""
    if "t" in _master:
        return _master["t"]
    h, w = 2300, 1500
    rng = np.random.default_rng(7)
    n = 0.5 * smooth_noise(h, w, 96, 1) + 0.3 * smooth_noise(h, w, 24, 2) + 0.2 * smooth_noise(h, w, 6, 3)
    fine = rng.normal(0, 1, (h, w)).astype(np.float32)
    fib = np.zeros((h, w), np.float32)
    for _ in range(int(w * h / 420)):
        x, y = int(rng.integers(0, w)), int(rng.integers(0, h))
        a = rng.uniform(0, math.pi)
        l = rng.uniform(5, 26)
        cv2.line(fib, (x, y), (int(x + l * math.cos(a)), int(y + l * math.sin(a))), float(rng.uniform(-1, 1)), 1, cv2.LINE_AA)
    fib = cv2.GaussianBlur(fib, (0, 0), 0.7)
    crease = np.zeros((h, w), np.float32)
    for _ in range(9):  # lange Knicklinien
        x, y = int(rng.integers(0, w)), int(rng.integers(0, h))
        a = rng.uniform(0, math.pi)
        l = rng.uniform(500, 1600)
        cv2.line(crease, (x, y), (int(x + l * math.cos(a)), int(y + l * math.sin(a))), float(rng.choice([-1, 1])) * 0.5, 2, cv2.LINE_AA)
    crease = cv2.GaussianBlur(crease, (0, 0), 1.6)
    tex = 1.0 + 0.16 * (n - 0.5) + 0.028 * fine + 0.075 * fib + 0.05 * crease
    _master["t"] = tex.astype(np.float32)
    return _master["t"]


def tex_crop(w, h, seed):
    t = master_texture()
    rng = np.random.default_rng(seed)
    y = int(rng.integers(0, t.shape[0] - h)) if h < t.shape[0] else 0
    x = int(rng.integers(0, t.shape[1] - w)) if w < t.shape[1] else 0
    c = t[y:y + h, x:x + w]
    if c.shape != (h, w):
        c = cv2.resize(t, (w, h))
    return c


# ---------------------------------------------------------------- Masken
SS = 2


def _pil_mask(w, h):
    im = Image.new("L", (w * SS, h * SS), 0)
    return im, ImageDraw.Draw(im)


def _fin(im, w, h):
    return np.asarray(im.resize((w, h), Image.LANCZOS))


def rrect_mask(w, h, r):
    w, h, r = int(round(w)), int(round(h)), int(round(r))
    im, d = _pil_mask(w, h)
    d.rounded_rectangle([0, 0, w * SS - 1, h * SS - 1], radius=r * SS, fill=255)
    return _fin(im, w, h)


def ellipse_mask(w, h):
    w, h = int(round(w)), int(round(h))
    im, d = _pil_mask(w, h)
    d.ellipse([0, 0, w * SS - 1, h * SS - 1], fill=255)
    return _fin(im, w, h)


def poly_mask(pts, w, h, extra=None):
    im, d = _pil_mask(w, h)
    d.polygon([(x * SS, y * SS) for x, y in pts], fill=255)
    if extra:
        extra(d, SS)
    return _fin(im, w, h)


def draw_mask(w, h, fn):
    """fn(draw, S): zeichnet mit Koordinaten * S."""
    im, d = _pil_mask(w, h)
    fn(d, SS)
    return _fin(im, w, h)


def text_mask(text, size, font=FONT_BLACK, pad=10, spacing=0, stroke=0):
    f = ImageFont.truetype(font, size)
    im0 = Image.new("L", (10, 10))
    bb = ImageDraw.Draw(im0).textbbox((0, 0), text, font=f, stroke_width=stroke)
    w, h = bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad
    im = Image.new("L", (w, h), 0)
    ImageDraw.Draw(im).text((pad - bb[0], pad - bb[1]), text, font=f, fill=255, stroke_width=stroke, stroke_fill=255)
    return np.asarray(im)


def torn_band(w, h, amp=14, seed=0, top=True, bottom=True, freq=40):
    """Rechteck mit unregelmäßigen, gerissenen Kanten oben/unten."""
    rng = np.random.default_rng(seed)
    xs = np.arange(w)
    def edge(s):
        r = np.random.default_rng(seed + s)
        n = cv2.resize(r.random((1, w // freq + 3)).astype(np.float32), (w, 1), interpolation=cv2.INTER_CUBIC)[0]
        n2 = cv2.resize(r.random((1, w // 7 + 3)).astype(np.float32), (w, 1), interpolation=cv2.INTER_CUBIC)[0]
        return (n - 0.5) * 2 * amp + (n2 - 0.5) * amp * 0.5
    m = np.zeros((h, w), np.uint8)
    t = (edge(1) + amp * 1.2).astype(int) if top else np.full(w, 0)
    b = (h - amp * 1.2 + edge(2)).astype(int) if bottom else np.full(w, h)
    yy = np.arange(h)[:, None]
    m[(yy >= t[None, :]) & (yy < b[None, :])] = 255
    return cv2.GaussianBlur(m, (0, 0), 0.7)


# ---------------------------------------------------------------- Ebenen
class Layer:
    __slots__ = ("rgba", "sh", "w", "h", "pad", "mask_inner")


def _rough(mask, amp, seed):
    if amp <= 0:
        return mask
    h, w = mask.shape
    dx = (smooth_noise(h, w, 14, seed) - 0.5) * 2 * amp
    dy = (smooth_noise(h, w, 14, seed + 5) - 0.5) * 2 * amp
    xx, yy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    m = cv2.remap(mask, xx + dx, yy + dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    return cv2.GaussianBlur(m, (0, 0), 0.6)


def make_layer(mask, color, h=6, seed=0, rough=1.4, rim=0.5, shade=0.0, tex=1.0, grad=None, shadow=0.7, rimcol=(238, 232, 220)):
    """Papier-Ausschnitt: mask (uint8) -> Layer mit Textur, hellem Schnittrand, Weichschatten.
    h = 'Höhe' über dem Untergrund in px (steuert Schattenabstand/-unschärfe)."""
    pad = int(h * 2.2 + 14)
    m0 = cv2.copyMakeBorder(mask, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
    m = _rough(m0, rough, seed)
    hh, ww = m.shape
    a = m.astype(np.float32) / 255.0
    col = np.array(color, np.float32)[None, None, :] * np.ones((hh, ww, 1), np.float32)
    if grad is not None:  # vertikaler Verlauf (top_mult, bottom_mult)
        g = np.linspace(grad[0], grad[1], hh, dtype=np.float32)[:, None, None]
        col = col * g
    t = tex_crop(ww, hh, seed * 31 + 3)[:, :, None] ** tex
    col = col * t
    # Relief: heller oben-links, dunkler unten-rechts
    if shade:
        bl = cv2.GaussianBlur(a, (0, 0), 3.0)
        gx = cv2.Sobel(bl, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(bl, cv2.CV_32F, 0, 1, ksize=3)
        col = col * (1 + shade * (-(gx + gy)))[:, :, None]
    # heller Schnittrand (Papierkern)
    if rim > 0:
        er = cv2.erode(m, np.ones((3, 3), np.uint8), iterations=1)
        edge = np.clip((m.astype(np.float32) - er.astype(np.float32)) / 255.0, 0, 1)
        edge = cv2.GaussianBlur(edge, (0, 0), 0.5)[:, :, None] * rim
        # Kante auf Seite der Lichtquelle (oben-links) heller
        col = col * (1 - edge) + np.array(rimcol, np.float32)[None, None, :] * edge
    rgba = np.dstack([np.clip(col, 0, 255), a * 255]).astype(np.uint8)
    # Schatten: weiter + enger
    far = cv2.GaussianBlur(a, (0, 0), h * 0.55 + 0.8)
    near = cv2.GaussianBlur(a, (0, 0), max(0.8, h * 0.12))
    M1 = np.float32([[1, 0, h * 0.50], [0, 1, h * 0.85]])
    M2 = np.float32([[1, 0, h * 0.10], [0, 1, h * 0.20 + 1]])
    far = cv2.warpAffine(far, M1, (ww, hh))
    near = cv2.warpAffine(near, M2, (ww, hh))
    sh = np.clip(np.maximum(far * 0.60, near * 0.70) * shadow * 1.25, 0, 0.95)
    L = Layer()
    L.rgba, L.sh, L.w, L.h, L.pad = rgba, (sh * 255).astype(np.uint8), ww, hh, pad
    return L


def solid(w, hh, color, **kw):
    kw.setdefault('rough', 0)
    return make_layer(np.full((hh, w), 255, np.uint8), color, **kw)


def draw(c, L, x, y, rot=0.0, sc=1.0, op=1.0, shadow=1.0, bright=1.0, tint=None, flip=False):
    """Legt Ebene L mit Mittelpunkt (x,y) auf Canvas c (float32 HxWx3, 0..255)."""
    if op <= 0.003:
        return
    img, sh = L.rgba, L.sh
    h, w = img.shape[:2]
    sx = -sc if flip else sc
    ang = math.radians(rot)
    ca, sa = math.cos(ang) * sc, math.sin(ang) * sc
    # Matrix: Rotation + Skalierung um Mittelpunkt, dann Verschiebung
    M = np.float32([[ca * (-1 if flip else 1), sa, 0], [-sa * (-1 if flip else 1), ca, 0]])
    cx, cy = w / 2, h / 2
    M[0, 2] = x - (M[0, 0] * cx + M[0, 1] * cy)
    M[1, 2] = y - (M[1, 0] * cx + M[1, 1] * cy)
    pts = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    tp = pts @ M[:, :2].T + M[:, 2]
    x0, y0 = int(max(0, math.floor(tp[:, 0].min()))), int(max(0, math.floor(tp[:, 1].min())))
    x1, y1 = int(min(c.shape[1], math.ceil(tp[:, 0].max()))), int(min(c.shape[0], math.ceil(tp[:, 1].max())))
    if x1 <= x0 or y1 <= y0:
        return
    M2 = M.copy()
    M2[0, 2] -= x0
    M2[1, 2] -= y0
    size = (x1 - x0, y1 - y0)
    interp = cv2.INTER_LINEAR if abs(sc - 1) > 1e-3 or abs(rot) > 1e-3 else cv2.INTER_NEAREST
    wi = cv2.warpAffine(img, M2, size, flags=interp, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    ws = cv2.warpAffine(sh, M2, size, flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    roi = c[y0:y1, x0:x1]
    s = (ws.astype(np.float32) / 255.0 * (shadow * op))[:, :, None]
    roi *= (1 - s)
    a = (wi[:, :, 3:4].astype(np.float32) / 255.0) * op
    rgb = wi[:, :, :3].astype(np.float32)
    if bright != 1.0:
        rgb = rgb * bright
    if tint is not None:
        rgb = rgb * np.array(tint, np.float32)[None, None, :]
    roi *= (1 - a)
    roi += rgb * a


# ---------------------------------------------------------------- Licht / Effekte
_glow_cache = {}


def glow(c, x, y, r, color, k=1.0):
    """Additiver weicher Lichtfleck."""
    key = int(r)
    if key not in _glow_cache:
        n = key * 2 + 1
        yy, xx = np.mgrid[-key:key + 1, -key:key + 1].astype(np.float32)
        d = np.sqrt(xx * xx + yy * yy) / key
        _glow_cache[key] = np.clip(1 - d, 0, 1) ** 2.2
    g = _glow_cache[key]
    n = g.shape[0]
    x0, y0 = int(x - key), int(y - key)
    sx0, sy0 = max(0, -x0), max(0, -y0)
    ex, ey = min(n, c.shape[1] - x0), min(n, c.shape[0] - y0)
    if ex <= sx0 or ey <= sy0:
        return
    sub = g[sy0:ey, sx0:ex, None] * k
    c[y0 + sy0:y0 + ey, x0 + sx0:x0 + ex] += sub * np.array(color, np.float32)[None, None, :]


_vig = {}


def vignette(c, strength=0.55, tint=(1, 1, 1)):
    key = (c.shape[0], c.shape[1])
    if key not in _vig:
        h, w = key
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        d = np.sqrt(((xx - w / 2) / (w * 0.62)) ** 2 + ((yy - h * 0.48) / (h * 0.62)) ** 2)
        _vig[key] = np.clip(d, 0, 1.6)[:, :, None]
    v = 1 - strength * np.clip(_vig[key] ** 2.0, 0, 1.2)
    c *= np.clip(v, 0, 1) * np.array(tint, np.float32)[None, None, :] + (1 - np.array(tint, np.float32)[None, None, :]) * 0


def film_grain(c, f, k=7.0):
    rng = np.random.default_rng(1000 + f)
    n = rng.normal(0, k, c.shape[:2]).astype(np.float32)
    c += n[:, :, None]


def jitter(seed, f, amp=1.6):
    """Stop-Motion-Zittern (px) pro 12-fps-Bild."""
    r = np.random.default_rng(seed * 7919 + f * 104729)
    return r.uniform(-amp, amp), r.uniform(-amp, amp), r.uniform(-0.35, 0.35)


# ---------------------------------------------------------------- Rip-Übergang
def rip(imgA, imgB, p, seed=1, vertical=False, flip=False):
    """Papier A wird weggerissen und gibt B frei. p in 0..1. Arrays HxWx3 float32."""
    A, B = imgA, imgB
    if vertical:
        A, B = A.transpose(1, 0, 2), B.transpose(1, 0, 2)
    if flip:
        A, B = A[:, ::-1], B[:, ::-1]
    h, w = A.shape[:2]
    rng = np.random.default_rng(seed)
    base = w * (1.08 - 1.16 * p)  # Risskante läuft von rechts nach links
    ys = np.arange(h)
    jag = cv2.resize(rng.random((1, h // 18 + 3)).astype(np.float32), (h, 1), interpolation=cv2.INTER_CUBIC)[0]
    jag2 = cv2.resize(rng.random((1, h // 5 + 3)).astype(np.float32), (h, 1), interpolation=cv2.INTER_CUBIC)[0]
    wob = (jag - 0.5) * 90 + (jag2 - 0.5) * 22 + np.sin(ys / 310.0 + seed) * 35
    edge = base + wob  # x-Position der Kante je Zeile
    shift = 6 + 520 * p ** 2.2 + 20 * p   # der abgezogene Teil rutscht nach rechts
    xx = np.arange(w, dtype=np.float32)[None, :]
    out = B.copy()
    # Schatten auf B entlang der Kante
    dist = (xx - (edge[:, None] + shift)) / 40.0
    sh = np.clip(1 - np.abs(np.minimum(dist, 0)) , 0, 1) * (dist < 0.25)
    out *= (1 - 0.55 * np.clip(np.exp(np.minimum(dist, 0) * 1.2), 0, 1) * (dist > -3) * (p < 0.995))[:, :, None]
    # A links der Kante bleibt stehen
    left = (xx < edge[:, None])
    # weißer Papierkern an der Rissstelle (links)
    core = (xx >= edge[:, None] - 9) & (xx < edge[:, None] + 1)
    out = np.where(left[:, :, None], A, out)
    cw = np.array([232, 226, 212], np.float32)
    nz = (0.85 + 0.15 * rng.random((h, w)).astype(np.float32))[:, :, None]
    out = np.where(core[:, :, None], cw * nz, out)
    # abgezogener Teil (rechts), gedreht & verschoben
    ang = -p * 7.0
    M = cv2.getRotationMatrix2D((w * 0.95, h * 0.04), ang, 1.0)
    M[0, 2] += shift
    right_mask = (~left).astype(np.float32)
    # nach vorne weißer Rand auch auf abgezogenem Stück
    Ar = np.dstack([A * right_mask[:, :, None], right_mask])
    Ar = cv2.warpAffine(Ar, M, (w, h), flags=cv2.INTER_LINEAR, borderValue=0)
    # weißer Kern auch am abgezogenen Stück
    edge_w = (xx >= edge[:, None] + 0) & (xx < edge[:, None] + 9)
    ew = cv2.warpAffine(np.dstack([np.where(edge_w[:, :, None], cw * nz, 0), edge_w.astype(np.float32)]), M, (w, h), flags=cv2.INTER_LINEAR)
    a = Ar[:, :, 3:4]
    rgb = Ar[:, :, :3] / np.maximum(a, 1e-3)
    ae = np.clip(ew[:, :, 3:4], 0, 1)
    rgbe = ew[:, :, :3] / np.maximum(ae, 1e-3)
    rgb = np.where(ae > 0.5, rgbe, rgb)
    a = np.maximum(a, ae)
    out = out * (1 - a) + rgb * a
    if flip:
        out = out[:, ::-1]
    if vertical:
        out = out.transpose(1, 0, 2)
    return np.ascontiguousarray(out)
