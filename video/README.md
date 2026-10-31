# Hesabım Muhasebe · tanıtım videosu

Motion Canvas ile yapılmış dikey (1080×1920) tanıtım videosu. Uygulamanın derlemesinden bağımsızdır; kendi `package.json` dosyası var.

## Kurulum
```
cd video
npm install
```

## Önizleme (editör)
```
npm start
```
Tarayıcıda açılan editörde sahneyi izleyebilirsin.

## Video oluşturma
Editörün sağ üstündeki **Render** düğmesiyle MP4 dosyası üretilir (FFmpeg eklentisi kullanılır).

## Notlar
- Sahne: `src/scenes/hesabim.tsx`. Metinler ve süreler seslendirmeye göre ayarlanmalı.
- Kasa ve cari hesap rakamları örnektir; gerçek müşteri verisi kullanılmaz.
- Yazı tipi Inter. Bilgisayarda yoksa başka bir yazı tipi seçilebilir.
