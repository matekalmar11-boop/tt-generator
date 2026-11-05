"""Alle Szenen des Shorts als Papier-Dioramen (2.5D). Jede Szene: sN(c, t, f) zeichnet auf Canvas c."""
from common import *

A1, A2a, A2b = seg("A1"), seg("A2a"), seg("A2b")
B1, B2, B3, B4 = seg("B1"), seg("B2"), seg("B3"), seg("B4")
C1, C2, D1, D2 = seg("C1"), seg("C2"), seg("D1"), seg("D2")
E1, E2, F1, F2 = seg("E1"), seg("E2"), seg("F1"), seg("F2")
G1, G2, H1, H2, H3, I1 = seg("G1"), seg("G2"), seg("H1"), seg("H2"), seg("H3"), seg("I1")

# Szenengrenzen (Sekunden)
B = dict(
    s2=A2a.start - 0.15,
    s3=B1.start - 0.75,
    s4=C1.start - 0.30,
    s5=D1.start - 0.55,
    s6=E1.start - 0.75,          # Türklingel
    s7=F1.start - 0.45,
    s8=G1.start - 0.55,
    s9=H1.start - 0.35,
    s10=I1.start - 0.65,
)
BELL = B["s6"]
CD_START = D2.end + 0.1                      # Countdown beginnt
CD_STEP = (BELL - 0.25 - CD_START) / 30.0   # 30 -> 0


def dust(c, t, f, cam, n=22, seed=1, color=CREAM, d=0.8, size=(5, 13), op=0.55, speed=18.0):
    rng = np.random.default_rng(seed)
    for i in range(n):
        x0, y0 = rng.uniform(0, W), rng.uniform(0, H)
        s = rng.uniform(*size)
        vx, vy = rng.uniform(-0.6, 0.6) * speed, rng.uniform(0.3, 1.0) * speed
        dd = d * rng.uniform(0.5, 1.2)
        x = (x0 + vx * t) % W
        y = (y0 + vy * t) % H
        X, Y, z = cam.at(x, y, dd)
        L = cached(("bit", int(s), color, i % 5), lambda: make_layer(rrect_mask(int(s), int(s * rng.uniform(0.6, 1.2) + 2), 2), color, h=3, seed=i, rough=0.6))
        draw(c, L, X, Y, rot=(t * 40 * rng.uniform(-1, 1) + i * 37), sc=z, op=op)


def red_pulse(c, k):
    c[:, :, 0] += k * 38
    c[:, :, 1] += k * 3


# ============================================================ S1  Hook
def s1(c, t, f):
    T1 = B["s2"]
    cam = Cam(lin(t, 0, T1, 1.0, 1.20), lin(t, 0, T1, -26, 34), lin(t, 0, T1, 10, 70))
    X, Y, s = cam.at(W / 2, H / 2, 0)
    draw(c, BG(NAVY0, (1.5, 0.6)), X, Y, sc=s)
    for i, (yy, col, amp, d, ht) in enumerate([(1500, NAVY1, 22, 0.15, 10), (1690, NAVY2, 28, 0.3, 16), (1830, NAVY0, 30, 0.5, 22)]):
        X, Y, s = cam.at(W / 2, yy, d)
        draw(c, BAND(W + 260, 560, col, amp, seed=i + 3, ht=ht), X, Y, sc=s)
    for i, (yy, col, d) in enumerate([(120, INK, 0.9)]):
        X, Y, s = cam.at(W / 2, yy, d)
        draw(c, BAND(W + 300, 380, col, 30, seed=11, ht=26, top=False), X, Y, sc=s)
    dust(c, t, f, cam, 24, seed=4, d=0.9)
    # Handy: Slam-in + Vibrieren
    sl = lin(t, 0, 0.30, 1.55, 1.0, True)
    bx, by, br = buzz(t, [(0, 0.55), (1.0, 1.45), (2.0, 2.3), (3.3, 3.55)], 9, f)
    px, py, ps = cam.at(540, 830, 0.7)
    rot = -5 + br
    glow(c, px, py, 1000, (60, 110, 240), 0.5)
    items = list(phone_items(ICE))
    # Lockscreen
    items += [(TXT("Dienstag, 14. Mai", 40, (70, 95, 140), 2, FONT_XB, seed=2), 0, -405, 0)]
    items += [(TXT("23:47", 215, RED, 9, seed=3), 0, -265, 0)]
    glow(c, px, py - 265 * s, 380, (255, 40, 50), 0.55 + 0.25 * np.sin(t * 7))
    draw_group(c, items, px + bx, py + by, rot, s * sl)
    # Benachrichtigung
    nb = bounce(t, 1.0, 0.38)
    if nb > 0:
        card = [(RR(450, 235, 30, CREAM, 8, seed=4), 0, 0),
                LT(TXT("NACHRICHTEN  ·  jetzt", 28, (110, 106, 100), 1, FONT_XB), -195, -84),
                LT(TXT("ICH", 66, INK, 2, seed=5), -195, -30),
                LT(TXT("+49 151 234 5647", 30, (70, 70, 80), 1, FONT_XB), -195, 28),
                LT(TXT("Öffne morgen auf keinen Fall…", 29, (40, 40, 46), 1, FONT_XB), -195, 74)]
        ny = lin(t, 1.0, 1.35, -190, -40)
        gx, gy, gr = buzz(t, [(1.0, 1.45), (2.0, 2.3), (3.3, 3.55)], 9, f)
        qx = px + gx + (-math.sin(math.radians(rot))) * (ny * s)
        qy = py + gy + math.cos(math.radians(rot)) * ny * s + 0
        draw_group(c, card, qx + 4 * math.sin(math.radians(rot)) * 0, py + ny * s * math.cos(math.radians(rot)) + gy - 0, rot, s * nb)
    lb = bounce(t, 3.25, 0.3)
    if lb > 0:
        lab = [(RR(330, 76, 10, RED, 8, seed=6), 0, 0), (TXT("EIGENE NUMMER", 38, CREAM, 1, FONT_BLACK), 0, 0)]
        draw_group(c, lab, px + 120 * s, py + 125 * s, rot + 7, s * lb)
    if t < 0.28:
        c += 80 * (1 - t / 0.28)


# ============================================================ S2  Nachricht
def s2(c, t, f):
    T0, T1 = B["s2"], B["s3"]
    cam = Cam(lin(t, T0, T1, 1.0, 1.28), lin(t, T0, T1, 20, -30), lin(t, T0, T1, 0, 80))
    X, Y, s = cam.at(W / 2, H / 2, 0)
    draw(c, BG(NAVY0, (1.4, 0.5), seed=2), X, Y, sc=s)
    # Türen im Hintergrund
    for i, (x, w, hh, col, d) in enumerate([(120, 330, 1100, NAVY1, 0.12), (960, 330, 1100, NAVY1, 0.12), (540, 440, 1250, CHAR, 0.25)]):
        X, Y, s = cam.at(x, 860, d)
        draw(c, RR(w, hh, 8, col, 14, seed=20 + i, shade=1.0), X, Y, sc=s)
        draw(c, RR(w - 90, hh // 2 - 60, 6, tuple(int(v * 0.8) for v in col), 5, seed=30 + i, rim=0.3), X, Y - hh // 4 + 10, sc=s)
        draw(c, ELL(30, 30, CREAM, 6, seed=40 + i), X + w * 0.36 * s, Y + 60 * s, sc=s)
    X, Y, s = cam.at(540, 1485, 0.25)
    draw(c, RR(330, 16, 3, (255, 70, 70), 1, seed=8, rough=0.3, rim=0.1, shadow=0), X, Y, sc=s)
    glow(c, X, Y, 360, (255, 40, 50), 0.55 + 0.25 * np.sin(t * 9))
    X, Y, s = cam.at(W / 2, 1830, 0.7)
    draw(c, BAND(W + 260, 500, INK, 26, seed=9, ht=30), X, Y, sc=s)
    dust(c, t, f, cam, 16, seed=6, d=0.9)
    # Handy mit Chat
    px, py, s = cam.at(540, 880, 0.75)
    bx, by, br = buzz(t, [(A2a.start - 0.12, A2a.start + 0.3), (A2b.start - 0.05, A2b.start + 0.4)], 8, f)
    sc_ = s * 1.28 * bounce(t, T0 - 0.2, 0.25) if t < T0 + 0.2 else s * 1.28
    glow(c, px, py, 1000, (60, 110, 240), 0.4)
    items = list(phone_items((20, 32, 66), INK))
    items += [(RR(486, 130, 0, NAVY2, 4, seed=3, rough=0.2, shadow=0.3), 0, -400),
              (ELL(76, 76, CREAM, 3, seed=4), -190, -400), (TXT("I", 52, INK, 1, seed=3), -190, -400),
              LT(TXT("ICH", 46, CREAM, 1), -135, -420), LT(TXT("eigene Nummer", 26, (150, 175, 225), 1, FONT_XB), -135, -378)]
    # Tipp-Punkte
    if A2a.start - 0.1 <= t < A2b.start:
        items += [(RR(180, 84, 40, CREAM, 6, seed=7), -140, -250)]
        for k in range(3):
            dy = -6 * (1 if int(t * 6) % 3 == k else 0)
            items += [(ELL(26, 26, (90, 90, 100), 1, seed=k), -190 + k * 50, -250 + dy)]
    # Blase mit Text
    bb = bounce(t, A2b.start - 0.05, 0.3)
    if bb > 0:
        items += [(RR(440, 360, 44, CREAM, 10, seed=12), 0, -170 + (1 - bb) * 20, 0, bb)]
        words = [("Öffne", 0, 0), ("morgen", 0, 0), ("auf", 1, 1), ("keinen", 1, 1), ("Fall", 1, 1), ("die", 0, 2), ("Haustür.", 0, 2)]
        lines = [[0, 1], [2, 3, 4], [5, 6]]
        tot = sum(len(w[0]) for w in words)
        acc = 0.0
        pos = {}
        for i, (wd, red, ln) in enumerate(words):
            pos[i] = A2b.start + A2b.dur * (acc / tot) * 0.95
            acc += len(wd) + 1
        for li, idxs in enumerate(lines):
            wid = [TXT(words[i][0], 50, RED if words[i][1] else INK, 1, FONT_BLACK, seed=i + 5, rough=0.4) for i in idxs]
            tw = sum(w_.w - 2 * w_.pad for w_ in wid) + 18 * (len(idxs) - 1)
            x = -tw / 2
            for k, i in enumerate(idxs):
                ww = wid[k].w - 2 * wid[k].pad
                wb = bounce(t, pos[i], 0.22)
                if wb > 0:
                    items += [(wid[k], x + ww / 2, -255 + li * 82, (i * 7 % 5 - 2) * 0.6, wb)]
                x += ww + 18
        if t > A2b.end - 0.55:
            ub = bounce(t, A2b.end - 0.55, 0.25)
            items += [(RR(300, 12, 5, RED, 3, seed=14, rough=1.0), 10, -163, -2.0, ub)]
    draw_group(c, items, px + bx, py + by, -3 + br, sc_)


# ============================================================ S3  Schlafzimmer
CURT = [(NAVY0, 0), (NAVY1, 1)]


def bedroom(c, t, f, cam, head="back", head_dx=0.0, head_dy=0.0, glow_k=1.0, flash=0.0, sway=1.0, person=True, hp=1.0):
    X, Y, s = cam.at(W / 2, H / 2, 0)
    draw(c, BG(NAVY1, (1.35, 0.55), seed=3), X, Y, sc=s)
    # Tapete: dezente Streifen
    stripes = cached("stripes", lambda: make_layer(np.tile(np.concatenate([np.full((H + 100, 34), 255, np.uint8), np.zeros((H + 100, 76), np.uint8)], 1), (1, 12))[:, :W + 80], NAVY2, h=0, seed=5, rough=0, shadow=0, rim=0))
    X, Y, s = cam.at(W / 2, H / 2, 0.05)
    draw(c, stripes, X, Y, sc=s, op=0.22)
    # Fenster mit Mond
    wx, wy = 250, 640
    X, Y, s = cam.at(wx, wy, 0.18)
    draw(c, RR(360, 540, 12, INK, 14, seed=21), X, Y, sc=s)
    draw(c, RR(310, 490, 8, (34, 70, 140), 3, seed=22, grad=(1.5, 0.6), rim=0.15, shadow=0.1), X, Y, sc=s)
    for k, (sx_, sy_) in enumerate([(-80, -150), (60, -190), (90, -90), (-30, -60), (-100, -30)]):
        draw(c, ELL(8, 8, CREAM, 1, seed=k, rough=0.3, rim=0, shadow=0), X + sx_ * s, Y + sy_ * s - 20 * s, sc=s)
    mx, my = X - 15 * s, Y - 130 * s
    glow(c, mx, my, 330, (150, 190, 255), 0.55)
    draw(c, ELL(120, 120, CREAM, 4, seed=23), mx, my, sc=s)
    draw(c, ELL(30, 30, (205, 198, 180), 1, seed=24, rough=0.3, rim=0, shadow=0), mx - 20 * s, my + 12 * s, sc=s)
    draw(c, RR(14, 490, 2, INK, 5, seed=25, rough=0.4), X, Y, sc=s)
    draw(c, RR(310, 14, 2, INK, 5, seed=26, rough=0.4), X, Y + 30 * s, sc=s)
    draw(c, RR(400, 26, 4, INK, 14, seed=27), X, Y + 285 * s, sc=s)
    # Lichtkegel vom Mond
    cone = cached("cone", lambda: make_layer(poly_mask([(60, 0), (260, 0), (520, 900), (-200, 900)], 560, 900), (110, 150, 230), h=0, seed=1, rough=0, shadow=0, rim=0))
    draw(c, cone, X + 140 * s, Y + 700 * s, sc=s, op=0.09)
    # Regal + Uhr
    X, Y, s = cam.at(790, 560, 0.25)
    draw(c, RR(390, 24, 4, CHAR, 12, seed=31), X, Y, sc=s)
    for i, (bw, bh, col) in enumerate([(34, 140, DRED), (44, 175, BLUE), (30, 120, (120, 118, 130)), (40, 150, NAVY2), (36, 110, (150, 70, 80)), (28, 165, (60, 90, 120))]):
        draw(c, RR(bw, bh, 3, col, 5, seed=40 + i, shade=0.6), X - 150 * s + i * 52 * s + ((i * 3) % 2) * 0, Y - (bh / 2 + 12) * s, rot=(i % 3 - 1) * (1.5 if i == 5 else 0), sc=s)
    cx_, cy_ = 790, 330
    X, Y, s = cam.at(cx_, cy_, 0.22)
    draw(c, ELL(210, 210, CHAR, 10, seed=33), X, Y, sc=s)
    draw(c, ELL(186, 186, CREAM, 3, seed=34, rim=0.2), X, Y, sc=s)
    for k in range(12):
        a = math.radians(k * 30)
        draw(c, RR(6, 16 if k % 3 else 24, 2, INK, 1, seed=k, rough=0.2, rim=0, shadow=0), X + 78 * s * math.sin(a), Y - 78 * s * math.cos(a), rot=k * 30, sc=s)
    for ln, ang, thick in [(52, 354, 10), (78, 282 + (0 if t < 99 else 0), 6)]:
        a = math.radians(ang)
        draw(c, RR(thick, ln, 3, INK, 2, seed=ang % 7, rough=0.3, rim=0.1, shadow=0.3), X + ln / 2 * s * math.sin(a), Y - ln / 2 * s * math.cos(a), rot=ang, sc=s)
    draw(c, ELL(16, 16, RED, 1, seed=3, rough=0.2, rim=0, shadow=0), X, Y, sc=s)
    # Boden
    X, Y, s = cam.at(W / 2, 1640, 0.5)
    draw(c, BAND(W + 260, 700, NAVY0, 20, seed=51, ht=20, grad=(1.2, 0.6)), X, Y, sc=s)
    # Bett (Kissen links, Decke unten)
    X, Y, s = cam.at(190, 1360, 0.62)
    draw(c, RR(300, 150, 60, (140, 140, 165), 14, seed=52, shade=1.0), X, Y, rot=-4, sc=s)
    X, Y, s = cam.at(860, 1390, 0.62)
    draw(c, RR(420, 260, 80, (50, 80, 140), 18, seed=53, shade=1.0), X, Y, rot=5, sc=s)
    # Figur
    if person:
        px, py, s = cam.at(540, 1225 + np.sin(t * 2.2) * 2, 0.72); s *= 1.15
        if flash >= 0:
            glow(c, px, py + 260 * s, 560, (70, 120, 230), 0.42 * glow_k)
        draw_person(c, px, py, s, head, head_dx, head_dy, bright=1.0 * hp)
        # Telefonlicht am Schoß (Rand)
        glow(c, px, py + 330 * s, 380, (110, 160, 255), 0.35 * glow_k)
    # Decke vorne
    X, Y, s = cam.at(W / 2, 1830, 0.88)
    draw(c, BAND(W + 280, 560, (34, 58, 112), 26, seed=54, ht=34, grad=(1.15, 0.7)), X, Y, sc=s)
    # Vorhänge
    for side in (-1, 1):
        for k in range(6):
            x = (k * 38 + 10) if side < 0 else (W - k * 38 - 10)
            col = NAVY0 if k % 2 == 0 else (14, 22, 50)
            X, Y, s = cam.at(x, 750, 0.97)
            sw = np.sin(t * 1.3 + k * 0.7 + (1 if side > 0 else 0)) * 0.55 * sway
            draw(c, BAND(46, 1650 - k * 60, col, 5, seed=60 + k + (6 if side > 0 else 0), ht=10, top=False), X, Y, rot=sw, sc=s)


def photo_frame(tk=None):
    """Das 'Foto': dieselbe Szene, aufgenommen von hinter der Figur (Droste-Effekt)."""
    def b():
        c = canvas()
        bedroom(c, B1.start, int(B1.start * FPS), Cam(1.0), sway=0)
        crop = c[430:1350, 100:980]
        crop = cv2.resize(crop, (600, 600), interpolation=cv2.INTER_AREA)
        g = crop.mean(axis=2, keepdims=True)
        crop = crop * 0.55 + g * 0.45 + np.array([-8, 2, 18], np.float32)
        crop = np.clip(crop * 1.25 + 8, 0, 255).astype(np.uint8)
        return crop
    return cached("photo", b)


def s3(c, t, f):
    T0, T1 = B["s3"], B["s4"]
    cam = Cam(lin(t, T0, T1, 1.0, 1.10), lin(t, T0, T1, -30, 40), lin(t, T0, T1, 0, 30))
    tk = t
    bx, by, br = buzz(t, [(B2.start - 0.05, B2.start + 0.35)], 5, f)
    flash = 0
    sh_t = B2.start + 0.95
    if sh_t <= t < sh_t + 0.12:
        flash = 1
    bedroom(c, t, f, cam, glow_k=1.0 + 0.5 * (1 if (B2.start - 0.05 <= t < B2.start + 0.45) else 0))
    dust(c, t, f, cam, 14, seed=2, d=0.95, op=0.4)
    if flash:
        c += 120
    # Polaroid
    p0 = sh_t + 0.14
    if t >= p0:
        pop = bounce(t, p0, 0.45)
        zoomp = lin(t, B3.start - 0.3, B4.start + 0.4, 1.0, 1.16, True)
        out = lin(t, B4.end - 0.1, C1.start - 0.1, 0, 1, True)   # fliegt am Ende weg
        x = lin(t, p0, p0 + 0.5, 540, 540, True) + out * 640
        y = lin(t, p0, p0 + 0.45, 1500, 860, True) - out * 350
        photo = layer_from_rgb(photo_frame(), 6)
        fr = RR(690, 800, 6, (232, 226, 210), 22, seed=71, rough=0.8, rim=0.3)
        rot = 3.0 + out * 24
        sc = pop * zoomp * (1 - out * 0.45)
        jx, jy, jr = jitter(5, f, 1.2)
        draw(c, fr, x + jx, y + jy, rot=rot + jr, sc=sc)
        draw(c, photo, x + jx, y - 62 * sc + jy, rot=rot + jr, sc=sc, shadow=0.0)
        draw(c, TXT("23:47", 46, (255, 130, 40), 1, FONT_MONO, rough=0.3, shadow=0.2), x + 215 * sc + jx, y + 205 * sc - 62 * sc + jy, rot=rot + jr, sc=sc)
        # Rote Kreisbewegung um die Figur im Foto (B3)
        sw = lin(t, B3.start + 0.5, B3.start + 1.5, 0, 360)
        if sw > 0 and out < 0.5:
            ring = make_layer(ring_mask(300, 14, 30, sw), RED, h=5, seed=8, rough=1.8)
            draw(c, ring, x + 5 * sc + jx, y - 46 * sc + jy, rot=rot + jr, sc=sc * 1.0)
        # Pfeil hinter mir (B4)
        ab = bounce(t, B4.start + 0.1, 0.3)
        if ab > 0 and out < 0.6:
            arr = POLY("arrow", [(70, 0), (150, 110), (100, 110), (100, 260), (40, 260), (40, 110), (-10, 110)], 160, 270, RED, 10, seed=9)
            draw(c, arr, x - 330 * sc + jx, y + 150 * sc, rot=18 + jr, sc=ab * sc * 0.9)
    # Rotes Warnlicht ab B3
    kk = lin(t, B3.start, B4.end, 0, 0.5)
    if kk > 0:
        red_pulse(c, kk * (0.6 + 0.4 * np.sin(t * 5)))


# ============================================================ S4  Umdrehen + leerer Raum
def room_reverse(c, t, f, cam, lamp=1.0):
    X, Y, s = cam.at(W / 2, H / 2, 0)
    draw(c, BG(NAVY0, (1.55, 0.5), seed=6), X, Y, sc=s)
    # Tür offen mit dunklem Flur
    X, Y, s = cam.at(560, 860, 0.2)
    draw(c, RR(330, 880, 8, INK, 16, seed=81), X, Y, sc=s)
    draw(c, RR(280, 840, 4, (3, 4, 8), 2, seed=82, rim=0.0, shadow=0.0), X, Y + 10 * s, sc=s)
    opening = lin(t, B["s4"], D1.start, 0.0, 1.0)
    glow(c, X + 120 * s, Y + 180 * s, 400, (110, 150, 230), 0.12 + 0.28 * opening)
    leaf = POLY("leaf", [(0, 0), (190, 40), (190, 780), (0, 840)], 190, 840, CHAR, 12, seed=83, shade=1.2)
    draw(c, leaf, X + 195 * s - 25 * opening * s, Y + 10 * s, sc=s * (1 - 0.08 * opening))
    draw(c, ELL(26, 26, CREAM, 5, seed=84), X + 170 * s - 24 * opening * s, Y + 40 * s, sc=s)
    # Spalt aus kaltem Licht
    draw(c, RR(10 + 30 * opening, 800, 2, (190, 220, 255), 0, seed=85, rough=0.5, rim=0, shadow=0), X - 150 * s, Y + 10 * s, sc=s, op=0.8)
    # Schrank
    X, Y, s = cam.at(170, 960, 0.35)
    draw(c, RR(320, 980, 10, CHAR, 18, seed=86, shade=1.0), X, Y, sc=s)
    draw(c, RR(8, 900, 2, INK, 2, seed=87, rough=0.3), X, Y, sc=s)
    draw(c, ELL(18, 60, CREAM, 3, seed=88), X - 28 * s, Y + 40 * s, sc=s)
    draw(c, ELL(18, 60, CREAM, 3, seed=89), X + 28 * s, Y + 40 * s, sc=s)
    # Mantel am Haken (sieht fast aus wie jemand)
    X, Y, s = cam.at(930, 980, 0.4)
    draw(c, POLY("coat", [(60, 0), (110, 40), (150, 260), (150, 560), (0, 560), (0, 260), (30, 40)], 150, 560, (22, 30, 60), 12, seed=90, rough=1.4, blur=6), X, Y + 20 * s, sc=s)
    # Fensterlicht huscht über die Wand
    sweep = lin(t % 4.0, 0, 4.0, -300, 1400)
    beam = cached("beam", lambda: make_layer(poly_mask([(60, 0), (200, 0), (140, 1400), (0, 1400)], 220, 1400), (120, 160, 240), h=0, seed=1, rough=0, shadow=0, rim=0))
    draw(c, beam, sweep, 760, sc=1.0, op=0.07)
    # Boden
    X, Y, s = cam.at(W / 2, 1700, 0.55)
    draw(c, BAND(W + 260, 700, INK, 22, seed=91, ht=22, grad=(1.1, 0.6)), X, Y, sc=s)
    # Lampe auf dem Boden (flackert)
    fl = 1.0 if (int(t * 12) % 7 not in (3,) and int(t * 12) % 11 != 8) else 0.15
    X, Y, s = cam.at(540, 1560, 0.7)
    glow(c, X, Y - 40 * s, 460, (110, 150, 235), 0.35 * fl * lamp)
    draw(c, POLY("shade", [(20, 0), (100, 0), (130, 120), (-10, 120)], 140, 120, (120, 150, 210) if fl > 0.5 else (50, 60, 90), 8, seed=92, rough=0.6), X, Y - 60 * s, sc=s)
    draw(c, RR(16, 140, 4, CHAR, 6, seed=93), X, Y + 80 * s, sc=s)
    X, Y, s = cam.at(W / 2, 1860, 0.95)
    draw(c, BAND(W + 300, 420, INK, 24, seed=94, ht=30), X, Y, sc=s)


def s4(c, t, f):
    T0, T1 = B["s4"], B["s5"]
    turn_end = C1.start + 0.85
    if t < turn_end:
        cam = Cam(1.10, 40, 30)
        # Kopfdrehung in Schritten (Stop-Motion)
        k = lin(t, C1.start - 0.05, C1.start + 0.6, 0, 5)
        k = int(k)
        seq = [("back", 0, 0), ("back", 18, 0), ("q", 30, 0), ("side", 14, 0), ("q", 0, 0), ("front", 0, 0)]
        head, dx, dy = seq[min(5, max(0, k))]
        bedroom(c, t, f, cam, head=head, head_dx=dx, head_dy=dy, glow_k=1.0, sway=1.4)
        if t > C1.start + 0.3:
            red_pulse(c, 0.4)
        dust(c, t, f, cam, 14, seed=2, d=0.95, op=0.4)
    else:
        cam = Cam(lin(t, turn_end, T1, 1.0, 1.18), lin(t, turn_end, T1, 30, -20), lin(t, turn_end, T1, 0, 20))
        room_reverse(c, t, f, cam)
        dust(c, t, f, cam, 20, seed=3, d=0.9, op=0.45)
        if turn_end <= t < turn_end + 0.18:
            c += 70 * (1 - (t - turn_end) / 0.18)


# ============================================================ S5  Nachricht #2 + Countdown
def s5(c, t, f):
    T0 = B["s5"]
    cam = Cam(1.0 + 0.03 * np.sin(t * 2), 0, 0)
    X, Y, s = cam.at(W / 2, H / 2, 0)
    draw(c, BG(NAVY0, (1.5, 0.45), seed=7), X, Y, sc=s)
    prog = lin(t, CD_START, BELL - 0.25, 0, 1)
    # roter Raumpuls
    hb = 0.55 - 0.18 * prog
    beat = max(0.0, 1 - ((t % hb) / 0.28))
    glow(c, W / 2, 900, 1100, (255, 30, 40), (0.10 + 0.25 * prog) + 0.15 * beat)
    for i, (yy, col, amp, d, ht) in enumerate([(1620, NAVY1, 24, 0.2, 12), (1790, INK, 28, 0.6, 24)]):
        X, Y, s = cam.at(W / 2, yy, d)
        draw(c, BAND(W + 260, 560, col, amp, seed=i + 13, ht=ht), X, Y, sc=s)
    dust(c, t, f, cam, 20, seed=8, d=0.9, color=(255, 120, 120), op=0.35)
    # Stufe 1: Handy mit neuer Nachricht
    ph_out = lin(t, CD_START - 0.1, CD_START + 0.35, 0, 1, True)
    if ph_out < 1:
        bx, by, br = buzz(t, [(D1.start + 0.5, D1.end + 0.4), (D2.start - 0.1, D2.start + 0.35)], 9, f)
        items = list(phone_items(ICE))
        items += [(TXT("23:47", 120, (90, 110, 160), 3, seed=3), 0, -330, 0)]
        mb = bounce(t, D1.start + 0.6, 0.35)
        if mb > 0:
            items += [(RR(450, 200, 28, CREAM, 8, seed=4), 0, -60, 0, mb), LT(TXT("ICH", 54, INK, 2, seed=5), -195, -90, 0, mb),
                      LT(TXT("Nachricht", 28, (110, 106, 100), 1, FONT_XB), -195, -146, 0, mb)]
        mt = bounce(t, D2.start, 0.35)
        if mt > 0:
            items += [(RR(450, 340, 36, RED, 10, seed=15), 0, 120 - (1 - mt) * 30, 0, mt),
                      (TXT("Du hast noch", 44, CREAM, 1), 0, 20, 0, mt), (TXT("30 Sekunden.", 62, CREAM, 2), 0, 85, 0, mt),
                      (TXT("Versteck dich.", 56, INK, 2, seed=6), 0, 185, 0, mt)]
        px, py = 540, 900 + ph_out * 1500
        glow(c, px, py, 900, (60, 110, 240), 0.4 * (1 - ph_out))
        draw_group(c, items, px + bx, py + by, -2 + br + ph_out * 14, 1.18)
    # Stufe 2: Countdown-Ring
    if t >= CD_START - 0.1:
        base = bounce(t, CD_START - 0.1, 0.4)
        k = int((t - CD_START) / CD_STEP) if t >= CD_START else -1
        remain = max(0, 30 - max(0, k + 1)) if t >= CD_START else 30
        pulse = 1.0 + 0.035 * beat
        cx_, cy_ = 540, 880
        seg_l = RR(26, 110, 8, RED, 8, seed=31, rough=0.8)
        seg_d = RR(26, 110, 8, (36, 18, 26), 3, seed=32, rough=0.8, shadow=0.3)
        for i in range(30):
            a = math.radians(i * 12)
            R = 430 * pulse * base
            on = i < remain
            L = seg_l if on else seg_d
            jx, jy, jr = jitter(i + 5, f, 1.3 if on else 0.4)
            draw(c, L, cx_ + R * math.sin(a) + jx, cy_ - R * math.cos(a) + jy, rot=i * 12 + jr, sc=base * (1.0 if on else 0.92))
        digits = f"{remain:02d}"
        dcol = CREAM if remain > 5 else BRED
        flick = 0 if remain != 0 else 1
        dl = TXT(digits, 420, dcol, 14, seed=remain + 3)
        jx, jy, jr = jitter(9, f, 2.0 + (4 if remain < 6 else 0))
        glow(c, cx_, cy_, 520, (255, 40, 50), 0.25 + 0.4 * (1 - remain / 30))
        draw(c, dl, cx_ + jx, cy_ + jy - 10, rot=jr * 2, sc=base * (1.0 + 0.04 * beat))
        draw(c, TXT("SEKUNDEN", 46, (180, 90, 100), 2, FONT_XB), cx_, cy_ + 260, sc=base)
        if t >= BELL - 0.2:
            c *= 0.12


# ============================================================ S6  Flur + Türklingel
def s6(c, t, f):
    T0, T1 = B["s6"], B["s7"]
    cam = Cam(lin(t, T0, T1 + 0.5, 1.0, 1.55), 0, lin(t, T0, T1, 0, -40))
    X, Y, s = cam.at(W / 2, H / 2, 0)
    draw(c, BG(NAVY0, (1.2, 0.5), seed=8), X, Y, sc=s)
    # Tür am Ende des Flurs
    dx_, dy_ = 540, 900
    X, Y, s = cam.at(dx_, dy_, 0.1)
    shake = buzz(t, [(T0, T0 + 0.22), (T0 + 0.42, T0 + 0.62)], 5, f)
    draw(c, RR(500, 860, 8, (22, 26, 44), 14, seed=101, shade=1.0), X, Y, sc=s)
    draw(c, RR(430, 790, 6, CHAR, 6, seed=102, shade=1.2), X + shake[0], Y + shake[1], rot=shake[2] * 0.4, sc=s)
    for i, (px_, py_, w_, h_) in enumerate([(-100, -230, 160, 240), (100, -230, 160, 240), (-100, 120, 160, 400), (100, 120, 160, 400)]):
        draw(c, RR(w_, h_, 6, (20, 22, 36), 4, seed=103 + i, rim=0.3), X + px_ * s + shake[0], Y + py_ * s + shake[1], sc=s)
    draw(c, ELL(46, 46, (150, 160, 190), 5, seed=110), X + shake[0], Y - 140 * s + shake[1], sc=s)
    draw(c, ELL(22, 22, (3, 4, 8), 1, seed=111, rim=0, shadow=0), X + shake[0], Y - 140 * s + shake[1], sc=s)
    glow(c, X, Y - 140 * s, 130, (255, 40, 50), 0.55 + 0.3 * np.sin(t * 8))
    # Lichtspalt unter der Tür
    fl = 1.0 if int(t * 12) % 5 not in (1,) else 0.3
    draw(c, RR(430, 14, 2, (200, 225, 255), 0, seed=112, rough=0.5, rim=0, shadow=0), X, Y + 410 * s, sc=s, op=0.9 * fl)
    glow(c, X, Y + 420 * s, 380, (150, 190, 255), 0.35 * fl)
    # Flur-Rahmen (Papier-Theater): nach vorne größer und dunkler
    rings = [(620, 1060, 0.22, (40, 66, 128)), (760, 1300, 0.38, (30, 50, 104)), (920, 1600, 0.55, (20, 34, 78)), (1100, 1900, 0.74, (12, 20, 48)), (1300, 2300, 0.95, (6, 10, 26))]
    for i, (hw, hh, d, col) in enumerate(rings):
        key = ("ring", i)
        Lr = cached(key, lambda hw=hw, hh=hh, col=col, i=i: make_layer(
            ((np.full((hh + 700, hw + 700), 255, np.uint8)) * 0 + 255).astype(np.uint8) - np.pad(np.full((hh, hw), 255, np.uint8), 350), col, h=26, seed=120 + i, rough=1.0, rim=0.35, shadow=0.9))
        X, Y, s = cam.at(W / 2, 960, d)
        draw(c, Lr, X, Y, sc=s)
    # Wanduhr (digital, rot): 23:47 -> 23:48
    X, Y, s = cam.at(860, 560, 0.5)
    tm = "23:48" if t >= E2.start else "23:47"
    pb = bounce(t, E2.start, 0.3) if t >= E2.start else 1.0
    glow(c, X, Y, 220, (255, 30, 40), 0.5)
    draw(c, RR(250, 110, 12, INK, 12, seed=131), X, Y, sc=s)
    draw(c, TXT(tm, 70, BRED, 1, FONT_MONO, seed=int(pb * 4) + 1, rough=0.3, shadow=0.1), X, Y, sc=s * pb)
    # Klingel-Zacken
    for k, (a_, b_) in enumerate([(T0, T0 + 0.28), (T0 + 0.42, T0 + 0.7)]):
        if a_ <= t < b_:
            for j in range(14):
                ang = j * 360 / 14 + k * 9 + (f % 3) * 4
                r0 = 330 + (t - a_) * 300
                z = POLY("zack", [(0, 0), (20, 0), (10, 70)], 20, 70, RED, 6, seed=j + 140, rough=0.5)
                draw(c, z, 540 + r0 * math.sin(math.radians(ang)), 900 - r0 * math.cos(math.radians(ang)), rot=ang + 180, sc=1.0)
    dust(c, t, f, cam, 16, seed=9, d=0.95, op=0.4)
    if T0 <= t < T0 + 0.16:
        c += 90
    if T0 <= t < T0 + 0.25:
        red_pulse(c, 0.8)


# ============================================================ S7  Türspion
_fish = {}


def fisheye_map(n):
    if n in _fish:
        return _fish[n]
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    u, v = (xx - n / 2) / (n / 2), (yy - n / 2) / (n / 2)
    r = np.sqrt(u * u + v * v)
    k = 0.55
    rd = r * (1 + k * r * r)
    f_ = np.where(r > 1e-4, 1 / (1 + k * r * r * 1.0) * 1.0, 1.0)
    # inverse approx: sample source at r / (1+k r^2) (Tonnenverzerrung)
    sr = r / (1 + k * r * r) * 1.35
    su = np.where(r > 1e-4, u / np.maximum(r, 1e-4) * sr, 0)
    sv = np.where(r > 1e-4, v / np.maximum(r, 1e-4) * sr, 0)
    mx, my = (su * n / 2 + n / 2).astype(np.float32), (sv * n / 2 + n / 2).astype(np.float32)
    circ = (np.clip((1 - r) * n * 0.5, 0, 1)).astype(np.float32)
    _fish[n] = (mx, my, circ)
    return _fish[n]


def outside_view(t, f, n=900):
    c = np.zeros((n, n, 3), np.float32)
    cam = Cam(1.0, 0, 0, cx=n / 2, cy=n / 2)
    draw(c, solid(n + 60, n + 60, (22, 42, 88), h=0, shadow=0, grad=(1.6, 0.55), seed=3), n / 2, n / 2)
    # Flurlicht
    glow(c, n * 0.5, n * 0.18, 420, (150, 190, 255), 0.5)
    draw(c, RR(260, 26, 8, (200, 220, 255), 2, seed=2, rough=0.4, rim=0, shadow=0), n * 0.5, n * 0.14)
    # Wände/Boden
    draw(c, POLY("floorv", [(0, 160), (900, 160), (900, 400), (0, 400)], 900, 400, (8, 12, 28), 0, seed=4, shadow=0, rough=1.0), n / 2, n - 190)
    draw(c, RR(120, 900, 0, (10, 16, 40), 6, seed=5), 70, n / 2)
    draw(c, RR(120, 900, 0, (10, 16, 40), 6, seed=6), n - 70, n / 2)
    appr = lin(t, F1.start, F2.end, 0.62, 1.08, True)
    appr = int(appr * 16) / 16.0
    # der Doppelgänger: gleiche Silhouette, von hinten rot beleuchtet
    glow(c, n / 2, n * 0.56, 380, (255, 30, 40), 0.55)
    jx, jy, jr = jitter(31, f, 2.0)
    draw_person(c, n / 2 + jx, n * 0.98 + (1 - appr) * 260 + jy, appr * 0.95, "front", color=(7, 8, 14), rot=jr)
    return c


def s7(c, t, f):
    T0, T1 = B["s7"], B["s8"]
    pz = lin(t, T0, T0 + 1.0, 1.0, 1.35, True)
    cam = Cam(pz, 0, 0)
    X, Y, s = cam.at(W / 2, H / 2, 0)
    draw(c, BG((15, 17, 28), (1.2, 0.6), seed=9), X, Y, sc=s)
    # Türfläche mit Holzmaserung
    X, Y, s = cam.at(W / 2, H / 2, 0.2)
    door = cached("doorfull", lambda: make_layer(np.full((H + 200, W + 200), 255, np.uint8), CHAR, h=0, seed=140, rough=0, shadow=0, shade=0))
    draw(c, door, X, Y, sc=s)
    for i, (px_, py_, w_, h_) in enumerate([(300, 420, 360, 560), (780, 420, 360, 560), (300, 1180, 360, 700), (780, 1180, 360, 700)]):
        X, Y, s = cam.at(px_, py_, 0.3)
        draw(c, RR(w_, h_, 8, (22, 24, 38), 10, seed=141 + i, rim=0.3), X, Y, sc=s)
    # Spion-Fassung
    X, Y, s = cam.at(540, 760, 0.5)
    open_ = lin(t, T0 + 0.6, T0 + 1.6, 0, 1, True)
    scale_view = 1 + open_ * 5.2
    draw(c, ELL(190, 190, (70, 84, 120), 12, seed=150, shade=1.5), X, Y, sc=s)
    draw(c, ELL(150, 150, (20, 24, 40), 4, seed=151, rim=0.4), X, Y, sc=s)
    draw(c, TXT("23:48", 54, BRED, 1, FONT_MONO, rough=0.3, shadow=0.1), 930, 260, sc=1.0)
    n = 900
    if open_ > 0:
        out = outside_view(t, f, n)
        mx, my, circ = fisheye_map(n)
        fv = cv2.remap(out, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        fv *= circ[:, :, None]
        # Skaliere Fischaugenbild auf Spion-Größe (wächst beim Reinzoomen)
        D = int(150 * s * scale_view * 1.0)
        D = max(8, min(2400, D))
        fvs = cv2.resize(fv, (D, D), interpolation=cv2.INTER_LINEAR)
        cs = cv2.resize(circ, (D, D), interpolation=cv2.INTER_LINEAR)
        x0, y0 = int(X - D / 2), int(Y - D / 2)
        sx0, sy0 = max(0, -x0), max(0, -y0)
        ex, ey = min(D, W - x0), min(D, H - y0)
        if ex > sx0 and ey > sy0:
            roi = c[y0 + sy0:y0 + ey, x0 + sx0:x0 + ex]
            a = cs[sy0:ey, sx0:ex, None]
            roi *= (1 - a)
            roi += fvs[sy0:ey, sx0:ex]
        # Rahmen / Schlagschatten des Spions
        ringL = cached("peepring", lambda: make_layer(np.clip(ellipse_mask(1000, 1000).astype(np.int16) - np.pad(ellipse_mask(900, 900), 50).astype(np.int16), 0, 255).astype(np.uint8), (24, 28, 44), h=18, seed=152, rough=0.6, shade=0.8))
        draw(c, ringL, X, Y, sc=D / 900.0 * 1.0 * 1.0)
    else:
        glow(c, X, Y, 180, (255, 30, 40), 0.35)
    # Eindringliche rote Kante
    glow(c, X, Y, int(260 * s * scale_view), (255, 30, 40), 0.12 * open_)
    dust(c, t, f, cam, 12, seed=11, d=0.9, op=0.3)


# ============================================================ S8  Letzte Nachricht
def s8(c, t, f):
    T0, T1 = B["s8"], B["s9"]
    cam = Cam(lin(t, T0, T1, 1.0, 1.14), lin(t, T0, T1, 20, -20), 0)
    X, Y, s = cam.at(W / 2, H / 2, 0)
    draw(c, BG((14, 6, 12), (1.5, 0.5), seed=10), X, Y, sc=s)
    # rote Papier-Sonne hinter dem Handy
    X, Y, s = cam.at(540, 860, 0.15)
    glow(c, X, Y, 1100, (255, 20, 40), 0.25 + 0.12 * np.sin(t * 6))
    draw(c, ELL(1100, 1100, DRED, 18, seed=160, grad=(1.2, 0.7)), X, Y, sc=s, op=0.85)
    draw(c, ELL(760, 760, (150, 20, 34), 12, seed=161, grad=(1.2, 0.7)), X, Y, sc=s, op=0.9)
    for i, (yy, col, amp, d, ht) in enumerate([(1700, (10, 8, 18), 26, 0.45, 20), (1840, INK, 30, 0.8, 30)]):
        X, Y, s = cam.at(W / 2, yy, d)
        draw(c, BAND(W + 260, 560, col, amp, seed=i + 15, ht=ht), X, Y, sc=s)
    dust(c, t, f, cam, 24, seed=12, d=0.9, color=(255, 150, 150), op=0.45)
    # Handy
    bx, by, br = buzz(t, [(T0 + 0.1, T0 + 0.7), (G1.end - 0.2, G1.end + 0.5), (G2.start - 0.1, G2.start + 0.35)], 12, f)
    px, py, s = cam.at(540, 880, 0.7)
    glow(c, px, py, 1000, (255, 60, 70), 0.35)
    items = list(phone_items((26, 10, 22), INK))
    items += [(TXT("23:48", 110, (150, 40, 55), 3, seed=3), 0, -350, 0), LT(TXT("ICH", 56, CREAM, 1), -200, -215, 0)]
    # Nachricht: Wörter poppen im Takt der Sprache auf
    words = ["Mach", "nicht", "denselben", "Fehler", "wie", "ich."]
    tot = sum(len(w) + 1 for w in words)
    acc = 0.0
    msgb = bounce(t, G1.end + 0.1, 0.35)
    if msgb > 0:
        items += [(RR(460, 400, 40, RED, 12, seed=17), 0, 60, 0, msgb)]
        pos = []
        for w in words:
            pos.append(G2.start + G2.dur * (acc / tot) * 0.92)
            acc += len(w) + 1
        lines = [[0, 1], [2], [3, 4, 5]]
        sizes = {0: 64, 1: 64, 2: 60, 3: 64, 4: 64, 5: 64}
        for li, idxs in enumerate(lines):
            wid = [TXT(words[i], sizes[i], CREAM if i not in (3,) else INK, 1, seed=i + 8, rough=0.4) for i in idxs]
            tw = sum(w_.w - 2 * w_.pad for w_ in wid) + 20 * (len(idxs) - 1)
            x = -tw / 2
            for k, i in enumerate(idxs):
                ww = wid[k].w - 2 * wid[k].pad
                wb = bounce(t, pos[i], 0.22)
                if wb > 0:
                    items += [(wid[k], x + ww / 2, -35 + li * 100, (i * 7 % 5 - 2) * 0.8, wb)]
                x += ww + 20
    draw_group(c, items, px + bx, py + by, 3 + br, s * 1.22)
    # Glitch-Streifen beim Eintreffen
    if (G1.end + 0.05 <= t < G1.end + 0.35) or (G2.start <= t < G2.start + 0.25):
        rng = np.random.default_rng(f)
        for _ in range(6):
            y0 = int(rng.integers(0, H - 80)); hh = int(rng.integers(12, 70)); dxs = int(rng.integers(-60, 60))
            c[y0:y0 + hh] = np.roll(c[y0:y0 + hh], dxs, axis=1)
            c[y0:y0 + hh, :, 0] += 30


# ============================================================ S9  Tür von innen
def feet(c, x, y, sc, color=INK, op=1.0, f=0, shift=0):
    """Schuhpaar im Lichtspalt + langer Schatten im Lichtfleck auf dem Boden (Richtung Zuschauer)."""
    for sx in (-1, 1):
        draw(c, RR(34, 26, 4, color, 0, seed=170, rough=0.3, rim=0, shadow=0), x + sx * 46 * sc, y - 4 * sc, sc=sc, op=op)
        draw(c, ELL(82, 20, color, 0, seed=171, rough=0.4, rim=0, shadow=0), x + sx * 62 * sc, y + 12 * sc, sc=sc, op=op)
        sh = cached(("legsh", 1), lambda: make_layer(rrect_mask(46, 250, 22), (4, 6, 14), h=0, seed=7, rough=1.0, rim=0, shadow=0))
        draw(c, sh, x + sx * 58 * sc * (1 + 0.5) + shift, y + 160 * sc, rot=sx * -4, sc=sc * 1.0, op=0.72 * op)


def s9(c, t, f):
    T0, T1 = B["s9"], B["s10"]
    DY = -250
    late = t > H3.start - 0.2
    zoom = lin(t, H3.start - 0.2, T1, 1.0, 1.3, True) if late else lin(t, T0, H3.start, 1.0, 1.05)
    cam = Cam(zoom, 0, lin(t, H3.start - 0.2, T1, 0, -120) if late else 0, cy=1000)
    X, Y, s = cam.at(W / 2, H / 2, 0)
    draw(c, BG(NAVY0, (1.4, 0.45), seed=11), X, Y, sc=s)
    X, Y, s = cam.at(540, 760 + DY, 0.2)
    draw(c, RR(860, 1180, 6, (14, 24, 52), 20, seed=180, shade=1.0), X, Y, sc=s)
    X, Y, s = cam.at(540, 780 + DY, 0.35)
    breathe = 1.0 + (0.006 if int(t * 6) % 2 else 0)
    draw(c, RR(690, 1050, 8, CHAR, 18, seed=181, shade=1.2), X, Y, sc=s * breathe)
    for i, (px_, py_, w_, h_) in enumerate([(-165, -250, 270, 360), (165, -250, 270, 360), (-165, 190, 270, 440), (165, 190, 270, 440)]):
        draw(c, RR(w_, h_, 6, (20, 22, 36), 5, seed=182 + i, rim=0.3), X + px_ * s, Y + py_ * s, sc=s * breathe)
    draw(c, RR(16, 90, 6, (160, 168, 196), 8, seed=190, shade=0.8), X + 290 * s, Y + 40 * s, sc=s)
    draw(c, ELL(54, 54, (160, 168, 196), 8, seed=191), X + 290 * s, Y + 40 * s, sc=s)
    pk = 0.5 + 0.5 * np.sin(t * 5)
    glow(c, X, Y - 240 * s, 220, (255, 30, 40), 0.35 + 0.3 * pk)
    draw(c, ELL(52, 52, (90, 100, 130), 4, seed=192), X, Y - 240 * s, sc=s)
    draw(c, ELL(30, 30, (255, 80, 80), 1, seed=193, rim=0, shadow=0), X, Y - 240 * s, sc=s, op=0.8)
    # Boden
    X, Y, s = cam.at(W / 2, 1480, 0.5)
    draw(c, BAND(W + 260, 900, INK, 22, seed=194, ht=22, grad=(1.2, 0.6)), X, Y, sc=s)
    # Lichtfleck auf dem Boden + Spalt
    sx, sy, s = cam.at(540, 1303 + DY, 0.45)
    spill = cached("spill", lambda: make_layer((cv2.GaussianBlur(poly_mask([(40, 0), (650, 0), (760, 420), (-70, 420)], 690, 420), (0, 0), 18) * np.linspace(1, 0, 420, dtype=np.float32)[:, None] ** 1.3).astype(np.uint8), (150, 190, 255), h=0, seed=3, rough=0, shadow=0, rim=0))
    pulse = 0.85 + 0.15 * np.sin(t * 9)
    draw(c, spill, sx, sy + 214 * s, sc=s, op=0.34 * pulse)
    glow(c, sx, sy - 10 * s, 600, (150, 190, 255), 0.5 * pulse)
    draw(c, RR(690, 26, 2, (225, 238, 255), 0, seed=195, rough=0.5, rim=0, shadow=0), sx, sy, sc=s)
    pairs = [(0, 0.0, 1.0), (-190, H3.start + 0.15, 1.0), (205, H3.start + 0.55, 1.0), (-330, H3.start + 1.0, 0.9), (335, H3.start + 1.35, 0.9), (-80, H3.start + 1.75, 0.8)]
    for dx_, ta, scl in pairs:
        if t >= ta or dx_ == 0:
            if dx_ != 0 and t < ta + 0.2 and int(t * 12) % 2:
                continue
            sh_ = 0 if t < H2.start else (5 if int(t * 5) % 2 else -5)
            feet(c, sx + dx_ * s + sh_, sy, s * scl, INK, f=f)
    # Protagonist (klein, von hinten, erstarrt)
    px, py, s = cam.at(540, 1700, 0.85)
    tremble = jitter(41, f, 2.0)
    draw_person(c, px + tremble[0], py + 30, s * 0.75, "back", color=(8, 10, 18), rot=tremble[2])
    dust(c, t, f, cam, 18, seed=13, d=0.9, op=0.35)
    red_pulse(c, 0.22 + 0.1 * pk)
    if H2.start - 0.03 <= t < H2.start + 0.12:
        c += 60


# ============================================================ S10  Schwarz + Frage
def s10(c, t, f):
    T0 = B["s10"]
    cam = Cam(1.0 + 0.02 * (t - T0), 0, 0)
    X, Y, s = cam.at(W / 2, H / 2, 0)
    draw(c, BG((5, 5, 8), (1.2, 0.8), seed=12), X, Y, sc=s)
    words = ["WER", "HAT", "DIE", "ERSTE", "NACHRICHT", "GESCHICKT?"]
    lines = [[0, 1, 2], [3], [4], [5]]
    tot = sum(len(w) + 1 for w in words)
    acc = 0.0
    pos = []
    for w in words:
        pos.append(I1.start + I1.dur * (acc / tot) * 0.9)
        acc += len(w) + 1
    y0 = 600
    off = [0, 1, 2, 3]
    heights = [150, 200, 200, 160]
    for li, idxs in enumerate(lines):
        size = [124, 190, 134, 112][li]
        wid = [TXT(words[i], size, RED if i in (3, 4) else CREAM, 10, seed=i + 20, rough=1.0) for i in idxs]
        tw = sum(w_.w - 2 * w_.pad for w_ in wid) + 28 * (len(idxs) - 1)
        x = W / 2 - tw / 2
        y = y0 + [0, 190, 400, 580][li]
        for k, i in enumerate(idxs):
            ww = wid[k].w - 2 * wid[k].pad
            wb = bounce(t, pos[i], 0.25)
            if wb > 0:
                jx, jy, jr = jitter(i, f, 2.5)
                X, Y, s = cam.at(x + ww / 2, y, 0.8)
                draw(c, wid[k], X + jx, Y + jy, rot=jr * 2 + (i * 5 % 7 - 3) * 0.9, sc=wb * s)
            x += ww + 28
    dust(c, t, f, cam, 20, seed=14, d=0.9, color=(255, 90, 90), op=0.4)
    glow(c, W / 2, 800, 900, (180, 20, 30), 0.12)


SCENES = [
    (0.0, s1), (B["s2"], s2), (B["s3"], s3), (B["s4"], s4), (B["s5"], s5),
    (B["s6"], s6), (B["s7"], s7), (B["s8"], s8), (B["s9"], s9), (B["s10"], s10),
]
