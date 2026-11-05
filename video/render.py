"""Frame-Compositor: Szene + Rip-Übergänge + Vignette/Korn + Untertitel."""
import sys
from scenes import *

RIPPED = {1: (False, False), 2: (False, False), 6: (True, False), 7: (False, True), 8: (False, False), 9: (True, True)}
RIP_PRE, RIP_POST = 0.22, 0.38


def scene_index(t):
    k = 0
    for i, (st, _) in enumerate(SCENES):
        if t >= st:
            k = i
    return k


def scene_frame(k, t, f):
    c = canvas()
    SCENES[k][1](c, t, f)
    return c


def render(f):
    t = f / FPS + 1e-4
    k = scene_index(t)
    # Übergang?
    c = None
    for j, (v, fl) in RIPPED.items():
        b = SCENES[j][0]
        if b - RIP_PRE <= t < b + RIP_POST:
            A = scene_frame(j - 1, t, f)
            Bf = scene_frame(j, t, f)
            p = (t - (b - RIP_PRE)) / (RIP_PRE + RIP_POST)
            p = min(1.0, max(0.0, p))
            p = int(p * 7) / 7.0 * 1.0 + 0.03       # Stop-Motion-Stufen
            c = rip(A, Bf, min(1, p), seed=j * 3 + 1, vertical=v, flip=fl)
            break
    if c is None:
        c = scene_frame(k, t, f)
    vignette(c, 0.62)
    c[:, :, 2] += 3
    film_grain(c, f, 3.2)
    # Untertitel
    keys = [k_ for k_ in TL if k_ != "_total"]
    for i, k_ in enumerate(keys):
        sg = TL[k_]
        nxt = TL[keys[i + 1]]["start"] if i + 1 < len(keys) else 1e9
        a, b = sg["start"] - 0.04, min(sg["end"] + 0.32, nxt - 0.02)
        if a <= t < b:
            draw_subtitle(c, sg["en"], t - a, f)
    # Schwarz am Ende (harter Schnitt)
    if t >= TOTAL - 0.30:
        c[:] = 0
    return np.clip(c, 0, 255).astype(np.uint8)


if __name__ == "__main__":
    import cv2, time
    out = sys.argv[1]
    times = [float(x) for x in sys.argv[2:]]
    tiles = []
    for tt in times:
        t0 = time.time()
        f = int(tt * FPS)
        im = render(f)
        print(tt, round(time.time() - t0, 2), flush=True)
        tiles.append(cv2.resize(im, (360, 640), interpolation=cv2.INTER_AREA))
    rows = [np.hstack(tiles[i:i + 6] + [np.zeros_like(tiles[0])] * (6 - len(tiles[i:i + 6]))) for i in range(0, len(tiles), 6)]
    cv2.imwrite(out, cv2.cvtColor(np.vstack(rows), cv2.COLOR_RGB2BGR))
    if len(times) <= 2:
        for i, tt in enumerate(times):
            cv2.imwrite(out.replace(".png", f"_{i}.png"), cv2.cvtColor(render(int(tt * FPS)), cv2.COLOR_RGB2BGR))
