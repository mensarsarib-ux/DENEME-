# Telifsiz arka plan müziği: bu dosya sıfırdan üretilir (kayıtlı bir eser kullanılmaz).
import numpy as np, wave
SR = 44100; DUR = 19.0
t = np.arange(int(DUR * SR)) / SR
def note(f, start, length, amp):
    n = len(t); tt = t - start
    m = (tt >= 0) & (tt < length)
    env = np.zeros(n)
    a, r = 1.2, 1.6  # yavaş giriş ve çıkış
    env[m] = np.minimum(tt[m] / a, 1) * np.minimum((length - tt[m]) / r, 1)
    sig = np.sin(2*np.pi*f*t) + 0.25*np.sin(2*np.pi*2*f*t) + 0.08*np.sin(2*np.pi*3*f*t)
    return sig * env * amp
# Akor ilerlemesi: Am – F – C – G (her biri 4.75 sn)
chords = [(220.00, 261.63, 329.63), (174.61, 220.00, 261.63), (130.81, 164.81, 196.00), (196.00, 246.94, 293.66)]
music = np.zeros(len(t))
for k, ch in enumerate(chords):
    for f in ch:
        music += note(f, k * 4.75, 4.75 + 1.5, 0.09)
# Hafif yumuşatma (yüksek frekansları bastır)
X = np.fft.rfft(music); fr = np.fft.rfftfreq(len(music), 1/SR); X[fr > 1200] *= 0.2
music = np.fft.irfft(X, len(music))
music = music / (np.max(np.abs(music)) + 1e-9) * 0.5
pcm = (np.clip(music, -1, 1) * 32767).astype(np.int16)
with wave.open('assets/music.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('müzik hazır', round(DUR, 2), 'sn')
