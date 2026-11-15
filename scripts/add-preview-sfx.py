#!/usr/bin/env python3
"""Rulo önizleme videosuna geçiş ses efektleri ekler (Mixkit ses kütüphanesi).

Sesler Mixkit'ten indirilir (Mixkit Sound Effects Free License: ücretsiz, ticari kullanıma açık, atıf gerekmez;
ses dosyaları tek başına yeniden dağıtılamaz, bu yüzden repoya konmaz, store/app-preview/sfx/ altına indirilir).
Her sesin en yüksek anı, ilgili hareketin ortasına hizalanır. Zamanlar scripts/render-app-preview.py'den okunur.

Kullanım: python3 scripts/add-preview-sfx.py
Girdi: store/app-preview/hesabim-rulo-886x1920-apple.mp4
Çıktı: store/app-preview/hesabim-rulo-886x1920-sesli.mp4
"""
import importlib.util
import os
import subprocess
import urllib.request
import wave

import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
spec = importlib.util.spec_from_file_location("rp", os.path.join(ROOT, "scripts", "render-app-preview.py"))
rp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rp)

VIDEO_IN = rp.OUT
VIDEO_OUT = os.path.join(ROOT, "store", "app-preview", "hesabim-rulo-886x1920-sesli.mp4")
SFX_DIR = os.path.join(ROOT, "store", "app-preview", "sfx")
WAV = VIDEO_OUT.replace(".mp4", ".wav")
SR = 48000

# Mixkit ses kimlikleri (mixkit.co/free-sound-effects)
SFX = {
    "intro": 1492,  # Cinematic whoosh fast transition
    "sweep": 166,  # Fast small sweep transition
    "pop": 3005,  # Explainer video pops whoosh light pop
    "click": 2568,  # Cool interface click tone
    "out": 1490,  # Fast whoosh transition
    "end": 951,  # Positive notification
}


def load(name):
    sid = SFX[name]
    os.makedirs(SFX_DIR, exist_ok=True)
    mp3 = os.path.join(SFX_DIR, f"mixkit-{sid}.mp3")
    if not os.path.exists(mp3):
        req = urllib.request.Request(
            f"https://assets.mixkit.co/active_storage/sfx/{sid}/{sid}-preview.mp3", headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=30) as r, open(mp3, "wb") as f:
            f.write(r.read())
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", mp3, "-f", "s16le", "-ac", "2", "-ar", str(SR), "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.int16).reshape(-1, 2).astype(np.float64) / 32768


def peak_time(x):
    """Sesin en güçlü olduğu an (20 ms pencerelerle)."""
    w = int(0.02 * SR)
    e = np.convolve((x ** 2).mean(axis=1), np.ones(w) / w, mode="same")
    return int(np.argmax(e))


def main():
    total = rp.total_frames() / rp.FPS
    out = np.zeros((int((total + 1) * SR), 2))
    snd = {k: load(k) for k in SFX}

    def place(name, at_sec, gain, align="peak"):
        x = snd[name] * gain
        offset = peak_time(x) if align == "peak" else 0
        i0 = int(at_sec * SR) - offset
        if i0 < 0:
            x = x[-i0:]
            i0 = 0
        n = min(len(x), len(out) - i0)
        if n > 0:
            out[i0 : i0 + n] += x[:n]

    fr = lambda f: f / rp.FPS
    # açılış: kapak kaybolup şerit kayarken; tepe, kaymanın ilk yarısına
    slide_start = rp.COVER + rp.FADE // 2
    place("intro", fr(slide_start + (rp.INTRO - slide_start) * 0.35), 0.75)
    # ilk telefona yakınlaşma
    place("pop", fr(rp.INTRO + rp.ZOOM_IN * 0.5), 0.7)
    t = rp.INTRO + rp.ZOOM_IN
    n = len(rp.SCREENS)
    for i in range(n):
        place("click", fr(t + 3), 0.32, align="start")  # başlık belirirken
        t += rp.HOLD
        if i < n - 1:
            place("sweep", fr(t + rp.TRANS * 0.5), 0.55)  # telefondan telefona
            t += rp.TRANS
    place("out", fr(t + rp.ZOOM_OUT * 0.5), 0.6)  # bütün şeride uzaklaşma
    t += rp.ZOOM_OUT
    place("end", fr(t + 8), 0.6, align="start")  # kapanış kartı

    peak = np.max(np.abs(out))
    if peak > 0.89:
        out *= 0.89 / peak
    out = out[: int(total * SR)]
    with wave.open(WAV, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((out * 32767).astype(np.int16).tobytes())
    subprocess.run(
        [
            "ffmpeg", "-v", "error", "-y", "-i", VIDEO_IN, "-i", WAV,
            "-map", "0:v", "-map", "1:a", "-c:v", "copy",
            "-c:a", "aac", "-b:a", "256k", "-ar", str(SR), "-ac", "2", "-shortest",
            "-movflags", "+faststart", VIDEO_OUT,
        ],
        check=True,
    )
    print("yazıldı:", VIDEO_OUT)


if __name__ == "__main__":
    main()
