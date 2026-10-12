"""
Generate the atmospheric background art used by the Lizhi Building digital-twin UI.

Everything here is procedurally rendered (no third-party imagery), so the output is
original and safe to publish. The intent is a stylised blue-hour architectural
visualisation of a large teaching building on a campus plaza: a landmark block,
a secondary wing, a lit entrance canopy, wet-plaza reflections, fog layers and bloom.
"""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parents[1] / "public" / "art"
OUT.mkdir(parents=True, exist_ok=True)
random.seed(20240607)

W, H = 2560, 1440


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def clamp(v: float, lo: float = 0.0, hi: float = 255.0) -> float:
    return max(lo, min(hi, v))


# --------------------------------------------------------------------------------------
# sky
# --------------------------------------------------------------------------------------
def build_sky(width: int, height: int) -> Image.Image:
    """Vertical gradient sky with a warm horizon glow and cool zenith."""
    img = Image.new("RGB", (1, height))
    px = img.load()
    stops = [
        (0.00, (5, 8, 18)),
        (0.28, (10, 18, 38)),
        (0.52, (20, 40, 72)),
        (0.70, (46, 72, 104)),
        (0.82, (104, 104, 118)),
        (0.90, (168, 132, 118)),
        (0.95, (86, 74, 78)),
        (1.00, (22, 26, 38)),
    ]
    for y in range(height):
        t = y / (height - 1)
        for i in range(len(stops) - 1):
            t0, c0 = stops[i]
            t1, c1 = stops[i + 1]
            if t0 <= t <= t1:
                k = (t - t0) / (t1 - t0)
                px[0, y] = tuple(int(lerp(c0[j], c1[j], k)) for j in range(3))
                break
    return img.resize((width, height), Image.BILINEAR)


def add_clouds(img: Image.Image) -> None:
    """Soft horizontal cloud bands near the horizon."""
    w, h = img.size
    layer = Image.new("L", (w // 4, h // 4), 0)
    d = ImageDraw.Draw(layer)
    for _ in range(90):
        cy = int(random.gauss(h * 0.30, h * 0.075) / 4)
        cx = random.randint(-40, w // 4 + 40)
        rw = random.randint(60, 320)
        rh = random.randint(6, 26)
        bright = random.randint(40, 130)
        d.ellipse([cx, cy, cx + rw, cy + rh], fill=bright)
    layer = layer.resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(28))
    warm = Image.new("RGB", (w, h), (196, 164, 150))
    cool = Image.new("RGB", (w, h), (150, 176, 208))
    tinted = Image.composite(warm, cool, layer.point(lambda v: int(clamp((v - 40) * 2.4))))
    clouded = Image.blend(img.convert("RGB"), tinted, 0.42).convert("RGBA")
    clouded.putalpha(layer)
    img.alpha_composite(clouded)

    shade = Image.new("RGBA", (w, h), (4, 8, 16, 255))
    shade.putalpha(layer.point(lambda v: int(v * 0.35)))
    img.alpha_composite(shade)


def add_stars(img: Image.Image) -> None:
    w, h = img.size
    layer = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(layer)
    for _ in range(420):
        x = random.randint(0, w - 1)
        y = random.randint(0, int(h * 0.45))
        fade = 1.0 - (y / (h * 0.45))
        if random.random() > fade * 0.95:
            continue
        s = random.choice([1, 1, 1, 2])
        d.ellipse([x, y, x + s, y + s], fill=random.randint(60, 200))
    layer = layer.filter(ImageFilter.GaussianBlur(0.6))
    stars = Image.new("RGBA", (w, h), (206, 226, 255, 255))
    stars.putalpha(layer)
    img.alpha_composite(stars)


# --------------------------------------------------------------------------------------
# architecture
# --------------------------------------------------------------------------------------
def lit_window(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, warm: bool, strength: float) -> None:
    if warm:
        color = (255, int(lerp(196, 226, strength)), int(lerp(139, 176, strength)))
    else:
        color = (int(lerp(150, 214, strength)), int(lerp(206, 236, strength)), 255)
    d.rectangle([x, y, x + w, y + h], fill=color)


def facade(
    d: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    floors: int,
    cols: int,
    base: tuple[int, int, int],
    density: float,
    cool_bias: float = 0.35,
) -> None:
    """Draw one facade block: glass base, floor slabs, lit windows, vertical fins."""
    d.rectangle([x0, y0, x1, y1], fill=base)

    fh = (y1 - y0) / floors
    cw = (x1 - x0) / cols
    for f in range(floors):
        fy = y0 + f * fh
        # slab shadow line
        d.rectangle([x0, int(fy), x1, int(fy + max(1, fh * 0.09))], fill=(8, 12, 20))
        for c in range(cols):
            cx = x0 + c * cw
            wx = int(cx + cw * 0.18)
            wy = int(fy + fh * 0.26)
            ww = max(1, int(cw * 0.64))
            wh = max(1, int(fh * 0.50))
            if random.random() < density:
                warm = random.random() > cool_bias
                lit_window(d, wx, wy, ww, wh, warm, random.uniform(0.35, 1.0))
            else:
                d.rectangle([wx, wy, wx + ww, wy + wh], fill=(12, 18, 30))

    # vertical fins / mullions give the block its structural rhythm
    for c in range(cols + 1):
        cx = int(x0 + c * cw)
        d.rectangle([cx - 1, y0, cx + 1, y1], fill=(16, 22, 34))


def build_architecture(w: int, h: int, horizon: int) -> tuple[Image.Image, Image.Image]:
    """Return (buildings, window-lights) layers."""
    bld = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(bld)
    g = ImageDraw.Draw(glow)

    # distant skyline
    for _ in range(70):
        bx = random.randint(-60, w)
        bw = random.randint(60, 260)
        bh = random.randint(60, 260)
        top = horizon - bh
        d.rectangle([bx, top, bx + bw, horizon], fill=(11, 16, 27, 255))
        for _ in range(int(bw * bh / 2600)):
            wx = random.randint(bx + 4, bx + bw - 6)
            wy = random.randint(top + 6, horizon - 8)
            g.rectangle([wx, wy, wx + 2, wy + 3], fill=(120, 168, 232, random.randint(26, 90)))

    # --- landmark block (the teaching building) -------------------------------------
    ground = horizon + 60
    main_x0, main_x1 = int(w * 0.30), int(w * 0.70)
    main_top = int(horizon - (ground - horizon) * 3.35)
    facade(d, main_x0, main_top, main_x1, ground, floors=10, cols=17, base=(15, 21, 34, 255), density=0.54)

    # crown / machine room + parapet
    crown_x0, crown_x1 = int(w * 0.42), int(w * 0.58)
    crown_top = main_top - 46
    d.rectangle([crown_x0, crown_top, crown_x1, main_top], fill=(13, 18, 30, 255))
    d.rectangle([main_x0 - 10, main_top - 14, main_x1 + 10, main_top + 6], fill=(18, 24, 38, 255))
    # beacon
    bx = (crown_x0 + crown_x1) // 2
    g.ellipse([bx - 5, crown_top - 12, bx + 5, crown_top - 2], fill=(255, 92, 86, 190))
    g.ellipse([bx - 16, crown_top - 24, bx + 16, crown_top + 10], fill=(255, 70, 64, 46))

    # entrance canopy + glazed atrium
    at_x0, at_x1 = int(w * 0.40), int(w * 0.60)
    at_top = ground - 190
    d.rectangle([at_x0, at_top, at_x1, ground], fill=(24, 34, 52, 255))
    for i in range(6):
        cx = int(lerp(at_x0 + 14, at_x1 - 14, i / 5))
        d.rectangle([cx - 1, at_top, cx + 1, ground], fill=(14, 20, 32, 255))
    d.rectangle([at_x0 - 42, at_top - 16, at_x1 + 42, at_top - 2], fill=(20, 28, 44, 255))
    # bright entrance light spilling out -- the landmark's focal glow
    g.rectangle([at_x0 - 22, at_top + 14, at_x1 + 22, ground], fill=(255, 216, 166, 96))
    g.rectangle([at_x0 + 8, at_top + 26, at_x1 - 8, ground - 20], fill=(255, 232, 196, 92))
    g.ellipse([at_x0 - 52, ground - 110, at_x1 + 52, ground + 96], fill=(255, 198, 138, 40))
    g.ellipse([at_x0 - 14, ground - 60, at_x1 + 14, ground + 52], fill=(255, 224, 180, 46))

    # --- west wing ------------------------------------------------------------------
    ww_x0, ww_x1 = int(w * 0.06), int(w * 0.30)
    ww_top = int(ground - (ground - horizon) * 1.85)
    facade(d, ww_x0, ww_top, ww_x1, ground, floors=6, cols=11, base=(13, 19, 31, 255), density=0.38, cool_bias=0.5)

    # --- east wing (stepped, receding) ----------------------------------------------
    ew_x0, ew_x1 = int(w * 0.70), int(w * 0.96)
    ew_top = int(ground - (ground - horizon) * 2.35)
    facade(d, ew_x0, ew_top, ew_x1, ground, floors=8, cols=12, base=(12, 18, 30, 255), density=0.40, cool_bias=0.45)
    ew2_x0, ew2_x1 = int(w * 0.78), int(w * 0.90)
    ew2_top = ew_top - 70
    facade(d, ew2_x0, ew2_top, ew2_x1, ew_top + 6, floors=2, cols=6, base=(14, 20, 33, 255), density=0.5)

    # low podium connecting the wings
    d.rectangle([ww_x0 - 20, ground - 96, ew_x1 + 20, ground], fill=(11, 16, 26, 255))
    for px in range(ww_x0 - 20, ew_x1 + 20, 26):
        if random.random() < 0.55:
            g.rectangle([px + 6, ground - 66, px + 16, ground - 30], fill=(190, 214, 240, random.randint(24, 70)))

    bld = bld.filter(ImageFilter.GaussianBlur(0.4))
    return bld, glow


# --------------------------------------------------------------------------------------
# light, atmosphere, water
# --------------------------------------------------------------------------------------
def add_bloom(img: Image.Image, glow: Image.Image) -> None:
    big = glow.filter(ImageFilter.GaussianBlur(34))
    img.alpha_composite(big)
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(7)))
    img.alpha_composite(glow)


def add_fog(img: Image.Image, horizon: int) -> None:
    w, h = img.size
    fog = Image.new("L", (w // 4, h // 4), 0)
    d = ImageDraw.Draw(fog)
    for _ in range(56):
        cy = int(random.gauss(horizon / 4 + 14, 15))
        # bias the bank toward the wings so the centre stays legible
        side = random.random()
        if side < 0.42:
            cx = random.randint(-140, int(w / 4 * 0.34))
        elif side > 0.58:
            cx = random.randint(int(w / 4 * 0.66), w // 4 + 140)
        else:
            cx = random.randint(-120, w // 4 + 120)
        d.ellipse([cx, cy, cx + random.randint(110, 470), cy + random.randint(6, 26)], fill=random.randint(30, 104))
    fog = fog.resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(26))
    veil = Image.new("RGBA", (w, h), (168, 186, 206, 255))
    veil.putalpha(fog.point(lambda v: int(v * 0.5)))
    img.alpha_composite(veil)


def add_ground(img: Image.Image, horizon: int) -> Image.Image:
    """Wet plaza in front of the building: dark, smooth, with short reflections."""
    w, h = img.size
    ground_y = horizon + 60

    # Land the building base into a dark, soft ground -- no hard mirror seam.
    span = max(1, h - ground_y)
    ground = Image.new("RGB", (w, span))
    gp = ground.load()
    for y in range(span):
        t = y / span
        base = 16 * (1 - t) ** 2 + 5 * t
        gp_row = (int(base * 0.72), int(base * 0.86), int(base * 1.24))
        for x in range(w):
            gp[x, y] = gp_row
    ground = ground.filter(ImageFilter.GaussianBlur(18))
    img.paste(ground, (0, ground_y))

    # Short, feathered reflections of the lit facade, kept near the base.
    refl = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    rd = ImageDraw.Draw(refl)
    for _ in range(220):
        x = random.randint(int(w * 0.02), int(w * 0.98))
        length = random.randint(10, 74)
        y = ground_y + int(abs(random.gauss(0, span * 0.30)))
        y = min(y, h - length - 1)
        fade = 1 - (y - ground_y) / span
        alpha = int(52 * max(0.0, fade) ** 2)
        if alpha < 3:
            continue
        tone = random.choice([(255, 206, 150), (170, 210, 255), (140, 178, 226)])
        rd.line([x, y, x + random.randint(-2, 2), y + length], fill=tone + (alpha,), width=1)
    refl = refl.filter(ImageFilter.GaussianBlur(1.6))
    img.alpha_composite(refl.convert("RGBA"))

    d = ImageDraw.Draw(img, "RGBA")
    # plaza seams: evenly spaced, barely visible, denser toward the viewer
    for i in range(8):
        y = int(lerp(ground_y + 6, h, (i / 8) ** 1.7))
        d.line([0, y, w, y], fill=(120, 160, 200, 10), width=1)
    return img


def add_particles(img: Image.Image) -> None:
    w, h = img.size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(120):
        x = random.randint(0, w)
        y = random.randint(int(h * 0.35), h)
        r = random.randint(2, 14)
        a = random.randint(10, 54)
        tone = random.choice([(255, 222, 178), (176, 214, 255)])
        d.ellipse([x - r, y - r, x + r, y + r], fill=tone + (a,))
    layer = layer.filter(ImageFilter.GaussianBlur(6))
    img.alpha_composite(layer)


def add_grain_and_vignette(img: Image.Image) -> Image.Image:
    w, h = img.size
    noise = Image.effect_noise((w, h), 16).convert("L")
    noise = noise.filter(ImageFilter.GaussianBlur(0.4))
    img = ImageChops.overlay(img.convert("RGB"), Image.merge("RGB", (noise, noise, noise)))

    # Vignette, but with the lower-centre bowl lifted so the lit facade keeps
    # its punch -- this replaces the flat dark scrim the UI used to need.
    vign = Image.new("L", (w // 8, h // 8), 0)
    d = ImageDraw.Draw(vign)
    vw, vh = w // 8, h // 8
    d.ellipse([-vw // 6, -vh // 8, vw + vw // 6, vh + vh // 8], fill=255)
    vign = vign.resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(70))
    vign = vign.point(lambda v: 150 + int(v * 0.41))  # keep at least ~59% of the art everywhere
    dark = Image.new("RGB", (w, h), (2, 4, 9))
    out = Image.composite(img, dark, vign)

    # soften the deepest corners only
    corner = Image.new("L", (w // 8, h // 8), 255)
    cd = ImageDraw.Draw(corner)
    cd.rectangle([vw * 0.06, vh * 0.1, vw * 0.94, vh * 0.86], fill=0)
    corner = corner.resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(90))
    shade = Image.new("RGB", (w, h), (3, 5, 11))
    return Image.composite(shade, out, corner.point(lambda v: v))


def grade(img: Image.Image) -> Image.Image:
    """Cool the shadows, warm the highlights, lift the blacks slightly."""
    r, g, b = img.split()
    r = r.point(lambda v: clamp(v * 1.055 + 8))
    g = g.point(lambda v: clamp(v * 1.025 + 6))
    b = b.point(lambda v: clamp(v * 1.085 + 15))
    return Image.merge("RGB", (r, g, b))


def render_hero(w: int = W, h: int = H) -> Image.Image:
    horizon = int(h * 0.62)
    img = build_sky(w, h).convert("RGBA")
    add_stars(img)
    add_clouds(img)
    bld, glow = build_architecture(w, h, horizon)
    img.alpha_composite(bld)
    add_bloom(img, glow)
    add_fog(img, horizon)
    img = add_ground(img, horizon).convert("RGBA")
    add_particles(img)
    img = grade(img.convert("RGB"))
    return add_grain_and_vignette(img)


def render_workspace(w: int = 2560, h: int = 1440) -> Image.Image:
    """Quieter, darker variant used behind the engine-style workspace."""
    horizon = int(h * 0.68)
    img = build_sky(w, h).convert("RGBA")
    add_stars(img)
    add_fog(img, horizon)
    img = grade(img.convert("RGB"))
    # pull everything down so glass panels stay legible on top
    img = Image.blend(img, Image.new("RGB", (w, h), (6, 9, 16)), 0.52)
    img = img.filter(ImageFilter.GaussianBlur(2.2))
    return add_grain_and_vignette(img)


def save_variants(name: str, img: Image.Image, widths: list[int]) -> None:
    for wpx in widths:
        ratio = wpx / img.width
        resized = img.resize((wpx, int(img.height * ratio)), Image.LANCZOS)
        suffix = "" if wpx == max(widths) else f"@{wpx}"
        path = OUT / f"{name}{suffix}.jpg"
        resized.save(path, "JPEG", quality=88, optimize=True, progressive=True)
        print(f"  {path.name:34s} {resized.size[0]}x{resized.size[1]}  {path.stat().st_size/1024:.0f} KB")


if __name__ == "__main__":
    print("rendering hero ...")
    hero = render_hero()
    save_variants("lizhi-hero", hero, [2560])

    print("rendering workspace backdrop ...")
    ws = render_workspace()
    save_variants("lizhi-workspace", ws, [2560])

    print("done ->", OUT)
