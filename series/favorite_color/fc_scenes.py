"""Szenen-Vorlage der Serie. Fünf Abschnitte: hook, traits, shadow, fact, outro.
Alles Episodenspezifische (Farbe, Texte, Icons, Schlüsselwörter) kommt aus episodes/<farbe>.json,
alle Zeitpunkte aus den exakten Wortzeiten der Sprecherspur."""
import math
from fc_common import *
import fc_icons as IC


class Episode:
    def __init__(self, ep, tl):
        self.ep, self.T, self.pal = ep, tl, ep["pal"]
        S = tl.sections
        mid = lambda a, b: (S[a]["end"] + S[b]["start"]) / 2
        self.b = dict(traits=mid("hook", "traits"), shadow=mid("traits", "shadow"), fact=mid("shadow", "fact"), outro=mid("fact", "outro"))
        self.order = [("hook", 0.0), ("traits", self.b["traits"]), ("shadow", self.b["shadow"]), ("fact", self.b["fact"]), ("outro", self.b["outro"])]
        wt = tl.wt
        self.t_color_hook = wt(ep["color_name"], "hook")
        self.t_psych = wt("psychology", "hook")
        self.traits = [(x["icon"], x["word"], wt(x["word"], "traits")) for x in ep["traits"]]
        self.t_people = wt(ep["traits_outro_word"], "traits")
        self.t_another = wt(ep["shadow_intro_word"], "shadow")
        self.shadow = [(x["icon"], x["word"], wt(x["word"], "shadow")) for x in ep["shadow_traits"]]
        du = ep["duality"]
        self.t_same = wt(du["word"], "shadow"); self.t_left = wt(du["left"]["word"], "shadow"); self.t_right = wt(du["right"]["word"], "shadow")
        fa = ep["fact"]
        self.t_studies = wt(fa["study_word"], "fact")
        beats = fa.get("beats") or [dict(word=fa["attention_word"], kind="eye", label="ATTENTION"), dict(word=fa["emotion_word"], kind="ekg")]
        self.fbeats = [dict(b_, t=wt(b_["word"], "fact")) for b_ in beats]
        self.t_attn = next((b_["t"] for b_ in self.fbeats if b_["kind"] != "ekg"), self.t_studies + 1)
        self.t_emo = next((b_["t"] for b_ in self.fbeats if b_["kind"] == "ekg"), None)
        # Abschluss des Fakt-Teils: "stat" (z.B. Podest) oder - nur Episode 1 - "caveat" (Stempel)
        self.fact_end = "caveat" if fa.get("caveat_word") else ("stat" if fa.get("stat") else None)
        self.t_but = wt(fa["caveat_word"], "fact") if self.fact_end == "caveat" else (wt(fa["stat"]["word"], "fact") if self.fact_end == "stat" else 1e9)
        self.t_cant = wt(fa.get("stamp_word", "can't"), "fact") if self.fact_end == "caveat" else 1e9
        self.t_comment = wt(ep["outro"]["comment_word"], "outro")
        self.t_end = S["outro"]["end"] + 0.15
        self.scenes = dict(hook=self.s_hook, traits=self.s_traits, shadow=self.s_shadow, fact=self.s_fact, outro=self.s_outro)

    # ------------------------------------------------------------ Hintergründe
    def rays(self, color, n=18):
        def b():
            S2 = 2600
            def fn(d, S):
                for i in range(n):
                    a0 = i * 2 * math.pi / n; a1 = a0 + math.pi / n
                    d.polygon([(S2 / 2 * S, S2 / 2 * S), ((S2 / 2 + S2 * math.cos(a0)) * S, (S2 / 2 + S2 * math.sin(a0)) * S), ((S2 / 2 + S2 * math.cos(a1)) * S, (S2 / 2 + S2 * math.sin(a1)) * S)], fill=255)
            # schneller: Strahlen mit OpenCV statt PIL-Supersampling
            m = np.zeros((S2, S2), np.uint8); c0 = (S2 // 2, S2 // 2)
            for i in range(n):
                a0 = i * 2 * math.pi / n; a1 = a0 + math.pi / n
                pts = np.array([c0, (c0[0] + S2 * math.cos(a0), c0[1] + S2 * math.sin(a0)), (c0[0] + S2 * math.cos(a1), c0[1] + S2 * math.sin(a1))], np.int32)
                cv2.fillPoly(m, [pts], 255, cv2.LINE_AA)
            return make_layer(m, color, h=0, seed=21, rough=0, shadow=0, rim=0)
        return cached(("rays", color, n), b)

    def warm_bg(self, c, t, rays=True, rspeed=5.0):
        p = self.pal
        draw(c, BG(p["warm_bg"], (1.25, 0.65), seed=2), W / 2, H / 2)
        if rays:
            draw(c, self.rays(p["main"]), W / 2, 820, rot=t * rspeed, op=0.55)
        glow(c, W / 2, 820, 900, mix(self.pal["bright"], (255, 230, 200), 0.5), 0.18)
        draw(c, BAND(W + 260, 520, p["deep"], 24, seed=4, ht=18), W / 2, 1790)
        draw(c, BAND(W + 260, 300, mix(p["deep"], p["ink"], 0.4), 28, seed=5, ht=24), W / 2, 1900)
        draw(c, BAND(W + 260, 300, p["deep"], 26, seed=6, ht=22, top=False), W / 2, 40)

    def dark_bg(self, c, t, pulse=True):
        p = self.pal
        draw(c, BG(p["dark_bg"], (1.4, 0.55), seed=3), W / 2, H / 2)
        k = 0.5 + 0.5 * math.sin(t * 2 * math.pi * 1.1) if pulse else 0.5
        glow(c, W / 2, 820, 1000, mix(p["main"], p["dark_bg"], 0.25), 0.16 + 0.14 * k)
        draw(c, BAND(W + 260, 520, mix(p["dark_bg"], p["deep"], 0.35), 24, seed=7, ht=18), W / 2, 1780)
        draw(c, BAND(W + 260, 320, p["ink"], 28, seed=8, ht=26), W / 2, 1900)
        draw(c, BAND(W + 260, 300, mix(p["dark_bg"], p["ink"], 0.5), 26, seed=9, ht=22, top=False), W / 2, 40)

    def paper_bg(self, c, t):
        p = self.pal
        draw(c, BG(p["paper"], (1.05, 0.86), seed=4), W / 2, H / 2)
        lines = cached("ruled", lambda: make_layer(np.tile(np.concatenate([np.full((3, W + 80), 255, np.uint8), np.zeros((61, W + 80), np.uint8)]), (32, 1))[:H + 80], (120, 150, 190), h=0, rough=0, shadow=0, rim=0, seed=5))
        draw(c, lines, W / 2, H / 2, op=0.28)
        draw(c, RR(8, H + 100, 2, p["main"], 0, seed=6, rough=0.3, rim=0, shadow=0), 120, H / 2, op=0.7)
        draw(c, BAND(W + 260, 420, mix(p["deep"], p["paper"], 0.15), 24, seed=10, ht=18), W / 2, 1820)
        draw(c, BAND(W + 260, 260, p["deep"], 26, seed=11, ht=22), W / 2, 1910)

    def brand(self, c, t, f, dark=False):
        p = self.pal
        jx, jy, jr = jitter(3, f, 1.0)
        draw(c, RR(640, 76, 22, p["ink"] if not dark else p["paper"], 8, seed=12), W / 2 + jx, 160 + jy, rot=-1 + jr)
        draw(c, TXT("IF THIS IS YOUR FAVORITE COLOR...", 34, p["paper"] if not dark else p["ink"], 2, FONT_XB, seed=13, rough=0.4), W / 2 + jx, 160 + jy, rot=-1 + jr)

    def label(self, c, f, word, t0, t, y=1170, color=None, back=None, x=W / 2, size=118):
        p = self.pal
        s = bounce(t, t0, 0.32)
        if s <= 0:
            return
        L = TXT(word.upper(), size, color or p["paper"], 8, seed=len(word))
        bw = L.w - 2 * L.pad + 70
        jx, jy, jr = jitter(len(word), f, 1.5)
        draw(c, RR(int(bw), int(size * 1.35), 24, back or p["ink"], 10, seed=len(word) + 1), x + jx, y + jy, rot=-2 + jr, sc=s)
        draw(c, L, x + jx, y + jy, rot=-2 + jr, sc=s)

    def carousel(self, items, t):
        """aktuelles Element (und vorheriges zum Rausfliegen) einer zeitgesteuerten Folge."""
        cur = None
        for i, it in enumerate(items):
            if t >= it[2] - 0.08:
                cur = i
        return cur

    # ------------------------------------------------------------ HOOK
    def s_hook(self, c, t, f):
        p, ep = self.pal, self.ep
        self.warm_bg(c, t, rays=True, rspeed=9)
        dust(c, t, n=20, seed=1, color=p["paper"], op=0.45)
        z = lin(t, 0, self.b["traits"], 1.0, 1.06)
        sc = (1.28 - 0.28 * ease(t / 0.22)) * z      # Bild 0: Bühne ist sofort da und 'landet' groß
        draw(c, ELL(820, 820, p["deep"], 6, seed=30), W / 2, 820, sc=sc)
        draw(c, ELL(760, 760, p["paper"], 20, seed=31, shade=0.8), W / 2, 820, sc=sc)
        # Farbname, Buchstaben einzeln (Stop-Motion)
        name = ep["color_name"]
        size = 330 if len(name) <= 4 else int(330 * 4 / len(name))
        Ls = [TXT(ch, size, p["main"], 18, seed=40 + i) for i, ch in enumerate(name)]
        widths = [L.w - 2 * L.pad for L in Ls]; tw = sum(widths) + 14 * (len(Ls) - 1)
        fit = min(1.0, 640 / tw)                   # Name passt immer in den Papierkreis
        widths = [w_ * fit for w_ in widths]; tw *= fit
        x = W / 2 - tw / 2
        pulse = 1.0 + 0.08 * max(0.0, 1 - abs(t - self.t_color_hook - 0.1) / 0.18)
        for i, L in enumerate(Ls):
            s = bounce(t, 0.02 + i * 0.07, 0.3)
            jx, jy, jr = jitter(50 + i, f, 2.2)
            draw(c, L, x + widths[i] / 2 + jx, 830 + jy, rot=(i - 1) * 3 + jr * 2, sc=s * z * pulse * fit)
            x += widths[i] + 14 * fit
        # Serientitel
        s2 = bounce(t, 0.25, 0.32)
        jx, jy, jr = jitter(60, f, 1.2)
        draw(c, RR(820, 190, 30, p["ink"], 12, seed=61), W / 2 + jx, 300 + jy, rot=-2 + jr, sc=s2)
        draw(c, TXT("IF THIS IS YOUR", 62, p["paper"], 3, seed=62), W / 2 + jx, 262 + jy, rot=-2 + jr, sc=s2)
        draw(c, TXT("FAVORITE COLOR...", 70, p["accent"], 3, seed=63), W / 2 + jx, 336 + jy, rot=-2 + jr, sc=s2)
        # Psychologie-Stempel
        s3 = bounce(t, self.t_psych - 0.05, 0.3)
        if s3 > 0:
            jx, jy, jr = jitter(64, f, 1.5)
            draw_group(c, IC.brain(p, t), 250 + jx, 1165 + jy, rot=-8 + jr, sc=0.36 * s3)
            draw(c, RR(560, 130, 18, p["paper"], 12, seed=65), 630 + jx, 1170 + jy, rot=6 + jr, sc=s3)
            draw(c, TXT("PSYCHOLOGY", 74, p["main"], 3, seed=66), 630 + jx, 1170 + jy, rot=6 + jr, sc=s3)

    # ------------------------------------------------------------ TRAITS
    def s_traits(self, c, t, f):
        p, ep = self.pal, self.ep
        self.warm_bg(c, t, rays=True, rspeed=3)
        dust(c, t, n=26, seed=2, color=p["accent"], op=0.5, size=(6, 12))
        self.brand(c, t, f)
        t0 = self.traits[0][2]
        cx, cy = W / 2, 760
        if t < t0 - 0.08:          # Farbkarte als Einstieg
            y = lin(t, self.b["traits"], self.b["traits"] + 0.45, 1500, cy, True)
            jx, jy, jr = jitter(70, f, 1.5)
            draw_group(c, IC.swatch(p, p["main"], ep["color_name"], 440, 620), cx + jx, y + jy, rot=-4 + jr, sc=1.0)
            return
        if t < self.t_people - 0.08:
            i = self.carousel(self.traits, t)
            # vorheriges Icon fliegt raus
            if i > 0:
                k = clamp((t - (self.traits[i][2] - 0.08)) / 0.3)
                if k < 1:
                    name = self.traits[i - 1][0]
                    draw_group(c, IC.icon(name, p, t), cx - 950 * ease(k), cy - 80 * k, rot=-28 * k, sc=1.0)
            name, word, ti = self.traits[i]
            lt = t - ti
            s = bounce(t, ti - 0.08, 0.36)
            jx, jy, jr = jitter(80 + i, f, 2.0)
            extra = {}
            rot = jr
            if name == "heart":
                extra["beat"] = 1.0 + 0.11 * max(0.0, math.sin(lt * 2 * math.pi * 1.5)) ** 4
                for k_ in range(5):   # kleine Herzen steigen auf
                    q = (lt * 0.7 + k_ * 0.2) % 1
                    draw_group(c, IC.heart(p, t), cx - 260 + k_ * 130, cy + 200 - q * 520, sc=0.16 * (1 - q * 0.5), op=1 - q)
            if name == "bolt":
                jx += 9 * math.sin(lt * 60) * clamp(1 - lt / 0.6); glow(c, cx, cy, 620, (255, 230, 150), 0.35 * clamp(1 - lt / 0.8) + 0.1)
            if name == "crown":
                for k_ in range(6):
                    a = lt * 1.2 + k_ * 1.05
                    draw_group(c, IC.star(p, t), cx + 300 * math.cos(a), cy - 40 + 200 * math.sin(a), rot=lt * 90, sc=0.09 + 0.03 * math.sin(lt * 5 + k_))
            if name == "drop":
                for r_ in range(3):
                    q = (lt * 0.9 + r_ / 3) % 1
                    draw(c, cached(("ripple", r_), lambda: make_layer(cv2.ellipse(np.zeros((260, 700), np.uint8), (350, 130), (330, 110), 0, 0, 360, 255, 10, cv2.LINE_AA), p["paper"], h=4, seed=170 + r_, rough=1.0)), cx, cy + 260, sc=0.5 + q * 0.7, op=(1 - q) * 0.8)
            if name == "shield":
                glow(c, cx - 200 + 400 * ((lt * 0.6) % 1), cy - 60, 260, (255, 255, 255), 0.22)
            if name == "anchor":
                rot += 7 * math.sin(lt * 2.6)
            if name == "wave":
                jy += 10 * math.sin(lt * 2.4)
            if name == "burst":
                for k_ in range(18):
                    a = k_ * 2 * math.pi / 18; q = clamp(lt / 0.9)
                    col = [p["paper"], p["accent"], p["bright"]][k_ % 3]
                    draw(c, RR(26, 16, 3, col, 3, seed=k_ % 4), cx + math.cos(a) * (120 + 520 * ease(q)), cy + math.sin(a) * (120 + 520 * ease(q)) + 200 * q * q, rot=k_ * 40 + lt * 300, op=1 - q * 0.6)
            draw_group(c, IC.icon(name, p, lt, **extra), cx + jx, cy + jy, rot=rot, sc=s * 1.05)
            self.label(c, f, word, ti - 0.05, t, y=1150)
            return
        # Menschen, die Rot lieben ... -> Figur mit umkreisenden Eigenschaften
        lt = t - self.t_people
        s = bounce(t, self.t_people - 0.08, 0.36)
        draw_group(c, IC.person(p, p["ink"]), cx, cy + 60, sc=0.9 * s)
        for k_, (name, word, ti) in enumerate(self.traits):
            a = -math.pi / 2 + k_ * math.pi / 2 + lt * 0.35
            r = lin(lt, 0, 3.5, 400, 330)
            ix, iy = cx + r * math.cos(a), cy + 20 + r * math.sin(a) * 0.95
            si = bounce(t, self.t_people + 0.1 + k_ * 0.12, 0.32)
            for d_ in range(1, 6):      # Punktlinie zur Figur
                q = d_ / 6
                draw(c, ELL(16, 16, p["paper"], 2, seed=d_), cx + (ix - cx) * q, cy + 20 + (iy - cy - 20) * q, op=si * 0.9)
            jx, jy, jr = jitter(90 + k_, f, 1.6)
            draw_group(c, IC.icon(name, p, lt), ix + jx, iy + jy, rot=jr, sc=0.36 * si)

    # ------------------------------------------------------------ SHADOW (dunkle Seite)
    def s_shadow(self, c, t, f):
        p, ep = self.pal, self.ep
        cx, cy = W / 2, 780
        if t >= self.t_same - 0.08:
            return self.s_duality(c, t, f)
        self.dark_bg(c, t)
        dust(c, t, n=24, seed=3, color=p["bright"], op=0.35, size=(4, 9), up=True)
        self.brand(c, t, f, dark=True)
        t0 = self.shadow[0][2]
        if t < t0 - 0.08:          # roter Kreis zerbricht in zwei Hälften
            s = bounce(t, self.b["shadow"] + 0.05, 0.4)
            k = ease(clamp((t - self.t_another + 0.05) / 0.45))
            def half(side):
                def fn(d, S):
                    d.pieslice([0, 0, 640 * S, 640 * S], 90 if side < 0 else -90, 270 if side < 0 else 90, fill=255)
                return fn
            jx, jy, jr = jitter(100, f, 1.5 + 4 * k * (1 - k))
            L = SHAPE("halfL", 640, 640, half(-1), p["main"], 16, seed=101, shade=1.0)
            R = SHAPE("halfR", 640, 640, half(1), p["main"], 16, seed=102, shade=1.0)
            R2 = SHAPE("halfR2", 640, 640, half(1), mix(p["deep"], p["ink"], 0.45), 16, seed=103, shade=1.0)
            draw(c, L, cx - 90 * k + jx, cy + jy, rot=-8 * k, sc=s)
            draw(c, R if k < 0.5 else R2, cx + 90 * k + jx, cy + 30 * k + jy, rot=10 * k, sc=s)
            if k > 0.3:
                for e_ in (-1, 1):
                    draw(c, ELL(50, 30, p["bright"], 2, seed=104, rim=0), cx + 150 + e_ * 60 + 90 * k, cy - 60, sc=k, op=k)
                glow(c, cx + 150 + 90 * k, cy - 60, 260, self.pal["bright"], 0.3 * k)
            return
        i = self.carousel(self.shadow, t)
        if i > 0:
            k = clamp((t - (self.shadow[i][2] - 0.08)) / 0.3)
            if k < 1:
                draw_group(c, IC.icon(self.shadow[i - 1][0], p, t), cx + 950 * ease(k), cy + 60 * k, rot=24 * k, sc=1.0)
        name, word, ti = self.shadow[i]
        lt = t - ti
        s = bounce(t, ti - 0.08, 0.36)
        jx, jy, jr = jitter(110 + i, f, 2.2)
        rot = jr; extra = {}
        if name == "warning":
            rot += 12 * math.sin(lt * 5.5) * math.exp(-lt * 0.4)
            flash = 1.0 if int(lt * 6) % 2 == 0 else 0.4
            glow(c, cx, cy, 700, self.pal["bright"], 0.35 * flash)
        if name == "clock":
            extra["speed"] = 3.0
            for r_ in range(3):
                q = (lt * 1.2 + r_ / 3) % 1
                draw(c, cached(("ring", r_), lambda: make_layer(cv2.circle(np.zeros((700, 700), np.uint8), (350, 350), 330, 255, 14, cv2.LINE_AA), p["bright"], h=6, seed=120 + r_, rough=1.2)), cx, cy, sc=0.7 + q * 0.6, op=1 - q)
        if name == "snow":
            rot += lt * 18
            for k_ in range(14):
                q = (lt * 0.35 + k_ * 0.071) % 1
                draw_group(c, IC.snow(p, t), 80 + (k_ * 157) % 920, 260 + q * 1000, rot=lt * 60 + k_ * 30, sc=0.07 + 0.03 * (k_ % 3), op=0.8)
        if name == "moon":
            jy += 12 * math.sin(lt * 1.5)
            for k_ in range(9):
                tw = 0.5 + 0.5 * math.sin(lt * 4 + k_ * 1.7)
                draw_group(c, IC.star(p, t), 120 + (k_ * 211) % 860, 300 + (k_ * 137) % 420, rot=k_ * 20, sc=0.05 + 0.03 * tw, op=0.5 + 0.5 * tw)
        if name == "slash":
            extra["reveal"] = clamp(lt / 0.45)
            for e_ in (-1, 1):
                draw(c, ELL(60, 34, p["bright"], 2, seed=105, rim=0), cx + e_ * 90, cy - 420, sc=1.0, op=0.9)
            glow(c, cx, cy - 420, 300, self.pal["bright"], 0.35)
        draw_group(c, IC.icon(name, p, lt, **extra), cx + jx, cy + jy, rot=rot, sc=s * 1.05)
        self.label(c, f, word, ti - 0.05, t, y=1160, color=p["bright"], back=p["ink"])

    def half_panel(self):
        def b():
            m = torn_band(H + 120, W // 2 + 70, 20, 33, top=False, bottom=True)
            m = np.ascontiguousarray(np.rot90(m, -1))      # gerissene Kante zeigt nach rechts
            return make_layer(m, self.pal["warm_bg"], h=22, seed=34, grad=(1.2, 0.8))
        return cached("halfpanel", b)

    def s_duality(self, c, t, f):
        p = self.pal
        self.dark_bg(c, t, pulse=False)
        k = ease(clamp((t - self.t_same + 0.08) / 0.4))
        P = self.half_panel()
        draw(c, P, (W // 2 + 70) / 2 - 40 - (1 - k) * 700, H / 2)
        self.brand(c, t, f, dark=False)
        du = self.ep["duality"]
        # beide Seiten erscheinen sofort mit der Teilung; das jeweils gesprochene Wort lässt sein Icon pulsieren
        pulse = lambda tw: 1.0 + 0.16 * max(0.0, 1 - abs(t - tw - 0.08) / 0.22)
        sL = bounce(t, self.t_same + 0.05, 0.36) * pulse(self.t_left); sR = bounce(t, self.t_same + 0.22, 0.36) * pulse(self.t_right)
        lt = t - self.t_left
        beat = 1.0 + 0.11 * max(0.0, math.sin(lt * 2 * math.pi * 1.6)) ** 4
        jx, jy, jr = jitter(130, f, 1.8)
        draw_group(c, IC.icon(du["left"]["icon"], p, lt, **({"beat": beat} if du["left"]["icon"] == "heart" else {})), 280 + jx, 760 + jy, rot=jr, sc=0.62 * sL)
        lt2 = t - self.t_right
        pupil = 0.55 + 0.6 * ease(clamp(lt2 / 0.5)) if lt2 > 0 else 0.55
        jx, jy, jr = jitter(131, f, 1.8)
        extra = {"pupil": pupil} if du["right"]["icon"] == "eye" else {}
        draw_group(c, IC.icon(du["right"]["icon"], p, lt2, **extra), 800 + jx, 760 + jy, rot=jr, sc=0.58 * sR)
        if sR > 0:
            glow(c, 800, 760, 300, self.pal["bright"], 0.18)
        self.label(c, f, du["left"]["word"], self.t_left - 0.05, t, y=1110, x=280, size=88, color=p["paper"], back=p["deep"])
        self.label(c, f, du["right"]["word"], self.t_right - 0.05, t, y=1110, x=800, size=88, color=p["bright"], back=p["ink"])

    # ------------------------------------------------------------ FACT
    def s_fact(self, c, t, f):
        p, ep = self.pal, self.ep
        self.paper_bg(c, t)
        dust(c, t, n=14, seed=4, color=p["main"], op=0.3, size=(5, 10))
        self.brand(c, t, f)
        cx = W / 2
        if t < self.t_but - 0.08:
            s1 = bounce(t, self.t_studies - 0.1, 0.36)
            jx, jy, jr = jitter(140, f, 1.4)
            draw_group(c, IC.chart(p, t, grow=clamp((t - self.t_studies) / 1.0)), 270 + jx, 470 + jy, rot=-6 + jr, sc=0.62 * s1)
            stage = [b_ for b_ in self.fbeats if b_["kind"] != "ekg"]
            cur = None
            for i, b_ in enumerate(stage):
                if t >= b_["t"] - 0.12: cur = i
            if cur is not None:
                if cur > 0:   # vorheriges Motiv fliegt raus
                    k = clamp((t - (stage[cur]["t"] - 0.12)) / 0.3)
                    if k < 1: self.fact_visual(c, stage[cur - 1], t, f, x=620 - 900 * ease(k), rot=-25 * k, s=1.0)
                b_ = stage[cur]
                self.fact_visual(c, b_, t, f, x=620, rot=0, s=bounce(t, b_["t"] - 0.12, 0.36))
                if b_.get("label"):
                    self.label(c, f, b_["label"], b_["t"] - 0.05, t, y=560, x=730, size=72, color=p["paper"], back=p["main"])
            if self.t_emo is not None:
                s3 = bounce(t, self.t_emo - 0.1, 0.32)
                if s3 > 0:
                    rev = clamp((t - self.t_emo) / 1.1)
                    draw(c, RR(900, 150, 30, p["ink"], 12, seed=150), cx, 1140, sc=s3)
                    pts = [(0, 75), (180, 75), (220, 30), (260, 120), (300, 10), (345, 140), (390, 75), (560, 75), (600, 40), (640, 105), (680, 75), (860, 75)]
                    n = max(2, int(rev * len(pts)) + 1)
                    m = np.zeros((150, 860), np.uint8); cv2.polylines(m, [np.array(pts[:n], np.int32)], False, 255, 12, cv2.LINE_AA)
                    draw(c, make_layer(m, p["bright"], h=4, seed=151, rough=0.8), cx, 1140, sc=s3)
                    hx = 45 + pts[min(n, len(pts)) - 1][0]
                    draw_group(c, IC.heart(p, t, beat=1 + 0.12 * max(0.0, math.sin((t - self.t_emo) * 9)) ** 4), cx - 430 + hx, 1140, sc=0.12 * s3)
            return
        if self.fact_end == "stat":
            return self.fact_stat(c, t, f)
        return self.fact_caveat(c, t, f)

    def fact_visual(self, c, b_, t, f, x, rot, s):
        p = self.pal
        lt = t - b_["t"]
        jx, jy, jr = jitter(141, f, 1.4)
        glow(c, x, 800, 520, (255, 236, 200), 0.22 * s)
        if b_["kind"] == "eye":
            pupil = 0.7 + 0.35 * math.sin(lt * 4) ** 2 if b_.get("dilate", True) else 0.6
            draw_group(c, IC.eye(p, lt, pupil=pupil, look=(40 * math.sin(lt * 1.6), 10 * math.sin(lt * 2.3))), x + jx, 800 + jy, rot=rot + jr, sc=1.05 * s)
        else:
            draw_group(c, IC.icon(b_["icon"], p, lt), x + jx, 800 + jy, rot=rot + jr, sc=0.95 * s)

    def fact_stat(self, c, t, f):
        """Abschluss mit einer einprägsamen Zahl/Rangliste (z.B. 'beliebteste Farbe')."""
        p, ep = self.pal, self.ep
        st = ep["fact"]["stat"]
        lt = t - self.t_but
        s = bounce(t, self.t_but - 0.08, 0.36)
        others = [C(x) for x in ep.get("teaser_colors", [[200, 40, 40], [40, 150, 80]])][:2]
        jx, jy, jr = jitter(165, f, 1.4)
        glow(c, W / 2, 820, 620, (255, 236, 200), 0.25 * s)
        draw_group(c, IC.podium(p, others, t, grow=clamp(lt / 0.8)), W / 2 + jx, 760 + jy, rot=jr, sc=1.05 * s)
        if lt > 0.6:
            for k_ in range(16):
                a = k_ * 2 * math.pi / 16; q = clamp((lt - 0.6) / 1.0)
                col = [p["main"], p["accent"], p["bright"], p["paper"]][k_ % 4]
                draw(c, RR(24, 14, 3, col, 3, seed=k_ % 4), W / 2 + math.cos(a) * (60 + 480 * ease(q)), 480 + math.sin(a) * (60 + 380 * ease(q)) + 260 * q * q, rot=k_ * 37 + lt * 280, op=1 - 0.6 * q)
        t_lab = self.T.wt(st["label_word"], "fact") if st.get("label_word") else self.t_but + 0.5
        self.label(c, f, st["label"], t_lab - 0.05, t, y=1150, size=86, color=p["paper"], back=p["main"])

    def fact_caveat(self, c, t, f):
        """Nur Episode 1: Lieblingsfarbe != Persönlichkeit (ab Episode 2 nicht mehr verwendet)."""
        p, ep = self.pal, self.ep
        cx = W / 2
        sA = bounce(t, self.t_but - 0.08, 0.34); sB = bounce(t, self.t_but + 0.2, 0.34); sC = bounce(t, self.t_but + 0.4, 0.34)
        jx, jy, jr = jitter(160, f, 1.5)
        draw_group(c, IC.swatch(p, p["main"], ep["color_name"], 300, 420), 230 + jx, 760 + jy, rot=-6 + jr, sc=0.95 * sA)
        draw(c, TXT("≠", 260, p["ink"], 10, seed=161), cx + jx * 0.5, 760, sc=sB, rot=jr)
        draw_group(c, IC.person(p, p["ink"]), 830 + jx, 800 + jy, rot=jr, sc=0.62 * sC)
        draw_group(c, IC.question(p, p["paper"]), 830 + jx, 690 + jy, rot=8 + jr, sc=0.7 * sC)
        st = clamp((t - self.t_cant + 0.05) / 0.22)
        if st > 0:
            sc = 1.7 - 0.7 * ease(st)
            jx2, jy2, _ = jitter(162, f, 3.0 * (1 - st))
            top, bot = ep["fact"].get("stamp_top", "NOT A"), ep["fact"].get("stamp_bottom", "PERSONALITY TEST")
            Lb_ = TXT(bot, 76, p["main"], 3, seed=165, rough=1.6); fw = Lb_.w - 2 * Lb_.pad + 90
            frame = cached(("stampframe", fw), lambda: make_layer(cv2.rectangle(np.zeros((250, fw), np.uint8), (12, 12), (fw - 12, 238), 255, 16, cv2.LINE_AA), p["main"], h=4, seed=163, rough=2.2))
            draw(c, frame, cx + jx2, 1085 + jy2, rot=-7, sc=sc, op=st)
            draw(c, TXT(top, 60, p["main"], 3, seed=164, rough=1.6), cx + jx2, 1040 + jy2, rot=-7, sc=sc, op=st)
            draw(c, Lb_, cx + jx2, 1118 + jy2, rot=-7, sc=sc, op=st)

    # ------------------------------------------------------------ OUTRO
    def s_outro(self, c, t, f):
        p, ep = self.pal, self.ep
        self.warm_bg(c, t, rays=True, rspeed=6)
        dust(c, t, n=20, seed=5, color=p["paper"], op=0.45)
        cx = W / 2
        if t >= self.t_end:
            return self.end_card(c, t, f)
        if t < self.t_comment - 0.08:
            s = bounce(t, self.b["outro"] + 0.05, 0.4)
            draw(c, ELL(700, 700, p["paper"], 18, seed=170, shade=0.8), cx, 800, sc=s)
            L = TXT(ep["color_name"] + "?", int(min(210, 900 / (len(ep["color_name"]) + 1))), p["main"], 16, seed=171)
            jx, jy, jr = jitter(172, f, 2.0)
            draw(c, L, cx + jx, 810 + jy, rot=-3 + jr, sc=s * (1 + 0.04 * math.sin(t * 6)))
            return
        lt = t - self.t_comment
        s = bounce(t, self.t_comment - 0.08, 0.38)
        jx, jy, jr = jitter(173, f, 1.6)
        draw_group(c, IC.bubble(p, ""), cx + jx, 700 + jy, rot=-3 + jr, sc=s)
        # CTA in zwei Zeilen
        words = ep["outro"]["cta"].split()
        l1 = " ".join(words[:len(words) // 2]); l2 = " ".join(words[len(words) // 2:])
        draw(c, TXT(l1, 62, p["ink"], 3, seed=174), cx + jx, 700 + jy - 10, rot=-3 + jr, sc=s)
        draw(c, TXT(l2, 62, p["main"], 3, seed=175), cx + jx, 700 + jy + 62, rot=-3 + jr, sc=s)
        # Pfeil zu den Kommentaren (rechte Seite der App-Leiste)
        sa = bounce(t, self.t_comment + 0.25, 0.3)
        if sa > 0:
            bob = 18 * abs(math.sin(lt * 5))
            def arrow(d, S):
                d.polygon([(x * S, y * S) for x, y in [(0, 60), (170, 60), (170, 0), (280, 100), (170, 200), (170, 140), (0, 140)]], fill=255)
            draw(c, SHAPE("arrow", 280, 200, arrow, p["accent"], 14, seed=176), 790 + bob * 0.6, 1060 + bob, rot=35, sc=0.9 * sa)

    def end_card(self, c, t, f):
        p, ep = self.pal, self.ep
        lt = t - self.t_end
        cx = W / 2
        s = bounce(t, self.t_end, 0.36)
        jx, jy, jr = jitter(180, f, 1.2)
        draw(c, RR(860, 300, 36, p["ink"], 14, seed=181), cx + jx, 520 + jy, rot=-2 + jr, sc=s)
        draw(c, TXT("IF THIS IS YOUR", 66, p["paper"], 3, seed=182), cx + jx, 455 + jy, rot=-2 + jr, sc=s)
        draw(c, TXT("FAVORITE COLOR...", 76, p["accent"], 3, seed=183), cx + jx, 535 + jy, rot=-2 + jr, sc=s)
        draw(c, TXT(f"EP. {ep['episode']}  ·  {ep['color_name']}", 54, p["bright"], 3, seed=184), cx + jx, 610 + jy, rot=-2 + jr, sc=s)
        cols = ep.get("teaser_colors", [])
        for i, col in enumerate(cols):
            si = bounce(t, self.t_end + 0.25 + i * 0.1, 0.32)
            a = (i - (len(cols) - 1) / 2) * 13
            draw_group(c, IC.swatch(p, C(col), "", 220, 310), cx + (i - (len(cols) - 1) / 2) * 150, 960 + abs(i - (len(cols) - 1) / 2) * 30, rot=a + jr, sc=si)
        self.label(c, f, ep["outro"]["teaser"], self.t_end + 0.7, t, y=1250, size=78, color=p["paper"], back=p["ink"])
