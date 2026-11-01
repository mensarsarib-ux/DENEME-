# Ses sessizlik aralıklarından konuşma süresini çıkarır ve altyazı kelimelerini oransal olarak dağıtır.
# Çıktı: timing.js (stage.html bunu yükler). Kesin hizalama için ses metni gerekir.
import subprocess, re, json
SENT = [
  "Hala deftere mi yazıyorsunuz?",
  "Hesabım Muhasebe.",
  "Cari hesap, kasa ve ekibiniz tek uygulamada.",
  "Kasanızdaki para, nakit ve bankada tek ekranda.",
  "Gelirleriniz ve giderleriniz otomatik takip edilir.",
  "Her müşterinin cari hesabı ayrı, bakiye tek dokunuşla.",
  "Gelir ve giderlerinizi bir bakışta görün.",
  "Hemen deneyin.",
]
DUR = 18.05
err = subprocess.run(['ffmpeg','-hide_banner','-i','assets/voice.mp3','-af','silencedetect=noise=-30dB:d=0.12','-f','null','-'],capture_output=True,text=True).stderr
starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', err)]
ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', err)]
# Konuşma aralıkları = sessizliklerin tamamlayıcısı
speech, cur = [], 0.0
for s, e in zip(starts, ends):
    if s > cur: speech.append((cur, s))
    cur = e
if cur < DUR: speech.append((cur, DUR))
total = sum(b - a for a, b in speech)

segs = [s for s in speech if s[1]-s[0] > 0.3][:len(SENT)]
assert len(segs) == len(SENT), (len(segs), len(SENT))
sent_js = []
for si, s in enumerate(SENT):
    a, b = segs[si]
    ws = s.split(' ')
    tot = sum(len(w) + 2.0 for w in ws)
    pos = a; words = []
    for w in ws:
        d = (len(w) + 2.0) / tot * (b - a)
        words.append({'w': w, 't0': round(pos, 3), 't1': round(pos + d, 3)})
        pos += d
    sent_js.append({'text': s, 't0': round(a, 3), 't1': round(b, 3), 'words': words})
with open('timing.js', 'w', encoding='utf-8') as f:
    f.write('const SENTENCES = ' + json.dumps(sent_js, ensure_ascii=False, indent=1) + ';\n')
for s in sent_js: print(s['t0'], s['t1'], s['text'])
