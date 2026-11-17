"""Draw the History cards' pictures: one original SVG diagram per card (public/history/<card id>.svg).

Every picture is 400 x 240, uses the card's era colour, and labels only with mathematical symbols, so one file serves
both languages (the bilingual caption is the card's `image.alt` in src/history.ts). People are never drawn: a card
about a person shows that person's idea. Run: python3 scripts/history_svgs.py  (standard library only).
"""
from __future__ import annotations

import math
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "history"
W, H = 400, 240
INK = "#374151"
MUTED = "#9ca3af"
# Tailwind 600 (stroke), 400 (mid), 100 (tint), 50 (background) per era colour
PALETTE = {
    "amber": ("#d97706", "#fbbf24", "#fef3c7", "#fffbeb"),
    "sky": ("#0284c7", "#38bdf8", "#e0f2fe", "#f0f9ff"),
    "orange": ("#ea580c", "#fb923c", "#ffedd5", "#fff7ed"),
    "teal": ("#0d9488", "#2dd4bf", "#ccfbf1", "#f0fdfa"),
    "indigo": ("#4f46e5", "#818cf8", "#e0e7ff", "#eef2ff"),
    "rose": ("#e11d48", "#fb7185", "#ffe4e6", "#fff1f2"),
}
ERA_COLOUR = {"mind": "amber", "volume": "sky", "imagine": "orange", "scenes": "teal", "meaning": "indigo", "enter": "rose"}
# a second colour where a picture joins the two strands
SKY = PALETTE["sky"]
AMBER = PALETTE["amber"]


class Pic:
    def __init__(self, colour: str):
        self.c, self.mid, self.tint, self.bg = PALETTE[colour]
        self.parts: list[str] = []
        self.defs: list[str] = []

    def add(self, s: str) -> "Pic":
        self.parts.append(s)
        return self

    def rect(self, x, y, w, h, fill="none", stroke=None, sw=1.5, rx=6, extra=""):
        stroke = stroke or self.c
        return self.add(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>')

    def circle(self, x, y, r, fill="none", stroke=None, sw=1.5, extra=""):
        stroke = stroke or self.c
        return self.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>')

    def ellipse(self, x, y, rx, ry, angle=0.0, fill="none", stroke=None, sw=1.5, extra=""):
        stroke = stroke or self.c
        return self.add(
            f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" transform="rotate({angle:.1f} {x:.1f} {y:.1f})" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'
        )

    def line(self, x1, y1, x2, y2, stroke=None, sw=1.5, dash=None, arrow=False, extra=""):
        stroke = stroke or self.c
        d = f' stroke-dasharray="{dash}"' if dash else ""
        a = f' marker-end="url(#arrow-{self._marker(stroke)})"' if arrow else ""
        return self.add(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round"{d}{a} {extra}/>')

    def path(self, d, stroke=None, sw=1.5, fill="none", dash=None, arrow=False, extra=""):
        stroke = stroke or self.c
        da = f' stroke-dasharray="{dash}"' if dash else ""
        a = f' marker-end="url(#arrow-{self._marker(stroke)})"' if arrow else ""
        return self.add(f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"{da}{a} {extra}/>')

    def text(self, x, y, s, size=15, fill=INK, italic=True, anchor="middle", weight="normal"):
        style = "italic" if italic else "normal"
        return self.add(
            f'<text x="{x:.1f}" y="{y:.1f}" font-family="Georgia, \'Times New Roman\', serif" font-size="{size}" font-style="{style}" '
            f'font-weight="{weight}" fill="{fill}" text-anchor="{anchor}" dominant-baseline="middle">{s}</text>'
        )

    def box(self, x, y, w, h, label, fill=None, size=15):
        self.rect(x, y, w, h, fill=fill or self.tint)
        return self.text(x + w / 2, y + h / 2 + 1, label, size=size)

    def _marker(self, colour: str) -> str:
        key = colour.lstrip("#")
        if not any(f'id="arrow-{key}"' in d for d in self.defs):
            self.defs.append(
                f'<marker id="arrow-{key}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
                f'<path d="M0 0L10 5L0 10z" fill="{colour}"/></marker>'
            )
        return key

    def svg(self, title: str) -> str:
        defs = f"<defs>{''.join(self.defs)}</defs>" if self.defs else ""
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img">'
            f"<title>{title}</title>{defs}"
            f'<rect width="{W}" height="{H}" rx="10" fill="{self.bg}"/>'
            + "".join(self.parts)
            + "</svg>\n"
        )


def landscape(p: Pic, x, y, s, sw=1.5):
    """a sun, two hills and a tree in a box at (x, y), scale s (box 100 s x 70 s)"""
    p.rect(x, y, 100 * s, 70 * s, fill="#ffffff", sw=sw, rx=4 * s)
    p.circle(x + 78 * s, y + 18 * s, 8 * s, fill=p.mid, stroke=p.c, sw=sw)
    p.path(f"M{x} {y + 58 * s} Q{x + 30 * s} {y + 30 * s} {x + 60 * s} {y + 55 * s} T{x + 100 * s} {y + 50 * s}", sw=sw)
    p.line(x + 35 * s, y + 46 * s, x + 35 * s, y + 62 * s, sw=sw)
    p.circle(x + 35 * s, y + 40 * s, 7 * s, fill=p.tint, sw=sw)


def craik(p: Pic):
    landscape(p, 220, 50, 1.6)
    # a head in profile, with the same world small inside it
    p.path("M60 200 L60 165 Q30 150 34 110 Q38 50 100 46 Q160 46 168 105 L182 128 L168 132 L170 160 Q168 172 150 170 L140 170 L140 200", sw=2)
    landscape(p, 62, 82, 0.8, sw=1.2)
    p.path("M210 106 Q190 98 150 110", dash="4 4", arrow=True)


def kalman(p: Pic):
    xs = [50, 140, 230, 320]
    ys = [170, 130, 112, 70]
    p.path("M" + " L".join(f"{x} {y}" for x, y in zip(xs, ys)), stroke=MUTED, sw=1.2, dash="3 4")
    for i in range(1, 4):
        x, y = xs[i], ys[i]
        p.ellipse(x - 6, y + 10, 34, 20, -25, fill=p.tint, sw=1.2, extra='stroke-dasharray="4 3"')  # predicted
        p.circle(x + 14, y - 8, 4, fill=INK, stroke=INK)  # measurement
        p.ellipse(x + 4, y + 1, 15, 9, -25, fill=p.mid, extra='fill-opacity="0.6"')  # corrected
        p.line(xs[i - 1] + 8, ys[i - 1] - 4, x - 20, y + 14, arrow=True)
    p.ellipse(xs[0], ys[0], 15, 9, -25, fill=p.mid, extra='fill-opacity="0.6"')
    p.text(52, 205, "x̂<tspan font-size='10' dy='4'>t</tspan>", size=16)
    p.text(345, 45, "z<tspan font-size='10' dy='4'>t</tspan>", size=16)


def schmidhuber(p: Pic):
    p.box(40, 90, 80, 60, "C")
    p.box(220, 90, 80, 60, "M")
    p.line(120, 110, 216, 110, arrow=True)
    p.text(168, 98, "a", size=15)
    p.line(300, 120, 356, 120, arrow=True)
    p.text(372, 120, "ŝ′", size=16)
    p.path("M245 90 Q260 52 275 90", arrow=True)  # recurrence
    p.path("M220 140 Q170 190 122 140", dash="5 4", arrow=True, stroke=MUTED)  # gradient back to the controller
    p.text(170, 190, "∂/∂a", size=14, fill=MUTED)


def dyna(p: Pic):
    landscape(p, 30, 88, 0.9)  # the world
    p.box(160, 90, 80, 60, "π")
    p.box(290, 90, 80, 60, "M")
    p.path("M120 105 L156 105", arrow=True)
    p.path("M160 135 L124 135", arrow=True)
    p.path("M120 140 Q200 210 290 140", arrow=True, stroke=MUTED)  # experience to the model
    for k, r in enumerate((30, 42, 54)):
        p.path(f"M290 {105 - k * 4} Q265 {105 - r - 20} 240 {105 - k * 4}", dash="4 4", arrow=True, sw=1.2)
    p.text(265, 32, "×n", size=14)


def volume_rendering(p: Pic):
    rnd = random.Random(3)
    for _ in range(26):
        x, y = rnd.uniform(170, 300), rnd.gauss(120, 22)
        p.circle(x, y, rnd.uniform(10, 24), fill=p.mid, stroke="none", extra='fill-opacity="0.18"')
    p.path("M42 120 L20 108 L20 132 Z", fill=p.c)  # the camera, looking along the ray
    p.line(40, 120, 380, 120, stroke=INK, sw=1.2, arrow=True)
    ts = [70 + 24 * i for i in range(13)]
    trans = 1.0
    for t in ts:
        sigma = 0.06 * math.exp(-(((t - 235) / 55) ** 2)) * 24
        a = 1 - math.exp(-sigma * 0.05 * 24)
        wgt = trans * a
        trans *= 1 - a
        p.circle(t, 120, 3, fill=INK, stroke=INK)
        p.rect(t - 5, 200 - 140 * wgt, 10, 140 * wgt + 0.01, fill=p.c, stroke="none", rx=1)
    p.line(55, 200, 375, 200, stroke=MUTED, sw=1)
    p.text(30, 185, "w<tspan font-size='10' dy='4'>i</tspan>", size=15)


def splatting(p: Pic):
    for i in range(4):
        for j in range(4):
            p.rect(40 + 22 * i + 8 * j, 70 + 22 * j - 6 * i, 20, 20, fill=p.tint, sw=1, rx=2)
    p.path("M290 30 L340 50 L340 210 L290 190 Z", fill="#ffffff")
    rnd = random.Random(5)
    for k in range(9):
        y = 60 + k * 15
        x = 300 + rnd.uniform(0, 30)
        p.ellipse(x + 4, y, 9, 6, 0, fill=p.mid, stroke="none", extra='fill-opacity="0.45"')
    for y0, y1 in ((80, 75), (110, 112), (140, 150)):
        p.line(140, y0, 296, y1, dash="4 5", arrow=True, sw=1.2)


def ewa(p: Pic):
    # a 3D ellipsoid (shaded) projected through J to a 2D ellipse on the screen
    p.ellipse(100, 120, 60, 30, -30, fill=p.tint, sw=2)
    p.ellipse(100, 120, 60, 12, -30, sw=1, extra='stroke-dasharray="3 3"')
    p.ellipse(100, 120, 20, 30, -30, sw=1, extra='stroke-dasharray="3 3"')
    p.text(100, 192, "Σ", size=18)
    p.line(170, 120, 250, 120, arrow=True, sw=2)
    p.text(210, 104, "J", size=18)
    p.rect(262, 50, 110, 140, fill="#ffffff", rx=4)
    p.ellipse(317, 120, 40, 18, -40, fill=p.mid, stroke=p.c, extra='fill-opacity="0.55"')
    p.text(317, 210, "JWΣWᵀJᵀ", size=15)


def imagenet(p: Pic):
    shapes = ["circle", "tri", "square", "drop", "star", "diamond"]
    rnd = random.Random(9)
    cols, rows = 9, 5
    for i in range(cols):
        for j in range(rows):
            x, y = 22 + i * 41, 20 + j * 41
            p.rect(x, y, 36, 36, fill="#ffffff", sw=1, rx=4)
            s = shapes[(i * 7 + j * 3 + rnd.randint(0, 5)) % len(shapes)]
            cx, cy = x + 18, y + 18
            fill = rnd.choice([p.mid, p.tint, AMBER[1], SKY[1]])
            if s == "circle":
                p.circle(cx, cy, 10, fill=fill, sw=1)
            elif s == "tri":
                p.path(f"M{cx} {cy - 11} L{cx + 11} {cy + 9} L{cx - 11} {cy + 9} Z", fill=fill, sw=1)
            elif s == "square":
                p.rect(cx - 9, cy - 9, 18, 18, fill=fill, sw=1, rx=2)
            elif s == "drop":
                p.path(f"M{cx} {cy - 12} Q{cx + 12} {cy + 4} {cx} {cy + 10} Q{cx - 12} {cy + 4} {cx} {cy - 12} Z", fill=fill, sw=1)
            elif s == "star":
                pts = [(cx + (10 if k % 2 == 0 else 4.5) * math.sin(k * math.pi / 5), cy - (10 if k % 2 == 0 else 4.5) * math.cos(k * math.pi / 5)) for k in range(10)]
                p.path("M" + " L".join(f"{a:.1f} {b:.1f}" for a, b in pts) + " Z", fill=fill, sw=1)
            else:
                p.path(f"M{cx} {cy - 11} L{cx + 9} {cy} L{cx} {cy + 11} L{cx - 9} {cy} Z", fill=fill, sw=1)


def pilco(p: Pic):
    xs = [i * 4 for i in range(91)]
    data = [60, 80, 95, 200, 215, 300]
    f = lambda x: 120 - 45 * math.sin(x / 55)
    sd = lambda x: 6 + 40 * min(1, min(abs(x - d) for d in data) / 60)
    up = " L".join(f"{20 + x:.1f} {f(x) - sd(x):.1f}" for x in xs)
    dn = " L".join(f"{20 + x:.1f} {f(x) + sd(x):.1f}" for x in reversed(xs))
    p.path(f"M{up} L{dn} Z", fill=p.tint, stroke="none")
    p.path("M" + " L".join(f"{20 + x:.1f} {f(x):.1f}" for x in xs), sw=2)
    for d in data:
        p.circle(20 + d, f(d) + random.Random(d).uniform(-4, 4), 4, fill=INK, stroke=INK)
    p.text(370, 40, "±σ", size=16)


def world_models(p: Pic):
    p.rect(14, 95, 46, 50, fill="#ffffff", rx=3)
    landscape(p, 17, 105, 0.4, sw=1)
    p.line(60, 120, 82, 120, arrow=True)
    p.box(86, 95, 54, 50, "V")
    p.line(140, 120, 168, 120, arrow=True)
    p.text(154, 106, "z", size=15)
    # the dream: M inside a cloud
    p.path("M170 150 Q160 120 185 100 Q190 70 225 78 Q250 55 275 80 Q305 85 300 115 Q315 145 285 155 Q250 175 220 160 Q185 172 170 150 Z", fill=p.tint, sw=1.2, dash="5 4")
    p.box(206, 98, 60, 44, "M")
    p.path("M222 98 Q236 70 250 98", arrow=True, sw=1.2)
    p.line(300, 120, 326, 120, arrow=True)
    p.text(313, 106, "h", size=15)
    p.box(330, 95, 52, 50, "C")
    p.path("M356 145 Q356 205 236 205 Q186 205 186 162", arrow=True, sw=1.2)
    p.text(270, 218, "a", size=15)


def dreamer(p: Pic):
    for i in range(5):
        x = 40 + i * 78
        imag = i >= 3
        dash = 'stroke-dasharray="4 3"' if imag else ""
        p.rect(x - 22, 60, 44, 34, fill=p.tint if not imag else "#ffffff", extra=dash)
        p.text(x, 78, f"h<tspan font-size='10' dy='4'>{i}</tspan>", size=15)
        p.circle(x, 150, 18, fill=p.mid if not imag else "#ffffff", extra=dash + ' fill-opacity="0.6"')
        p.text(x, 151, f"z<tspan font-size='10' dy='4'>{i}</tspan>", size=15)
        p.line(x, 95, x, 130, arrow=True, sw=1.2)
        if i < 4:
            p.line(x + 22, 77, x + 54, 77, arrow=True, dash="4 3" if i >= 2 else None)
        if not imag:
            p.line(x, 205, x, 170, arrow=True, sw=1.2, stroke=MUTED)
            p.text(x, 215, f"o<tspan font-size='10' dy='4'>{i}</tspan>", size=13, fill=MUTED)
        else:
            p.text(x, 205, f"r̂<tspan font-size='10' dy='4'>{i}</tspan>", size=14)


def muzero(p: Pic):
    nodes = {0: (200, 40)}
    edges = []
    nid = 1
    level = [0]
    for depth, spread in ((1, 120), (2, 32)):
        nxt = []
        for parent in level:
            px, py = nodes[parent]
            for k in (-1, 0, 1):
                if depth == 2 and k == 0 and parent % 2:
                    continue
                nodes[nid] = (px + k * spread, py + 70)
                edges.append((parent, nid))
                nxt.append(nid)
                nid += 1
        level = nxt
    best = {0, 1, 4}
    for a, b in edges:
        (x1, y1), (x2, y2) = nodes[a], nodes[b]
        on = a in best and b in best
        p.line(x1, y1 + 14, x2, y2 - 14, stroke=p.c if on else MUTED, sw=2.5 if on else 1.2)
    for n, (x, y) in nodes.items():
        p.circle(x, y, 14, fill=p.mid if n in best else "#ffffff", stroke=p.c if n in best else MUTED, extra='fill-opacity="0.7"' if n in best else "")
    p.text(200, 41, "s⁰", size=14)
    p.text(352, 66, "r, v, π", size=14)


def dreamerv3(p: Pic):
    # a pixel-art diamond resting in a block of stone
    cell = 12
    stone = ["#d1d5db", "#9ca3af", "#e5e7eb"]
    rnd = random.Random(2)
    for i in range(12):
        for j in range(9):
            p.rect(56 + i * cell, 66 + j * cell, cell, cell, fill=rnd.choice(stone), stroke="none", rx=0)
    gem = ["..XXXX..", ".XccccX.", "XcwccccX", "XccccccX", ".XccccX.", "..XccX..", "...XX..."]
    for j, row in enumerate(gem):
        for i, ch in enumerate(row):
            if ch != ".":
                col = {"X": "#0e7490", "c": "#67e8f9", "w": "#ecfeff"}[ch]
                p.rect(80 + i * cell, 72 + j * cell, cell, cell, fill=col, stroke="none", rx=0)
    p.rect(56, 66, 144, 108, stroke=INK, sw=1.5, rx=2)
    # imagined latent rollout towards it
    for i in range(4):
        x = 240 + i * 36
        p.circle(x, 120, 11, fill=p.mid if i == 0 else "#ffffff", extra="" if i == 0 else 'stroke-dasharray="3 3"')
        if i < 3:
            p.line(x + 11, 120, x + 25, 120, arrow=True, sw=1.2)
    p.path("M240 140 Q300 200 196 160", dash="4 4", arrow=True, sw=1.2)


def nerf(p: Pic):
    # cameras around an object, rays into it, and the MLP
    p.circle(130, 120, 34, fill=p.tint, sw=2)
    p.circle(122, 112, 10, fill=p.mid, stroke="none", extra='fill-opacity="0.6"')
    for ang in (200, 250, 310, 140):
        r = math.radians(ang)
        cx, cy = 130 + 92 * math.cos(r), 120 + 92 * math.sin(r)
        d = math.atan2(120 - cy, 130 - cx)
        left = (cx + 14 * math.cos(d + 2.6), cy + 14 * math.sin(d + 2.6))
        right = (cx + 14 * math.cos(d - 2.6), cy + 14 * math.sin(d - 2.6))
        p.path(f"M{cx:.1f} {cy:.1f} L{left[0]:.1f} {left[1]:.1f} L{right[0]:.1f} {right[1]:.1f} Z", fill=p.c, stroke=p.c, sw=1)
        p.line(cx, cy, 130 + 30 * math.cos(r), 120 + 30 * math.sin(r), dash="3 4", sw=1.2)
    p.line(230, 120, 252, 120, arrow=True)
    p.text(244, 96, "(x, d)", size=13)
    for layer, n in enumerate((3, 5, 5, 2)):
        x = 270 + layer * 34
        for k in range(n):
            y = 120 + (k - (n - 1) / 2) * 20
            p.circle(x, y, 5, fill="#ffffff", sw=1.2)
            if layer < 3:
                m = (5, 5, 2)[layer]
                for q in range(m):
                    p.line(x + 5, y, x + 29, 120 + (q - (m - 1) / 2) * 20, stroke=MUTED, sw=0.5)
    p.text(372, 170, "(σ, c)", size=13)


def instant_ngp(p: Pic):
    x0, y0, s = 40, 40, 160
    for n, sw, col in ((2, 2, p.c), (4, 1.2, p.c), (8, 0.6, p.mid)):
        for k in range(n + 1):
            p.line(x0 + s * k / n, y0, x0 + s * k / n, y0 + s, stroke=col, sw=sw)
            p.line(x0, y0 + s * k / n, x0 + s, y0 + s * k / n, stroke=col, sw=sw)
    p.circle(x0 + 0.62 * s, y0 + 0.38 * s, 5, fill=INK, stroke=INK)
    p.text(x0 + 0.62 * s + 14, y0 + 0.38 * s - 12, "x", size=15)
    # hash table: rows of features
    rnd = random.Random(4)
    for j in range(10):
        p.rect(260, 32 + j * 18, 100, 14, fill="#ffffff", sw=1, rx=2)
        for i in range(4):
            p.rect(262 + i * 24, 34 + j * 18, 22 * rnd.uniform(0.2, 1), 10, fill=p.mid, stroke="none", rx=1, extra='fill-opacity="0.7"')
    for target in (2, 5, 8):
        p.path(f"M{x0 + 0.62 * s + 6} {y0 + 0.38 * s} Q230 {60 + target * 14} 256 {39 + target * 18}", dash="3 4", arrow=True, sw=1)
    p.text(310, 220, "h(x) mod T", size=13)


def gaussian_splatting(p: Pic):
    rnd = random.Random(11)
    cols = [p.c, p.mid, AMBER[1], SKY[1], "#a3e635", "#f472b6"]
    for _ in range(120):
        # blobs concentrated on a tree and a hill
        if rnd.random() < 0.5:
            x, y = rnd.gauss(200, 45), rnd.gauss(90, 30)
            col = rnd.choice([p.c, p.mid, "#a3e635", "#65a30d"])
        else:
            x = rnd.uniform(20, 380)
            y = 190 - 30 * math.sin(x / 70) + rnd.gauss(0, 12)
            col = rnd.choice(cols)
        p.ellipse(x, y, rnd.uniform(6, 26), rnd.uniform(2, 8), rnd.uniform(0, 180), fill=col, stroke="none", extra=f'fill-opacity="{rnd.uniform(0.25, 0.6):.2f}"')
    p.ellipse(300, 60, 40, 14, -20, sw=1.5, extra='stroke-dasharray="4 3"')
    p.text(300, 30, "μ, Σ, α, c", size=13)


def jepa_diagram(p: Pic, masked: bool):
    """x and y, two encoders, a predictor, compared in representation space"""
    # the image: context block visible, target blocks masked
    for i in range(4):
        for j in range(4):
            tgt = masked and (i, j) in {(2, 0), (3, 0), (2, 1), (3, 1), (0, 3), (1, 3)}
            ctx = (i <= 1 and j <= 2) or not masked
            fill = p.mid if ctx else ("#ffffff" if tgt else p.tint)
            p.rect(22 + i * 22, 64 + j * 22, 20, 20, fill=fill, sw=1, rx=2, extra='fill-opacity="0.7"' if ctx else "")
    p.line(114, 108, 136, 90, arrow=True, sw=1.2)
    p.line(114, 132, 136, 160, arrow=True, sw=1.2)
    p.add(f'<path d="M140 70 L180 80 L180 100 L140 110 Z" fill="{p.tint}" stroke="{p.c}" stroke-width="1.5"/>')
    p.add(f'<path d="M140 140 L180 150 L180 170 L140 180 Z" fill="{p.tint}" stroke="{p.c}" stroke-width="1.5"/>')
    p.text(160, 56, "x", size=15)
    p.text(160, 196, "y", size=15)
    p.line(180, 90, 210, 90, arrow=True)
    p.box(214, 70, 60, 40, "pred")
    p.parts[-1] = p.parts[-1].replace(">pred<", ">P<")
    p.line(274, 90, 306, 90, arrow=True)
    p.circle(320, 90, 12, fill=p.mid, extra='fill-opacity="0.6"')
    p.text(320, 66, "ŝ<tspan font-size='10' dy='4'>y</tspan>", size=15)
    p.line(180, 160, 306, 160, arrow=True)
    p.circle(320, 160, 12, fill=p.mid, extra='fill-opacity="0.6"')
    p.text(320, 186, "s<tspan font-size='10' dy='4'>y</tspan>", size=15)
    p.line(320, 104, 320, 146, stroke=INK, sw=1.2, dash="3 3")
    p.text(352, 125, "D", size=17)


def sora(p: Pic):
    # a video as a stack of frames cut into spacetime patches
    for f in range(5):
        x, y = 50 + f * 26, 170 - f * 20
        p.rect(x, y - 70, 110, 70, fill="#ffffff" if f < 4 else p.tint, sw=1.2, rx=2)
    for i in range(1, 4):
        p.line(154 + 27.5 * i, 30, 154 + 27.5 * i, 100, sw=0.8)
    for j in range(1, 3):
        p.line(154, 30 + 70 * j / 3, 264, 30 + 70 * j / 3, sw=0.8)
    p.line(270, 120, 300, 120, arrow=True)
    for k in range(6):
        p.rect(310 + (k % 3) * 24, 92 + (k // 3) * 32, 20, 26, fill=p.mid, sw=1, rx=2, extra='fill-opacity="0.6"')
    p.line(50, 215, 180, 215, stroke=INK, sw=1.2, arrow=True)
    p.text(196, 215, "t", size=15)


def platformer(p: Pic, x, y, s, hero_dx=0.0):
    p.rect(x, y, 100 * s, 70 * s, fill="#ffffff", sw=1.2, rx=3)
    p.rect(x + 8 * s, y + 52 * s, 40 * s, 6 * s, fill=p.tint, sw=1, rx=1)
    p.rect(x + 58 * s, y + 36 * s, 34 * s, 6 * s, fill=p.tint, sw=1, rx=1)
    p.rect(x + (20 + hero_dx) * s, y + 40 * s, 9 * s, 12 * s, fill=p.c, stroke=p.c, sw=1, rx=1)


def genie(p: Pic):
    platformer(p, 16, 30, 0.9)
    platformer(p, 16, 130, 0.9, hero_dx=22)
    p.text(118, 62, "x<tspan font-size='10' dy='4'>t</tspan>", size=14)
    p.text(122, 162, "x<tspan font-size='10' dy='4'>t+1</tspan>", size=14)
    p.line(140, 70, 170, 108, arrow=True, sw=1.2)
    p.line(140, 170, 170, 132, arrow=True, sw=1.2)
    p.box(174, 100, 50, 40, "LAM", size=12)
    p.parts[-1] = p.parts[-1].replace('font-style="italic"', 'font-style="normal"')
    p.line(224, 120, 244, 120, arrow=True)
    for k in range(8):
        on = k == 2
        p.rect(250 + (k % 4) * 18, 102 + (k // 4) * 20, 15, 15, fill=p.c if on else "#ffffff", sw=1, rx=2)
    p.text(285, 158, "ã ∈ {1…8}", size=13)
    p.line(326, 120, 350, 120, arrow=True)
    p.box(354, 100, 36, 40, "D", size=15)


def game_engines(p: Pic):
    for k in range(3):
        p.rect(18 + k * 12, 70 - k * 8, 70, 50, fill="#ffffff", sw=1.2, rx=3)
    p.text(70, 140, "x<tspan font-size='10' dy='4'>&lt;t</tspan>, a<tspan font-size='10' dy='4'>t</tspan>", size=14)
    p.line(110, 95, 134, 95, arrow=True)
    rnd = random.Random(8)
    for step, noise in enumerate((1.0, 0.6, 0.25, 0.0)):
        x = 140 + step * 62
        p.rect(x, 70, 54, 50, fill="#ffffff", sw=1.2, rx=3)
        for _ in range(int(60 * noise)):
            p.rect(x + rnd.uniform(2, 50), 72 + rnd.uniform(0, 44), 3, 3, fill=MUTED, stroke="none", rx=0)
        if noise < 0.7:
            op = 1 - noise
            p.rect(x + 6, 100, 42, 6, fill=p.mid, stroke="none", rx=1, extra=f'fill-opacity="{op:.2f}"')
            p.rect(x + 20, 84, 8, 14, fill=p.c, stroke="none", rx=1, extra=f'fill-opacity="{op:.2f}"')
        if step < 3:
            p.line(x + 54, 95, x + 62, 95, arrow=True, sw=1)
    p.text(326, 140, "x<tspan font-size='10' dy='4'>t</tspan>", size=14)
    p.text(230, 175, "≈ 20 fps", size=14, italic=False)


def world_labs(p: Pic):
    p.path("M10 70 C120 70 160 120 230 120", stroke=AMBER[0], sw=4)
    p.path("M10 170 C120 170 160 120 230 120", stroke=SKY[0], sw=4)
    p.path("M230 120 L390 120", stroke=p.c, sw=5)
    for x, y, col in ((40, 70, AMBER[0]), (110, 75, AMBER[0]), (40, 170, SKY[0]), (110, 165, SKY[0])):
        p.circle(x, y, 6, fill="#ffffff", stroke=col, sw=2)
    p.circle(230, 120, 12, fill=p.c, stroke=p.c)
    p.text(40, 48, "p(s′|s,a)", size=13)
    p.text(48, 196, "∑ T(1−e<tspan dy='-6' font-size='9'>−σδ</tspan><tspan dy='6'>)c</tspan>", size=13)


def genie_2(p: Pic):
    p.rect(14, 70, 90, 66, fill="#ffffff", rx=3)
    landscape(p, 19, 76, 0.8, sw=1)
    p.line(108, 103, 136, 103, arrow=True, sw=2)
    # a perspective world: floor grid, a few boxes, a walked path
    vx, vy = 270, 60
    for k in range(7):
        x = 150 + k * 40
        p.line(x, 220, vx + (x - vx) * 0.25, vy + (220 - vy) * 0.25, stroke=MUTED, sw=0.8)
    for k, t in enumerate((0.0, 0.3, 0.55, 0.75)):
        y = 220 - (220 - vy) * 0.75 * t
        half = 120 * (1 - 0.75 * t)
        p.line(vx - half, y, vx + half, y, stroke=MUTED, sw=0.8)
    p.rect(176, 150, 34, 34, fill=p.tint, rx=2)
    p.rect(320, 130, 28, 40, fill=p.tint, rx=2)
    p.path("M270 220 Q260 180 285 150 T270 100", sw=2.5, dash="6 4", arrow=True)
    for key, (dx, dy) in {"W": (0, -1), "A": (-1, 0), "S": (0, 0), "D": (1, 0)}.items():
        x, y = 345 + dx * 18, 30 + (dy + 1) * 18
        p.rect(x - 8, y - 8, 16, 16, fill="#ffffff", sw=1, rx=3)
        p.text(x, y + 1, key, size=10, italic=False)


def cosmos(p: Pic):
    p.line(20, 150, 170, 150, stroke=INK, sw=2)
    # a car
    p.path("M70 150 L74 134 L90 126 L118 126 L130 136 L144 138 L146 150 Z", fill=p.tint, sw=1.5)
    p.circle(88, 151, 6, fill="#ffffff", sw=1.5)
    p.circle(130, 151, 6, fill="#ffffff", sw=1.5)
    # futures fanning out
    rnd = random.Random(6)
    for k in range(7):
        end = 60 + k * 22
        p.path(f"M150 140 C220 140 260 {end + rnd.uniform(-10, 10):.0f} 380 {end}", dash="5 4" if k != 3 else None, sw=2.2 if k == 3 else 1.1, stroke=p.c if k == 3 else p.mid)
    # a robot arm
    p.path("M40 220 L40 200 L60 176 L92 186", sw=3, stroke=INK)
    p.circle(60, 176, 4, fill="#ffffff", stroke=INK)
    p.path("M92 186 L100 180 M92 186 L100 192", sw=2, stroke=INK)


def genie_3(p: Pic):
    p.line(20, 200, 380, 200, stroke=INK, sw=1.5, arrow=True)
    for k in range(0, 361, 6):
        p.line(20 + k, 196, 20 + k, 204 if k % 60 else 208, stroke=MUTED if k % 60 else INK, sw=0.8)
    for k, x in enumerate((30, 120, 210, 300)):
        p.rect(x, 50, 74, 100, fill="#ffffff", sw=1.2, rx=3)
        p.path(f"M{x} {130 - 6 * k % 10} Q{x + 37} 110 {x + 74} 128", sw=1.2)
        p.rect(x + 46, 88, 12, 30, fill=p.tint, sw=1, rx=1)  # the same tower, kept in place
        if k == 2:
            # a promptable event: a storm arriving
            p.path(f"M{x + 20} 60 L{x + 12} 80 L{x + 22} 80 L{x + 14} 100", stroke="#f59e0b", sw=2)
        if k == 3:
            p.path(f"M{x + 20} 60 L{x + 12} 80 L{x + 22} 80 L{x + 14} 100", stroke="#f59e0b", sw=2)
            p.circle(x + 20, 64, 10, fill="#e5e7eb", stroke=MUTED, sw=1)
    p.text(200, 225, "24 fps · 720p · min", size=12, italic=False)


def rtfm(p: Pic):
    # posed frames around a scene; the next frame drawn from the nearest ones in memory
    p.rect(160, 90, 80, 60, fill=p.tint, rx=4)
    p.circle(200, 120, 14, fill=p.mid, stroke="none", extra='fill-opacity="0.6"')
    poses = [(60, 60, 30), (60, 180, -30), (200, 30, 90), (340, 60, 150), (340, 180, 210), (200, 210, 270)]
    for k, (x, y, ang) in enumerate(poses):
        r = math.radians(ang)
        new = k == 4
        ex = 'stroke-dasharray="4 3"' if new else ""
        d = math.atan2(120 - y, 200 - x)
        a1 = (x + 26 * math.cos(d + 0.45), y + 26 * math.sin(d + 0.45))
        a2 = (x + 26 * math.cos(d - 0.45), y + 26 * math.sin(d - 0.45))
        p.path(f"M{x} {y} L{a1[0]:.1f} {a1[1]:.1f} L{a2[0]:.1f} {a2[1]:.1f} Z", fill="#ffffff" if new else p.tint, sw=1.5, extra=ex)
        _ = r
    p.path("M326 66 Q360 120 336 168", dash="3 4", arrow=True, sw=1.2)
    p.path("M228 214 Q300 214 326 192", dash="3 4", arrow=True, sw=1.2)


def marble(p: Pic):
    # one world: the left half as splats, the right half as its exported mesh
    rnd = random.Random(12)
    for _ in range(140):
        x = rnd.uniform(20, 200)
        top = 150 - 50 * math.exp(-(((x - 140) / 60) ** 2))
        y = rnd.uniform(top, 210)
        p.ellipse(x, y, rnd.uniform(5, 18), rnd.uniform(2, 6), rnd.uniform(0, 180), fill=rnd.choice([p.c, p.mid, AMBER[1], "#a3e635"]), stroke="none", extra=f'fill-opacity="{rnd.uniform(0.3, 0.6):.2f}"')
    xs = list(range(200, 381, 20))
    tops = [150 - 50 * math.exp(-(((x - 260) / 60) ** 2)) for x in xs]
    for x, t in zip(xs, tops):
        p.line(x, t, x, 210, stroke=p.c, sw=0.8)
    for row in range(4):
        pts = [(x, t + (210 - t) * row / 3) for x, t in zip(xs, tops)]
        p.path("M" + " L".join(f"{a:.1f} {b:.1f}" for a, b in pts), sw=0.8)
    for i in range(len(xs) - 1):
        for row in range(3):
            y1 = tops[i] + (210 - tops[i]) * row / 3
            y2 = tops[i + 1] + (210 - tops[i + 1]) * (row + 1) / 3
            p.line(xs[i], y1, xs[i + 1], y2, stroke=p.mid, sw=0.6)
    p.line(200, 30, 200, 220, stroke=INK, sw=1, dash="4 4")
    p.text(110, 40, ".ply / .spz", size=13, italic=False)
    p.text(300, 40, ".glb", size=13, italic=False)


def lecun(p: Pic):
    """an energy landscape E(x, y): compatible pairs sit in the low valley"""
    for k, (rx, ry) in enumerate(((150, 80), (118, 62), (88, 46), (60, 31), (34, 17))):
        p.ellipse(190, 120, rx, ry, -18, fill=p.tint if k == 0 else "none", sw=1.2, extra=f'stroke-opacity="{0.4 + 0.12 * k:.2f}"')
    p.ellipse(190, 120, 12, 6, -18, fill=p.c, stroke=p.c)
    for x, y in ((150, 132), (226, 108), (196, 118)):
        p.circle(x, y, 4, fill=INK, stroke=INK)
    for x, y in ((80, 60), (318, 180), (300, 52)):
        p.circle(x, y, 4, fill="#ffffff", stroke=INK)
    p.text(352, 120, "E(x, y)", size=15)
    p.text(40, 210, "x", size=15)
    p.text(16, 180, "y", size=15)
    p.line(30, 200, 90, 200, stroke=INK, sw=1.2, arrow=True)
    p.line(30, 200, 30, 150, stroke=INK, sw=1.2, arrow=True)


def jepa(p: Pic):
    jepa_diagram(p, masked=True)


DRAW = {
    "craik": craik,
    "kalman": kalman,
    "schmidhuber-1990": schmidhuber,
    "dyna": dyna,
    "volume-rendering": volume_rendering,
    "splatting": splatting,
    "ewa": ewa,
    "imagenet": imagenet,
    "pilco": pilco,
    "world-models": world_models,
    "dreamer": dreamer,
    "muzero": muzero,
    "dreamerv3": dreamerv3,
    "nerf": nerf,
    "instant-ngp": instant_ngp,
    "gaussian-splatting": gaussian_splatting,
    "lecun-path": lecun,
    "jepa": jepa,
    "sora": sora,
    "genie": genie,
    "game-engines": game_engines,
    "world-labs": world_labs,
    "genie-2": genie_2,
    "cosmos": cosmos,
    "genie-3": genie_3,
    "rtfm": rtfm,
    "marble": marble,
}

# card id → era (kept here so the script needs no TypeScript); tests/history.test.ts checks every card has its file
ERA = {
    **dict.fromkeys(["craik", "kalman", "schmidhuber-1990", "dyna"], "mind"),
    **dict.fromkeys(["volume-rendering", "splatting", "ewa"], "volume"),
    **dict.fromkeys(["imagenet", "pilco", "world-models", "dreamer", "muzero", "dreamerv3"], "imagine"),
    **dict.fromkeys(["nerf", "instant-ngp", "gaussian-splatting"], "scenes"),
    **dict.fromkeys(["lecun-path", "jepa"], "meaning"),
    **dict.fromkeys(["sora", "genie", "game-engines", "world-labs", "genie-2", "cosmos", "genie-3", "rtfm", "marble"], "enter"),
}

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for card, draw in DRAW.items():
        pic = Pic(ERA_COLOUR[ERA[card]])
        draw(pic)
        (OUT / f"{card}.svg").write_text(pic.svg(card), encoding="utf-8")
    print(f"wrote {len(DRAW)} pictures to {OUT}")
