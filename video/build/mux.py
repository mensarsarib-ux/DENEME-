# Kareleri ses ve efektlerle birleştirir: python3 mux.py
import subprocess, numpy as np, wave, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
SR = 44100; DUR = 18.05
sfx = np.zeros(int((DUR + 1) * SR)); rng = np.random.default_rng(3)
def whoosh(at, dur=0.5, vol=0.2):
    n = int(dur * SR); noise = rng.standard_normal(n); out = np.zeros(n); y = 0.0
    for i in range(n):
        y += (0.02 + 0.25 * (1 - i / n)) * (noise[i] - y); out[i] = y
    t = np.linspace(0, dur, n); seg = out * np.sin(np.pi * t / dur) ** 2
    seg = seg / (np.max(np.abs(seg)) + 1e-9) * vol
    i0 = int(at * SR); sfx[i0:i0 + n] += seg[: len(sfx) - i0]
def ding(at, dur=0.8, vol=0.16):
    n = int(dur * SR); t = np.arange(n) / SR
    seg = (np.sin(2*np.pi*1318*t) + 0.4*np.sin(2*np.pi*1976*t)) * np.exp(-t*6) * vol
    i0 = int(at * SR); sfx[i0:i0 + n] += seg[: len(sfx) - i0]
def scratch(start, end, vol=0.05):
    # kalem sesi: hafif, düzensiz sürtünme gürültüsü
    n = int((end - start) * SR); noise = rng.standard_normal(n)
    env = (0.6 + 0.4 * np.sin(np.linspace(0, 60 * np.pi, n))) * vol
    i0 = int(start * SR); sfx[i0:i0 + n] += (noise * env)[: len(sfx) - i0]
# sahne geçişleri ve girişleri
for t in [3.0, 6.0, 9.5, 13.0, 16.0]:
    whoosh(t - 0.25)
for t in [3.2, 6.2, 9.7, 13.2, 16.2]:
    ding(t)
scratch(0.2, 1.9)         # defter yazısı
ding(16.9, vol=0.1)       # son vuruş
sfx = np.clip(sfx, -1, 1)
with wave.open('assets/sfx.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((sfx * 32767).astype(np.int16).tobytes())

os.makedirs('out', exist_ok=True)
cmd = ['ffmpeg', '-y', '-v', 'error', '-framerate', '30', '-i', 'frames/%05d.jpg',
       '-i', 'assets/voice.mp3', '-i', 'assets/sfx.wav',
       '-filter_complex', '[1:a]volume=1.0[va];[2:a]volume=0.8[sa];[va][sa]amix=inputs=2:duration=longest:normalize=0[aout]',
       '-map', '0:v', '-map', '[aout]', '-t', f'{DUR}',
       '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
       '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'out/hesabim-tanitim.mp4']
subprocess.run(cmd, check=True)
print('tamam')
