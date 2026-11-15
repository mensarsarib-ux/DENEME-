#!/usr/bin/env python3
"""Rulo önizleme videosuna geçiş ses efektleri ekler.

Sesler burada üretilir (kayıt indirilmez, lisans sorunu yok):
  - whoosh: şerit kayarken ve telefondan telefona geçişte (filtrelenmiş gürültü, yükselip alçalan ton)
  - pop: kamera ilk telefona yakınlaşırken
  - tık: her başlık belirdiğinde (yumuşak, kısa)
  - zil: kapanış kartı gelirken (iki tonlu, uzun sönümlü)
Zamanlar scripts/render-app-preview.py içindeki zaman çizelgesinden okunur; video değişirse sesler de uyar.

Kullanım: python3 scripts/add-preview-sfx.py
Girdi: store/app-preview/hesabim-rulo-886x1920-apple.mp4
Çıktı: store/app-preview/hesabim-rulo-886x1920-sesli.mp4 (+ aynı adla .wav ses izi)
"""
import importlib.util
import os
import subprocess
import wave

import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
spec = importlib.util.spec_from_file_location("rp", os.path.join(ROOT, "scripts", "render-app-preview.py"))
rp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rp)

VIDEO_IN = rp.OUT
VIDEO_OUT = os.path.join(ROOT, "store", "app-preview", "hesabim-rulo-886x1920-sesli.mp4")
WAV = VIDEO_OUT.replace(".mp4", ".wav")
SR = 48000
rng = np.random.default_rng(7)


def bandpass(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def whoosh(dur, lo=300, hi=5000, peak=0.45):
    """Kayma sesi: gürültü, ses yüksekliği ortada tepe yapar, parlaklık yükselip iner."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    env = np.sin(np.pi * np.clip(t / 1.0, 0, 1)) ** 2
    env *= np.clip((t - 0) / 0.15, 0, 1)  # yumuşak giriş
    low = bandpass(rng.standard_normal(n), lo, lo * 4)
    high = bandpass(rng.standard_normal(n), hi * 0.4, hi)
    sweep = np.sin(np.pi * t) ** 1.5  # ortada daha parlak
    x = low * (1 - 0.6 * sweep) + high * 0.6 * sweep
    x /= np.max(np.abs(x)) + 1e-9
    # stereo: soldan sağa (şerit sağdan sola kayarken ses de geçsin)
    pan = 0.5 + 0.35 * np.cos(np.pi * t)
    return np.stack([x * env * peak * pan, x * env * peak * (1 - pan)], axis=1)


def pop(freq=520, dur=0.18, gain=0.35):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 0.6 * np.exp(-t / 0.02))  # hızla düşen perde
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05)
    x[: int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    return np.stack([x * gain, x * gain], axis=1)


def tick(gain=0.18):
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.008) + bandpass(rng.standard_normal(n), 2500, 7000) * np.exp(-t / 0.004) * 0.4
    x /= np.max(np.abs(x)) + 1e-9
    return np.stack([x * gain, x * gain], axis=1)


def chime(gain=0.28):
    dur = 1.8
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for f, d, a in [(784.0, 0.0, 1.0), (1046.5, 0.09, 0.8), (1568.0, 0.09, 0.25)]:
        tt = np.clip(t - d, 0, None)
        x += a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.55) * (t >= d)
    x[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    x /= np.max(np.abs(x)) + 1e-9
    return np.stack([x * gain, x * gain], axis=1)


def main():
    total = rp.total_frames() / rp.FPS
    out = np.zeros((int((total + 0.5) * SR), 2))

    def place(seg, at):
        i0 = int(at * SR)
        n = min(len(seg), len(out) - i0)
        if n > 0:
            out[i0 : i0 + n] += seg[:n]

    fr = lambda f: f / rp.FPS  # kare → saniye
    # 1) açılış kayması: kapak kaybolup şerit kaymaya başlarken
    slide_start = rp.COVER + rp.FADE // 2
    place(whoosh(fr(rp.INTRO - slide_start) * 0.9, lo=180, hi=4000, peak=0.5), fr(slide_start))
    # 2) ilk telefona yakınlaşma
    place(pop(), fr(rp.INTRO + 2))
    # 3) her ekran: başlık tıkı; arada geçiş whoosh'u
    n = len(rp.SCREENS)
    t = rp.INTRO + rp.ZOOM_IN
    for i in range(n):
        place(tick(), fr(t + 2))
        t += rp.HOLD
        if i < n - 1:
            place(whoosh(fr(rp.TRANS) + 0.12, peak=0.38), fr(t - 2))
            t += rp.TRANS
    # 4) uzaklaşma ve kapanış zili
    place(whoosh(fr(rp.ZOOM_OUT) + 0.15, lo=150, hi=2500, peak=0.32), fr(t))
    t += rp.ZOOM_OUT
    place(chime(), fr(t + 8))

    # tepe sınırlama ve kayıt
    peak = np.max(np.abs(out))
    if peak > 0.9:
        out *= 0.9 / peak
    pcm = (out * 32767).astype(np.int16)
    with wave.open(WAV, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())

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
