#!/usr/bin/env python3
"""App Store uygulama önizlemesi (886x1920, 30 fps, ~24 sn).

Mağaza ekran görüntüleriyle aynı başlıklar ve aynı görseller kullanılır: store/app-store/*.png.
Akış: her ekran telefon çerçevesinde yukarıdan girer, başlığı yerine oturur, kısa bir süre durur
ve bir sonrakine geçer. Son sahnede uygulama simgesi ve kısa bir kapanış yazısı gelir.
Veriler uygulamanın demo verisidir; gerçek müşteri bilgisi içermez.

Kullanım: python3 scripts/render-app-preview.py
Çıktı: store/app-preview/hesabim-akis-886x1920.mp4
"""
import math
import os
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SHOTS = os.path.join(ROOT, "store", "app-preview", "raw")  # scripts/capture-app-screens.cjs ile alınan ham ekranlar
ICON = os.path.join(ROOT, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset", "AppIcon-512@2x.png")
OUT = os.path.join(ROOT, "store", "app-preview", "hesabim-akis-886x1920.mp4")
FONT_BOLD = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
FONT_REG = "/usr/share/fonts/opentype/inter/Inter-Medium.otf"

W, H = 886, 1920
FPS = 30
SCENE = 3 * FPS  # her ekran 3 sn
ACCENT = (61, 219, 176)
WHITE = (244, 248, 248)
MUTED = (201, 220, 220)

# (başlık: son kelime vurgulu, alt yazı, görsel)
SCREENS = [
    ("Veresiye defterin", "cebinde", "Her müşterinin hesabı ayrı", "1-veresiye.png"),
    ("Satış ve tahsilat", "tek dokunuşla", "Satış, alış, tahsilat, ödeme", "2-satis-tahsilat.png"),
    ("Hesap ekstresi", "PDF olarak hazır", "Ekstreyi tek dokunuşla paylaş", "3-ekstre.png"),
    ("En çok kimden", "alacağın var, gör", "Alacağını kaybetme", "4-alacak.png"),
    ("Nakit ve banka", "tek ekranda", "Kasan her zaman önünde", "5-kasa.png"),
    ("Gelir ve giderini", "ay ay izle", "Dönemleri karşılaştır", "6-gelir-gider.png"),
    ("Tedarikçine borcunu", "unutma", "Tedarikçi hesaplarını da takip et", "7-tedarikci.png"),
]

PHONE_W = 560
SCREEN_H = round(PHONE_W * 2532 / 1170)  # ham ekran görüntülerinin oranı (390x844 @3x)
BEZEL = 16
PHONE_TOP = 520


def ease_out(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def gradient_bg():
    bg = Image.new("RGB", (W, H), (13, 26, 31))
    px = bg.load()
    for y in range(H):
        for x in range(0, W, 1):
            d = math.hypot((x - W * 0.5) / (W * 0.9), (y - 0) / (H * 0.55))
            k = max(0.0, 1 - d)
            r = int(13 + (29 - 13) * k)
            g = int(26 + (90 - 26) * k)
            b = int(31 + (95 - 31) * k)
            px[x, y] = (r, g, b)
    return bg


def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return m


def load_screen(name):
    im = Image.open(os.path.join(SHOTS, name)).convert("RGB")
    return im.resize((PHONE_W, SCREEN_H), Image.LANCZOS)


def draw_phone(canvas, shot, x, y, alpha=1.0):
    """Telefon: koyu çerçeve + yuvarlatılmış ekran görüntüsü. alpha ile saydamlaştırılır."""
    outer = (PHONE_W + BEZEL * 2, SCREEN_H + BEZEL * 2)
    layer = Image.new("RGBA", outer, (0, 0, 0, 0))
    frame = Image.new("RGBA", outer, (0, 0, 0, 0))
    fd = ImageDraw.Draw(frame)
    fd.rounded_rectangle((0, 0, outer[0] - 1, outer[1] - 1), radius=72, fill=(5, 8, 10, 255))
    fd.rounded_rectangle((2, 2, outer[0] - 3, outer[1] - 3), radius=70, outline=(43, 58, 64, 255), width=3)
    layer.alpha_composite(frame)
    scr = shot.convert("RGBA")
    mask = rounded_mask((PHONE_W, SCREEN_H), 56)
    layer.paste(scr, (BEZEL, BEZEL), mask)
    if alpha < 1.0:
        a = layer.split()[3].point(lambda v: int(v * alpha))
        layer.putalpha(a)
    # gölge
    shadow = Image.new("RGBA", (outer[0] + 80, outer[1] + 80), (0, 0, 0, 0))
    sm = Image.new("L", outer, int(150 * alpha))
    shadow.paste((0, 0, 0, 255), (40, 52), sm)
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    canvas.alpha_composite(shadow, (x - 40, y - 40 + 22))
    canvas.alpha_composite(layer, (x, y))


def text_centered(draw, y, text, font, fill):
    w = draw.textlength(text, font=font)
    draw.text(((W - w) / 2, y), text, font=font, fill=fill)


def draw_title(canvas, first, second, alpha):
    if alpha <= 0:
        return
    layer = Image.new("RGBA", (W, 420), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    f_big = ImageFont.truetype(FONT_BOLD, 70)
    col1 = (*WHITE, int(255 * alpha))
    col2 = (*ACCENT, int(255 * alpha))
    # iki satır: ilki beyaz, ikincisi vurgulu; her satır ortalanır, taşma olmaz
    text_centered(d, 120, first, f_big, col1)
    text_centered(d, 205, second, f_big, col2)
    canvas.alpha_composite(layer, (0, 0))


def draw_caption(canvas, text, alpha):
    if alpha <= 0:
        return
    layer = Image.new("RGBA", (W, 200), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    f = ImageFont.truetype(FONT_REG, 40)
    w = d.textlength(text, font=f)
    d.text(((W - w) / 2, 40), text, font=f, fill=(*MUTED, int(255 * alpha)))
    canvas.alpha_composite(layer, (0, 1740))


def end_card(canvas, alpha):
    if alpha <= 0:
        return
    icon = Image.open(ICON).convert("RGBA").resize((260, 260), Image.LANCZOS)
    m = rounded_mask((260, 260), 58)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.paste(icon, ((W - 260) // 2, 470), m)
    d = ImageDraw.Draw(layer)
    f_big = ImageFont.truetype(FONT_BOLD, 60)
    f_mid = ImageFont.truetype(FONT_REG, 38)
    f_small = ImageFont.truetype(FONT_REG, 34)
    text_centered(d, 800, "Hesabım Muhasebe", f_big, (*WHITE, 255))
    text_centered(d, 890, "Veresiye, cari hesap ve kasa", f_mid, (*MUTED, 255))
    text_centered(d, 942, "takibi tek uygulamada", f_mid, (*MUTED, 255))
    text_centered(d, 1050, "Ücretsiz başla, istediğinde yükselt", f_small, (*ACCENT, 255))
    a = layer.split()[3].point(lambda v: int(v * alpha))
    layer.putalpha(a)
    canvas.alpha_composite(layer, (0, 0))


def frame_for(t, bg, screens):
    canvas = bg.copy().convert("RGBA")
    total_screens = len(SCREENS)
    end_start = total_screens * SCENE
    if t < end_start:
        i = t // SCENE
        f = t % SCENE
        first, second, caption, _ = SCREENS[i]
        enter = ease_out(f / 16)
        # çıkış: son 6 karede yukarı kayıp hafifçe solar
        leave = 0.0
        if f >= SCENE - 6:
            leave = (f - (SCENE - 6)) / 6
        y = PHONE_TOP + (1 - enter) * 280 - leave * 180
        alpha = enter * (1 - leave * 0.6)
        # hafif büyüme (ağır olmayan zoom)
        draw_title(canvas, first, second, min(1.0, enter * 1.2) * (1 - leave))
        draw_phone(canvas, screens[i], (W - (PHONE_W + BEZEL * 2)) // 2, int(y), alpha=max(0.0, alpha))
        draw_caption(canvas, caption, min(1.0, enter * 1.4) * (1 - leave))
    else:
        f = t - end_start
        end_alpha = ease_out(f / 14)
        end_card(canvas, end_alpha)
    return canvas.convert("RGB")


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    screens = [load_screen(s[3]) for s in SCREENS]
    bg = gradient_bg()
    total = len(SCREENS) * SCENE + 3 * FPS  # son kart 3 sn
    cmd = [
        "ffmpeg", "-v", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-profile:v", "high",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT,
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for t in range(total):
        frame = frame_for(t, bg, screens)
        proc.stdin.write(frame.tobytes())
    proc.stdin.close()
    proc.wait()
    print("yazıldı:", OUT, f"{total / FPS:.1f} sn")


if __name__ == "__main__":
    main()
