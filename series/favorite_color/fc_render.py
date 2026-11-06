"""Compositor + Encoder: Szene je Abschnitt, Papier-Riss-Übergänge, animierte Untertitel, 12->24 fps, MP4.

Stills:  python3 fc_render.py episodes/red.json --stills 0.5 6 12 ...
Video:   python3 fc_render.py episodes/red.json --video
"""
import argparse, math, os, subprocess, sys, time
import multiprocessing as mp
from fc_common import *
from fc_scenes import Episode

HERE = os.path.dirname(os.path.abspath(__file__))
RIP_PRE, RIP_POST = 0.2, 0.34
RIP_STYLE = {"traits": (False, False), "shadow": (True, False), "fact": (False, True), "outro": (True, True)}
SUB_Y = 1335


class Renderer:
    def __init__(self, ep_path):
        self.ep = load_episode(ep_path)
        self.out = os.path.join(HERE, "out", self.ep["id"])
        self.T = Timeline(os.path.join(self.out, "timeline.json"))
        self.E = Episode(self.ep, self.T)
        self.chunks = self.make_chunks()

    # ------------------------------------------------ Untertitel
    def make_chunks(self, maxw=3, maxc=17):
        chunks = []
        for sid in self.T.order:
            ws = self.T.sections[sid]["words"]; cur = []
            for i, w in enumerate(ws):
                cur.append(w)
                text = " ".join(x["w"] for x in cur)
                end_punct = w["w"][-1] in ",.?!"
                nxt_len = len(text) + 1 + len(ws[i + 1]["w"]) if i + 1 < len(ws) else 99
                if end_punct or len(cur) >= maxw or nxt_len > maxc:
                    chunks.append(cur); cur = []
            if cur: chunks.append(cur)
        out = []
        for k, ch in enumerate(chunks):
            a = ch[0]["a"] - 0.06
            nxt = chunks[k + 1][0]["a"] - 0.06 if k + 1 < len(chunks) else 1e9
            b = min(ch[-1]["b"] + 0.35, nxt)
            out.append(dict(words=ch, a=a, b=b))
        return out

    def chunk_layers(self, ch, size=86):
        key = ("chunk", tuple(w["w"] for w in ch["words"]))
        def b():
            f = ImageFont.truetype(FONT_BLACK, size)
            toks = [w["w"].upper() for w in ch["words"]]
            sp = f.getlength(" ")
            widths = [f.getlength(t) for t in toks]
            tw = sum(widths) + sp * (len(toks) - 1)
            pad = 34
            Wd, Hd = int(tw) + 2 * pad, int(size * 1.25) + 2 * pad
            base = Image.new("L", (Wd, Hd), 0); dB = ImageDraw.Draw(base)
            word_masks = []
            x = pad
            for t_, w_ in zip(toks, widths):
                m = Image.new("L", (Wd, Hd), 0); ImageDraw.Draw(m).text((x, pad), t_, font=f, fill=255)
                dB.text((x, pad), t_, font=f, fill=255)
                word_masks.append(np.asarray(m)); x += w_ + sp
            bm = np.asarray(base)
            back = cv2.dilate(bm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (37, 37)))
            back = np.where(cv2.GaussianBlur(back, (0, 0), 3.0) > 90, 255, 0).astype(np.uint8)
            p = self.ep["pal"]
            Lb = make_layer(back, (8, 7, 10), h=12, seed=11, rough=1.6, rim=0.35, shadow=0.9)
            Ln = make_layer(bm, CREAM, h=2.5, seed=12, rough=0.5, rim=0.2, shadow=0.5)
            Lh = [make_layer(m, p["sub_highlight"], h=3, seed=13 + i, rough=0.5, rim=0.2, shadow=0.5) for i, m in enumerate(word_masks)]
            return Lb, Ln, Lh
        return cached(key, b)

    def draw_subs(self, c, t, f):
        for ch in self.chunks:
            if ch["a"] <= t < ch["b"]:
                Lb, Ln, Lh = self.chunk_layers(ch)
                s = bounce(t, ch["a"], 0.26)
                jx, jy, jr = jitter(7, f, 1.2)
                rot = -1.2 + jr
                x, y = W / 2 + jx, SUB_Y + jy
                draw(c, Lb, x, y, rot=rot, sc=s)
                draw(c, Ln, x, y, rot=rot, sc=s, shadow=0.6)
                cur = None
                for i, w in enumerate(ch["words"]):
                    if t >= w["a"] - 0.03:
                        cur = i
                if cur is not None:
                    draw(c, Lh[cur], x, y, rot=rot, sc=s * 1.0, shadow=0.6)
                return

    # ------------------------------------------------ Frame
    def scene_index(self, t):
        k = 0
        for i, (_, st) in enumerate(self.E.order):
            if t >= st: k = i
        return k

    def scene(self, k, t, f):
        c = canvas()
        self.E.scenes[self.E.order[k][0]](c, t, f)
        return c

    def frame(self, f):
        t = f / FPS + 1e-4
        k = self.scene_index(t)
        c = None
        for j in range(1, len(self.E.order)):
            sid, b = self.E.order[j]
            if b - RIP_PRE <= t < b + RIP_POST:
                p = clamp((t - (b - RIP_PRE)) / (RIP_PRE + RIP_POST))
                p = int(p * 7) / 7.0 + 0.03
                v, fl = RIP_STYLE.get(sid, (False, False))
                c = rip(self.scene(j - 1, t, f), self.scene(j, t, f), min(1, p), seed=j * 5 + 2, vertical=v, flip=fl)
                break
        if c is None:
            c = self.scene(k, t, f)
            if t < 0.12:            # Eröffnungs-Blitz beim Aufschlag der Bühne
                c += 110 * (1 - t / 0.12)
        vignette(c, 0.5)
        film_grain(c, f, 3.0)
        self.draw_subs(c, t, f)
        return np.clip(c, 0, 255).astype(np.uint8)

    def warm(self):
        """Caches im Elternprozess füllen (Worker erben sie per fork)."""
        for ch in self.chunks:
            self.chunk_layers(ch)
        for sid, st in self.E.order:
            for dt in (0.1, 0.8, 2.0, 3.5, 6.0):
                self.frame(int((st + dt) * FPS))
        for tt_ in [w["a"] + 0.2 for w in self.T.words]:
            self.frame(int(tt_ * FPS))


R = None


def _work(f):
    return R.frame(f).tobytes()


def main():
    global R
    ap = argparse.ArgumentParser()
    ap.add_argument("episode"); ap.add_argument("--stills", nargs="*", type=float); ap.add_argument("--video", action="store_true")
    ap.add_argument("--audio", default=None); ap.add_argument("--workers", type=int, default=4)
    a = ap.parse_args()
    R = Renderer(a.episode)
    if a.stills:
        sd = os.path.join(R.out, "stills"); os.makedirs(sd, exist_ok=True)
        tiles = []
        for t in a.stills:
            im = R.frame(int(t * FPS))
            cv2.imwrite(os.path.join(sd, f"still_{t:05.2f}.jpg"), cv2.cvtColor(im, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 90])
            tiles.append(cv2.resize(im, (270, 480), interpolation=cv2.INTER_AREA))
        while len(tiles) % 6: tiles.append(np.zeros_like(tiles[0]))
        sheet = np.vstack([np.hstack(tiles[i:i + 6]) for i in range(0, len(tiles), 6)])
        cv2.imwrite(os.path.join(sd, "contact_sheet.jpg"), cv2.cvtColor(sheet, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 88])
        print("stills ->", sd)
    if a.video:
        t0 = time.time(); R.warm(); print("warm", round(time.time() - t0, 1), flush=True)
        nf = int(math.ceil(R.T.total * FPS))
        audio = a.audio or os.path.join(R.out, "mix.wav")
        mp4 = os.path.join(R.out, f"{R.ep['id']}.mp4")
        cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", "24", "-i", "-", "-i", audio,
               "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-maxrate", "8M", "-bufsize", "16M", "-pix_fmt", "yuv420p",
               "-profile:v", "high", "-r", "24", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-af", "loudnorm=I=-14:TP=-1.5:LRA=7,alimiter=limit=0.83:level=false,apad",
               "-t", f"{R.T.total:.3f}", "-movflags", "+faststart", mp4]
        p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        with mp.get_context("fork").Pool(a.workers) as pool:
            for i, buf in enumerate(pool.imap(_work, range(nf), chunksize=2)):
                p.stdin.write(buf); p.stdin.write(buf)      # Stop-Motion auf Zweiern
                if i % 60 == 0: print(i, nf, round(time.time() - t0, 1), flush=True)
        p.stdin.close(); p.wait()
        print("done", mp4, round(time.time() - t0, 1))


if __name__ == "__main__":
    main()
