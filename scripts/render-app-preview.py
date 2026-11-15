#!/usr/bin/env python3
"""App Store uygulama önizlemesi: "rulo" akışı (886x1920, 30 fps, ~21 sn).

Bütün telefonlar yan yana bir şerit (rulo) üzerinde durur; bir kamera bu şeridin üstünde gezer:
  1. Açılış: kamera uzaktan bakar, şerit hızla kayar ve ilk telefonda yavaşlayarak durur.
  2. Kamera ilk telefona yakınlaşır; başlığı ve alt yazısı gelir.
  3. Her geçişte kamera hafifçe uzaklaşır, yandaki telefona kayar ve yeniden yakınlaşır.
  4. Son telefondan sonra kamera bütün şeridi gösterecek kadar uzaklaşır, kapanış kartı gelir.

Ekranlar uygulamanın ham ekran görüntüleridir (store/app-preview/raw, scripts/capture-app-screens.cjs ile alınır).
Başlıklar mağaza ekran görüntüleriyle aynıdır. Veriler demo verisidir; gerçek müşteri bilgisi içermez.

Kullanım: python3 scripts/render-app-preview.py
Çıktı: store/app-preview/hesabim-rulo-886x1920-apple.mp4
"""
import math
import os
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SHOTS = os.path.join(ROOT, "store", "app-preview", "raw")
ICON = os.path.join(ROOT, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset", "AppIcon-512@2x.png")
OUT = os.path.join(ROOT, "store", "app-preview", "hesabim-rulo-886x1920-apple.mp4")
FONT_BOLD = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
FONT_REG = "/usr/share/fonts/opentype/inter/Inter-Medium.otf"

W, H = 886, 1920
FPS = 30
ACCENT = (61, 219, 176)
WHITE = (244, 248, 248)
MUTED = (201, 220, 220)

SCREENS = [
    ("Veresiye defterin", "cebinde", "Her müşterinin hesabı ayrı", "1-veresiye.png"),
    ("Satış ve tahsilat", "tek dokunuşla", "Satış, alış, tahsilat, ödeme", "2-satis-tahsilat.png"),
    ("Hesap ekstresi", "PDF olarak hazır", "Ekstreyi tek dokunuşla paylaş", "3-ekstre.png"),
    ("En çok kimden", "alacağın var, gör", "Alacağını kaybetme", "4-alacak.png"),
    ("Nakit ve banka", "tek ekranda", "Kasan her zaman önünde", "5-kasa.png"),
    ("Gelir ve giderini", "ay ay izle", "Dönemleri karşılaştır", "6-gelir-gider.png"),
    ("Tedarikçine borcunu", "unutma", "Tedarikçi hesaplarını da takip et", "7-tedarikci.png"),
]

# Telefon ölçüleri (tam boy, kamera ölçeği 1 iken)
# iPhone 16 / 15 ölçüleri (nokta): ekran 393x852, köşe 55, Dinamik Ada 126x37 (tepeden 11), durum çubuğu 54
PT = 560 / 393  # 1 nokta = kaç piksel
SCR_W = 560
SCR_H = round(852 * PT)
BEZEL = round(5.5 * PT)  # ince siyah çerçeve
RIM = 4  # metalik dış kenar (piksel)
PH_W = SCR_W + (BEZEL + RIM) * 2
PH_H = SCR_H + (BEZEL + RIM) * 2
PAD = 60  # gölge payı
GAP = 90
PITCH = PH_W + GAP
CENTER_Y = 520 + PH_H // 2  # odaklanınca telefonun dikey merkezi

S_FAR = 0.54  # uzak görünüm (açılış ve kapanış)
S_MID = 0.64  # geçişlerde hafif uzaklaşma
S_NEAR = 1.0  # odak

# Zaman çizelgesi (kare)
INTRO = 102  # kapak (son kareyle aynı tasarım), geçiş, sonra şerit kayar ve ilk telefonda durur
COVER = 24  # kapak karesi bu kadar durur
FADE = 14  # kapaktan şeride geçiş
ZOOM_IN = 18
HOLD = 50  # her ekranda bekleme (5. saniye ilk ekranın başlığına denk gelir: App Store kapağı)
TRANS = 18  # telefondan telefona geçiş
ZOOM_OUT = 18
END = 60


def ease_in_out(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def ease_out(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 4


def lerp(a, b, t):
    return a + (b - a) * t


def cx(i):
    return i * PITCH


def gradient_bg():
    bg = Image.new("RGB", (W, H))
    px = bg.load()
    for y in range(H):
        for x in range(W):
            d = math.hypot((x - W * 0.5) / (W * 0.9), y / (H * 0.55))
            k = max(0.0, 1 - d)
            px[x, y] = (int(13 + 16 * k), int(26 + 64 * k), int(31 + 64 * k))
    return bg.convert("RGBA")


def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return m


def status_bar(width, height, bg, fg):
    """iOS durum çubuğu: 9:41, hücresel sinyal, Wi-Fi, pil. Dinamik Ada ayrıca çizilir."""
    bar = Image.new("RGBA", (width, height), bg)
    d = ImageDraw.Draw(bar)
    f = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-SemiBold.otf", round(17 * PT))
    cy = round(31 * PT)  # durum çubuğu yazılarının dikey merkezi
    tw = d.textlength("9:41", font=f)
    d.text((round(58 * PT) - tw / 2, cy), "9:41", font=f, fill=fg, anchor="lm")
    # sağ taraf: sinyal (4 çubuk), Wi-Fi, pil
    x = width - round(27 * PT)
    bw, bh = round(27 * PT), round(13 * PT)
    bx = x - bw
    d.rounded_rectangle((bx, cy - bh / 2, bx + bw, cy + bh / 2), radius=round(4 * PT), outline=fg, width=max(1, round(1.1 * PT)))
    d.rounded_rectangle((bx + 2.4 * PT, cy - bh / 2 + 2.4 * PT, bx + bw - 2.4 * PT, cy + bh / 2 - 2.4 * PT), radius=round(2 * PT), fill=fg)
    d.rounded_rectangle((bx + bw + 1.2 * PT, cy - 2.2 * PT, bx + bw + 2.6 * PT, cy + 2.2 * PT), radius=1, fill=fg)
    # Wi-Fi: üç yay + nokta
    wx = bx - round(13 * PT)
    for i, r in enumerate((round(9 * PT), round(6 * PT), round(3 * PT))):
        d.arc((wx - r, cy + 3 * PT - r, wx + r, cy + 3 * PT + r), 225, 315, fill=fg, width=max(2, round(1.8 * PT)))
    d.ellipse((wx - 1.4 * PT, cy + 3 * PT - 1.4 * PT, wx + 1.4 * PT, cy + 3 * PT + 1.4 * PT), fill=fg)
    # hücresel sinyal
    sx = wx - round(30 * PT)
    for i in range(4):
        h = (4 + i * 2.6) * PT
        x0 = sx + i * 4.6 * PT
        d.rounded_rectangle((x0, cy + 5 * PT - h, x0 + 3.2 * PT, cy + 5 * PT), radius=1, fill=fg)
    return bar


def make_sprite(name):
    """Gerçek iPhone görünümü: metalik kenar, ince siyah çerçeve, yan tuşlar, Dinamik Ada, durum çubuğu,
    uygulama ekranı ve alt ana ekran çubuğu; altında yumuşak gölge. Bir kez hazırlanır."""
    sprite = Image.new("RGBA", (PH_W + PAD * 2, PH_H + PAD * 2), (0, 0, 0, 0))
    radius_outer = round(55 * PT) + BEZEL + RIM
    shadow = Image.new("L", sprite.size, 0)
    ImageDraw.Draw(shadow).rounded_rectangle((PAD, PAD + 24, PAD + PH_W, PAD + PH_H + 24), radius=radius_outer, fill=150)
    shadow = shadow.filter(ImageFilter.GaussianBlur(26))
    sprite.paste((0, 0, 0, 255), (0, 0), shadow)
    sd = ImageDraw.Draw(sprite)
    # yan tuşlar (gövdenin biraz dışına taşar): solda Eylem + ses aç/kıs, sağda yan tuş
    btn = (110, 116, 122, 255)
    for top, h in ((122, 34), (178, 64), (256, 64)):
        y = PAD + round(top * PT)
        sd.rounded_rectangle((PAD - 3, y, PAD + 4, y + round(h * PT)), radius=2, fill=btn)
    y = PAD + round(200 * PT)
    sd.rounded_rectangle((PAD + PH_W - 4, y, PAD + PH_W + 3, y + round(100 * PT)), radius=2, fill=btn)
    # gövde: metalik kenar (dikey ışık geçişli) + siyah çerçeve
    body = Image.new("RGBA", (PH_W, PH_H), (0, 0, 0, 0))
    rim = Image.new("RGBA", (PH_W, PH_H))
    rd = ImageDraw.Draw(rim)
    for yy in range(PH_H):
        k = 0.5 + 0.5 * math.cos(yy / PH_H * math.pi * 2)
        c = int(78 + 50 * k)
        rd.line((0, yy, PH_W, yy), fill=(c, c + 3, c + 6, 255))
    body.paste(rim, (0, 0), rounded_mask((PH_W, PH_H), radius_outer))
    ImageDraw.Draw(body).rounded_rectangle(
        (RIM, RIM, PH_W - 1 - RIM, PH_H - 1 - RIM), radius=radius_outer - RIM, fill=(3, 4, 5, 255)
    )
    # ekran: durum çubuğu + uygulama (üst kısmı durum çubuğunun altından başlar)
    app = Image.open(os.path.join(SHOTS, name)).convert("RGBA")
    app = app.resize((SCR_W, round(app.height * SCR_W / app.width)), Image.LANCZOS)
    top_rgb = app.getpixel((8, 8))[:3]
    lum = 0.299 * top_rgb[0] + 0.587 * top_rgb[1] + 0.114 * top_rgb[2]
    fg = (255, 255, 255, 255) if lum < 150 else (0, 0, 0, 255)
    bar_h = round(54 * PT)
    screen = Image.new("RGBA", (SCR_W, SCR_H), (*top_rgb, 255))
    screen.alpha_composite(status_bar(SCR_W, bar_h, (*top_rgb, 255), fg), (0, 0))
    screen.alpha_composite(app.crop((0, 0, SCR_W, SCR_H - bar_h)), (0, bar_h))
    sdraw = ImageDraw.Draw(screen)
    # Dinamik Ada
    iw, ih = round(126 * PT), round(37 * PT)
    ix, iy = (SCR_W - iw) // 2, round(11 * PT)
    sdraw.rounded_rectangle((ix, iy, ix + iw, iy + ih), radius=ih // 2, fill=(0, 0, 0, 255))
    # alt ana ekran çubuğu
    hw, hh = round(139 * PT), round(5 * PT)
    hy = SCR_H - round(8 * PT) - hh
    sdraw.rounded_rectangle(((SCR_W - hw) // 2, hy, (SCR_W + hw) // 2, hy + hh), radius=hh // 2, fill=(*fg[:3], 230))
    body.paste(screen, (RIM + BEZEL, RIM + BEZEL), rounded_mask((SCR_W, SCR_H), round(55 * PT)))
    sprite.alpha_composite(body, (PAD, PAD))
    return sprite


class Sprites:
    def __init__(self):
        self.full = [make_sprite(s[3]) for s in SCREENS]
        self.cache = {}

    def get(self, i, scale):
        w = max(1, round(self.full[i].width * scale))
        key = (i, w)
        if key not in self.cache:
            h = max(1, round(self.full[i].height * scale))
            self.cache[key] = self.full[i].resize((w, h), Image.BILINEAR)
            if len(self.cache) > 400:
                self.cache.clear()
        return self.cache[key]


def text_centered(draw, y, text, font, fill):
    w = draw.textlength(text, font=font)
    draw.text(((W - w) / 2, y), text, font=font, fill=fill)


F_TITLE = None
F_CAP = None
F_INTRO_BIG = None
F_INTRO_SMALL = None


def fonts():
    global F_TITLE, F_CAP, F_INTRO_BIG, F_INTRO_SMALL
    F_TITLE = ImageFont.truetype(FONT_BOLD, 70)
    F_CAP = ImageFont.truetype(FONT_REG, 40)
    F_INTRO_BIG = ImageFont.truetype(FONT_BOLD, 64)
    F_INTRO_SMALL = ImageFont.truetype(FONT_REG, 38)


def overlay_text(canvas, draw_fn, alpha):
    if alpha <= 0.01:
        return
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(layer), int(255 * min(1.0, alpha)))
    canvas.alpha_composite(layer)


def camera(t):
    """Kare t için (kamera_x, ölçek, odaktaki ekran ya da None, odak içindeki kare, sahne)."""
    if t < INTRO:
        # kapak: ortadaki telefonlar ve başlık; sonra şerit kayarak ilk telefona gelir
        u = ease_in_out(max(0, t - COVER - FADE // 2) / (INTRO - COVER - FADE // 2))
        return lerp(cx(3), cx(0), u), S_FAR, None, 0, "intro"
    t -= INTRO
    if t < ZOOM_IN:
        return cx(0), lerp(S_FAR, S_NEAR, ease_in_out(t / ZOOM_IN)), None, 0, "zoomin"
    t -= ZOOM_IN
    n = len(SCREENS)
    for i in range(n):
        if t < HOLD:
            return cx(i), S_NEAR, i, t, "hold"
        t -= HOLD
        if i < n - 1:
            if t < TRANS:
                u = t / TRANS
                x = lerp(cx(i), cx(i + 1), ease_in_out(u))
                s = S_NEAR - (S_NEAR - S_MID) * math.sin(math.pi * u)
                return x, s, None, 0, "trans"
            t -= TRANS
    if t < ZOOM_OUT:
        u = ease_in_out(t / ZOOM_OUT)
        return lerp(cx(n - 1), cx((n - 1) / 2), u), lerp(S_NEAR, S_FAR * 0.82, u), None, 0, "zoomout"
    t -= ZOOM_OUT
    return cx((n - 1) / 2), S_FAR * 0.82, None, t, "end"


def total_frames():
    n = len(SCREENS)
    return INTRO + ZOOM_IN + n * HOLD + (n - 1) * TRANS + ZOOM_OUT + END


def render_frame(t, bg, sprites, icon):
    canvas = bg.copy()
    cam_x, s, focus, ft, stage = camera(t)
    dim = 1.0
    if stage == "end":
        dim = 1.0 - ease_in_out(ft / 20)  # son kare kapakla birebir aynı olsun
    elif stage == "intro":
        # kapakta şerit görünmez, kapak kaybolurken belirir
        dim = ease_in_out((t - COVER) / FADE)
    # şerit
    for i in range(len(SCREENS)):
        sx = W / 2 + (cx(i) - cam_x) * s
        half = (PH_W / 2 + PAD) * s
        if sx + half < 0 or sx - half > W:
            continue
        sp = sprites.get(i, s)
        y_center = lerp(CENTER_Y - 40, CENTER_Y, (s - S_FAR) / (S_NEAR - S_FAR)) if s < S_NEAR else CENTER_Y
        x0 = round(sx - sp.width / 2)
        y0 = round(y_center - sp.height / 2)
        if dim <= 0.01:
            continue
        if dim < 1.0:
            sp = sp.copy()
            sp.putalpha(sp.split()[3].point(lambda v: int(v * dim)))
        canvas.alpha_composite(sp, (x0, y0)) if x0 >= 0 and y0 >= 0 and x0 + sp.width <= W and y0 + sp.height <= H else paste_clipped(canvas, sp, x0, y0)

    # yazılar
    if stage == "intro":
        # ilk kare = kapak (App Store'da önizleme kapağı); son kareyle aynı tasarım
        overlay_text(canvas, card(icon), 1 - ease_in_out((t - COVER) / FADE))
    elif stage == "hold":
        first, second, cap, _ = SCREENS[focus]
        a = ease_out(ft / 8) * (1 - ease_in_out((ft - (HOLD - 6)) / 6))

        def d(dr, al):
            text_centered(dr, 120, first, F_TITLE, (*WHITE, al))
            text_centered(dr, 205, second, F_TITLE, (*ACCENT, al))
            text_centered(dr, 1780, cap, F_CAP, (*MUTED, al))

        overlay_text(canvas, d, a)
    elif stage == "end":
        overlay_text(canvas, card(icon), ease_out((ft - 8) / 16))
    return canvas.convert("RGB")


def card(icon):
    """Kapak ve kapanış kartı: simge, ad, açıklama, slogan."""

    def d(dr, al):
        ic = icon.copy()
        ic.putalpha(ic.split()[3].point(lambda v: int(v * al / 255)))
        dr._image.alpha_composite(ic, ((W - ic.width) // 2, 660))
        text_centered(dr, 970, "Hesabım Muhasebe", ImageFont.truetype(FONT_BOLD, 62), (*WHITE, al))
        text_centered(dr, 1062, "Veresiye, cari hesap ve kasa", F_INTRO_SMALL, (*MUTED, al))
        text_centered(dr, 1114, "takibi tek uygulamada", F_INTRO_SMALL, (*MUTED, al))
        text_centered(dr, 1220, "Ücretsiz başla, istediğinde yükselt", ImageFont.truetype(FONT_REG, 34), (*ACCENT, al))

    return d


def paste_clipped(canvas, sp, x0, y0):
    """Ekran dışına taşan telefonu kırparak yerleştirir (alpha_composite negatif konum kabul etmez)."""
    left = max(0, -x0)
    top = max(0, -y0)
    right = min(sp.width, W - x0)
    bottom = min(sp.height, H - y0)
    if right <= left or bottom <= top:
        return
    canvas.alpha_composite(sp.crop((left, top, right, bottom)), (x0 + left, y0 + top))


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    fonts()
    sprites = Sprites()
    bg = gradient_bg()
    icon = Image.open(ICON).convert("RGBA").resize((260, 260), Image.LANCZOS)
    icon.putalpha(Image.composite(icon.split()[3], Image.new("L", icon.size, 0), rounded_mask(icon.size, 58)))
    total = total_frames()
    # Apple önizleme şartları: H.264 High 4.0, 30 fps, ~10 Mbps, ses kanalı zorunlu (sessiz stereo AAC)
    cmd = [
        "ffmpeg", "-v", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-map", "0:v", "-map", "1:a", "-shortest",
        "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-level:v", "4.0",
        "-b:v", "10M", "-maxrate", "12M", "-bufsize", "24M", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart", OUT,
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for t in range(total):
        proc.stdin.write(render_frame(t, bg, sprites, icon).tobytes())
    proc.stdin.close()
    proc.wait()
    print("yazıldı:", OUT, f"{total / FPS:.1f} sn")


if __name__ == "__main__":
    main()
