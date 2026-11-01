# Doğal ses efektleri (prosedürel "foley"): kağıt çevirme, kalem sürtünmesi, yumuşak dokunma, sayaç tıkları, oda sesi.
# Hiçbir kayıt indirilmez; her ses burada üretilir ve lisans sorunu oluşturmaz.
import numpy as np, wave
SR = 44100; DUR = 18.05
rng = np.random.default_rng(11)
out = np.zeros(int((DUR + 1) * SR))

def place(seg, at, gain=1.0):
    i0 = int(at * SR)
    if i0 < 0 or i0 >= len(out): return
    n = min(len(seg), len(out) - i0)
    out[i0:i0 + n] += seg[:n] * gain

def bandpass(x, lo, hi):
    # FFT ile basit bant geçiren filtre
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))

def burst(dur, lo, hi, attack=0.002, decay=0.05):
    n = int(dur * SR); t = np.arange(n) / SR
    env = np.minimum(t / attack, 1.0) * np.exp(-t / decay)
    return bandpass(rng.standard_normal(n), lo, hi) * env

# 1) Oda sesi: çok düşük seviyede sürekli arka plan (dijital sessizlik olmasın)
room = bandpass(rng.standard_normal(len(out)), 60, 900) * 0.0025
out += room

# 2) Kalem sürtünmesi: defter yazısı boyunca (0.2–1.9 sn), harf başına küçük tıklar
n_w = int(1.7 * SR)
scr = bandpass(rng.standard_normal(n_w), 1800, 6500)
env_w = (0.6 + 0.4 * np.sin(np.linspace(0, 60 * np.pi, n_w))) * np.minimum(np.linspace(0, 1, n_w) * 20, 1)
place(scr * env_w, 0.2, 0.09)

# 3) Sayfa çevirme: sahne 1'den 2'ye geçişte kağıt sesi (iki kısa sürtünme ve bir kağıt hışırtısı)
n_p = int(0.5 * SR); t_p = np.arange(n_p) / SR
rustle = bandpass(rng.standard_normal(n_p), 900, 5000) * np.exp(-t_p / 0.14) * np.minimum(t_p / 0.01, 1)
place(rustle, 2.85, 0.16)

# 4) Sahne geçişleri: sert değil, çok kısa kumaş/hava sesi (yumuşak dolgu)
# Geçiş sesi: kısa ve yumuşak bir tık (önceki uzun hava/kumaş sesi kaldırıldı)
for at in [5.85, 9.35, 12.85, 15.85]:
    place(burst(0.025, 2500, 6000, 0.001, 0.008), at, 0.10)

# 5) Yumuşak dokunma: logo ve buton görünürken cam/plastik tıkı
n_z = int(0.9 * SR); t_z = np.arange(n_z) / SR
chime = (np.sin(2*np.pi*1568*t_z) + 0.3*np.sin(2*np.pi*2352*t_z)) * np.exp(-t_z / 0.4)
place(chime, 16.25, 0.12)
for at in [3.25]:
    d = 0.12; n = int(d * SR); t = np.arange(n) / SR
    tap = (np.sin(2*np.pi*1100*t) * 0.25 + np.sin(2*np.pi*2600*t) * 0.1) * np.exp(-t / 0.012)
    b = burst(0.03, 3000, 8000, 0.001, 0.01); b = np.pad(b, (0, max(0, n - len(b))))[:n]
    place(tap * 0.5 + b * 0.3, at, 0.18)

# 6) Sayaç tıkları: kasa toplamı sayarken (6.2–8.6 sn), hafif ve seyrek
n_c = int(1.2 * SR); t_c = np.arange(n_c) / SR
bell = sum(np.sin(2*np.pi*f*t_c) * a for f, a in [(2093, 0.5), (3136, 0.3), (4186, 0.15)]) * np.exp(-t_c / 0.35)
drawer = bandpass(rng.standard_normal(n_c), 1500, 5000) * np.exp(-t_c / 0.03) * 0.5
place(drawer + bell * 0.6, 8.55, 0.22)

# Ses seviyesi: tepe değer sınırı
peak = np.max(np.abs(out))
out = out / max(peak, 1e-9) * 0.5
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
with wave.open('assets/sfx.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('sfx tepe=%.3f sure=%.2f' % (peak, len(out) / SR))
