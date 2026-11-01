# Hesabım tanıtım videosu: ekran görüntüleri + ses + efektler. Çalıştırma: python3 build.py
import subprocess, numpy as np, wave, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
VOICE_LEN = 18.05
# (görsel, başlangıç, bitiş, satır1, satır2)
SEGS = [
    ("assets/ekran-01.jpg", 0.0, 3.0, "Hala deftere mi", "yazıyorsunuz?"),
    ("assets/ekran-02.jpg", 3.0, 6.0, "Hesabım Muhasebe", "Cari hesap, kasa ve ekibiniz tek uygulamada"),
    ("assets/ekran-04.jpg", 6.0, 9.5, "Kasanızdaki para", "nakit ve banka, tek ekranda"),
    ("assets/ekran-03.jpg", 9.5, 13.0, "Her müşterinin cari hesabı", "ayrı, bakiye tek dokunuşla"),
    ("assets/ekran-06.jpg", 13.0, 16.0, "Gelir ve gider", "otomatik takip edilir"),
    ("assets/ekran-01.jpg", 16.0, VOICE_LEN, "Hemen deneyin", "Hesabım Muhasebe"),
]
FONT = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
FONT2 = "/usr/share/fonts/opentype/inter/Inter-Medium.otf"

# 1) Efekt sesleri: geçiş "whoosh" ve her sahne başında "ding"
t_total = VOICE_LEN
sfx = np.zeros(int(t_total * SR) + SR)
rng = np.random.default_rng(7)
def whoosh(at, dur=0.55, vol=0.22):
    n = int(dur * SR); t = np.linspace(0, dur, n)
    noise = rng.standard_normal(n)
    # basit alçak geçiren filtre, kesim frekansı zamanla düşer (ses yukarıdan aşağı süzülür)
    out = np.zeros(n); y = 0.0
    for i in range(n):
        a = 0.02 + 0.25 * (1 - i / n)
        y += a * (noise[i] - y); out[i] = y
    env = np.sin(np.pi * t / dur) ** 2
    seg = out * env * vol / (np.max(np.abs(out)) + 1e-9)
    i0 = int(at * SR); sfx[i0:i0 + n] += seg[: len(sfx) - i0]
def ding(at, dur=0.7, vol=0.18):
    n = int(dur * SR); t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 1318 * t) + 0.4 * np.sin(2 * np.pi * 1976 * t)
    seg = tone * np.exp(-t * 6) * vol
    i0 = int(at * SR); sfx[i0:i0 + n] += seg[: len(sfx) - i0]
for _, start, end, _, _ in SEGS[1:]:
    whoosh(start - 0.25)
for _, start, end, _, _ in SEGS:
    ding(start + 0.05)
sfx = np.clip(sfx, -1, 1)
with wave.open("assets/sfx.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((sfx * 32767).astype(np.int16).tobytes())

# 2) Görsel: her sahne için metin kutusu ve kısa geçiş (fade) ile birleştir
inputs = []
filters = []
labels = []
for idx, (img, start, end, l1, l2) in enumerate(SEGS):
    d = end - start
    inputs += ["-loop", "1", "-t", f"{d:.3f}", "-i", img]
    txt1 = l1.replace(":", r"\:").replace("'", r"\'")
    txt2 = l2.replace(":", r"\:").replace("'", r"\'")
    f = (
        f"[{idx}:v]scale=1080:1920,setsar=1,fps=30,format=yuv420p,"
        f"drawbox=x=0:y=1500:w=1080:h=420:color=black@0.55:t=fill,"
        f"drawtext=fontfile={FONT}:text='{txt1}':fontsize=76:fontcolor=white:x=(w-text_w)/2:y=1560,"
        f"drawtext=fontfile={FONT2}:text='{txt2}':fontsize=44:fontcolor=#7FE3EE:x=(w-text_w)/2:y=1680,"
        f"fade=t=in:st=0:d=0.3,fade=t=out:st={max(d-0.3,0):.3f}:d=0.3[v{idx}]"
    )
    filters.append(f)
    labels.append(f"[v{idx}]")
filters.append("".join(labels) + f"concat=n={len(SEGS)}:v=1:a=0[vout]")

os.makedirs("out", exist_ok=True)
cmd = ["ffmpeg", "-y", "-v", "error"] + inputs + [
    "-i", "assets/voice.mp3", "-i", "assets/sfx.wav",
    "-filter_complex", ";".join(filters)
    + f";[{len(SEGS)}:a]volume=1.0,apad[va];[{len(SEGS)+1}:a]volume=0.9[sa];"
      f"[va][sa]amix=inputs=2:duration=first:normalize=0[aout]",
    "-map", "[vout]", "-map", "[aout]",
    "-t", f"{VOICE_LEN}",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
    "out/hesabim-tanitim.mp4",
]
subprocess.run(cmd, check=True)
print("tamam: out/hesabim-tanitim.mp4")
