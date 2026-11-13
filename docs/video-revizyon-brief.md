# Reklam videosu revizyon talimatı (Meta, iOS yükleme kampanyası)

Tarih: 13 Kasım 2026. Hazırlayan: Meta reklam sohbeti. Üretim: Video içerik üretici sohbeti.

Bu dosya, mevcut reklam videosunun (Reklam_videosu_bir.mp4, önceki adıyla final_ekip2.mp4) Meta Reels ve Hikayeler için yeniden kurgulanması talimatıdır. Tam araştırma: https://claude.ai/artifact/K2LWjCYMhNocxGx668dqXE

## 0. Başlamadan önce

- [ ] Önceki üretim dosyaları önceki oturumun geçici klasöründeydi (`.../scratchpad/ad/index.html`, ekran kayıtları, `voice315/voice.mp3`). Bu klasör büyük ihtimalle silindi. Varsa kullan, yoksa yeniden kur.
- [ ] Bu sefer bütün üretim dosyalarını repoda tut: `video/meta-v2/` klasörü (HTML sahne, ekran kayıtları, ses, render betiği). İş bitince commit edip push'la.
- [ ] Repodaki mevcut sistem kullanılabilir: `video/build/stage.html` + `render.cjs` (1080×1920, 30 kare/sn, Playwright ile kare kare) + `mux.py`.
- [ ] Kaynak video kullanıcı tarafından sohbete yüklenecek: `Reklam_videosu_bir.mp4` (28,3 sn, 720×1280).
- [ ] Kling ve ElevenLabs her üretimde kredi harcar. Üretmeden önce maliyeti kullanıcıya göster, onay al.

## 1. Mevcut videonun sorunları (neden değişiyor)

| Sorun | Ölçülen | Etkisi |
|---|---|---|
| Ana yazılar ekranın alt %20'sinde | "Her müşterinin cari hesabı ayrı" gibi başlıklar alt bantta | Reels'te açıklama ve "Yükle" düğmesi bu alanı kapatıyor, yazı okunmuyor |
| Telefonun üstü üst %14'te | Durum çubuğu ve uygulama başlığı üst bantta | Reels'te profil adı ve menü kapatıyor |
| Çözünürlük düşük | 720×1280, 572 kbit/sn | Uygulama ekranları bulanık; Meta yeniden sıkıştırınca daha da kötüleşir |
| Çok özellik | 28 sn'de 7 özellik (cari, kayıt, ekstre, tedarikçi, kasa, alış, ekip) | Her biri ~3,5 sn, hiçbiri akılda kalmıyor |
| "Ücretsiz" yok | Kapanışta sadece "Bugün başlayın" ve "HEMEN deneyin!" | Bütün rakipler "ücretsiz" ya da "14 gün deneme" diyor |
| Açılış durağan | İlk 3 sn sabit yazı ve soru işareti | İlk 3 saniyede hareket olmayınca kaydırılıyor |
| Kapanış kısa | Logo ve çağrı ~3 sn | Uygulama adı ve çağrı akılda kalmıyor |

Korunacaklar: açılış sorusu ("Müşteri borcunu kafanızda mı tutuyorsunuz?") doğru derde dokunuyor; siyah zemin, turkuaz/yeşil/mavi palet; iPhone çerçevesi; örnek veriler (Örnek Kırtasiye vb.); ekip grafiği (üç kart, onay işaretleri).

## 2. Teknik çıktı

| Dosya | Boyut | Not |
|---|---|---|
| `meta-v2-A-9x16.mp4` | 1080×1920 | Ana sürüm, Reels ve Hikayeler |
| `meta-v2-B-9x16.mp4` | 1080×1920 | Aynı gövde, farklı açılış |
| `meta-v2-A-4x5.mp4` | 1080×1350 | Akış için kesim (A sürümü) |
| `meta-v2-fiyat-4x5.png` | 1080×1350 | Statik görsel |
| `meta-v2-ekip-4x5.png` | 1080×1350 | Statik görsel |

- Video: H.264, 30 kare/sn, en az 8 Mbit/sn, `yuv420p`, `+faststart`.
- Ses: AAC 48 kHz stereo, konuşma yaklaşık −14 LUFS, müzik konuşmanın altında yaklaşık −18 dB.
- Süre: 17–20 saniye. 20 saniyeyi geçmesin.
- Ekran kayıtları ve görseller 1080 genişlikten küçükse ölçeklenirken netlik kontrol edilsin; mümkünse iPhone'dan yeniden kayıt.

## 3. Güvenli alan (1080×1920 için)

- **Üst 0–270 px:** yazı, logo ya da önemli arayüz yok.
- **Alt 1536–1920 px:** yazı, logo ya da önemli arayüz yok.
- **Yanlar:** 64 px boşluk.
- **Yerleşim:** Başlık yazısı üstte, y 300–520 aralığında. Telefon çerçevesi ortada, y 560–1480 aralığında. Altta hiçbir şey yok.
- Teslimden önce her sürümden 3 kare (açılış, gövde, kapanış) üst ve alt bantları kırmızı boyanmış olarak kontrol edilsin.

## 4. Yeni kurgu (A sürümü, ~18 sn)

| Saniye | Görüntü | Ekrandaki yazı (üstte) | Seslendirme |
|---|---|---|---|
| 0,0–2,5 | Açılış: soru yazısı ilk karede hareketle gelsin (kelime kelime ya da soru işareti zıplaması). İlk 0,3 sn içinde hareket olmalı. | **Müşteri borcunu kafanızda mı tutuyorsunuz?** ("kafanızda" turkuaz) | "Müşteri borcunu hâlâ kafanızda mı tutuyorsunuz?" |
| 2,5–6,0 | Müşteri listesi → bir müşteriye dokunma → cari hesap (mevcut kayıt). Dokunma anında yakınlaşma. | **Her müşterinin hesabı ayrı** | "Hesabım Muhasebe'de her müşterinin cari hesabı ayrı." |
| 6,0–9,5 | Tutar girişi → SATIŞ / TAHSİLAT → EKLE → bakiye güncelleniyor (mevcut kayıt). | **Satışı, tahsilatı tek dokunuşla girin** | "Satışı, tahsilatı tek dokunuşla girin; bakiye anında güncellensin." |
| 9,5–13,5 | Ekip grafiği (mevcut üç kart, onay işaretleri). | **Çalışanınız da kaydetsin** / alt satır: kim neyi görecek, siz seçin | "Çalışanınız da kayıt girsin, kimin neyi göreceğine siz karar verin." |
| 13,5–18,0 | Kapanış: logo, uygulama adı, "Ücretsiz başla" düğmesi, App Store rozeti. En az 4 sn ekranda. | **Hesabım Muhasebe** / **Ücretsiz başla** | "Hesabım Muhasebe. Ücretsiz başlayın." |

Çıkarılanlar: ekstre, tedarikçi, kasa, alış sahneleri. Bunlar statik görsellerde ve App Store sayfasında kalır.

## 5. B sürümü

- Gövde ve kapanış A ile birebir aynı. Sadece 0–2,5 sn değişir.
- Açılış yazısı: **Dükkânda siz yokken kayıtları kim tutuyor?**
- Seslendirme: "Dükkânda siz yokken kayıtları kim tutuyor?"
- Amaç: çalışanı ya da ikinci şubesi olan esnafı yakalamak. Ekip özelliği ücretli pakette, bu kitle ücretliye geçmeye daha yakın.

## 6. Yazı ve görünüm

- Yazı tipi: Inter (gövde) ya da mevcut videodaki kalın sans. Başlık en az 72 px, alt satır en az 44 px (1080 genişlikte).
- Renkler: zemin siyah/koyu (#0E1416), yazı beyaz, vurgu turkuaz (#3DDBB0), ikinci vurgu mavi.
- Her başlık en fazla 2 satır, satır başına en fazla ~22 karakter.
- Sesi kapalı izleyen her şeyi anlamalı: seslendirmenin karşılığı ekranda yazı olarak var.
- Kapanış düğmesi: "Ücretsiz başla". "HEMEN deneyin!" yerine bu kullanılsın.

## 7. Seslendirme ve müzik

- ElevenLabs, İrem sesi, eleven_v4. Toplam yaklaşık 40 kelime. Üretmeden önce karakter sayısı ve kredi maliyeti kullanıcıya gösterilsin.
- A ve B için iki ayrı açılış cümlesi, gövde ve kapanış tek kayıt olarak üretilebilir (krediden tasarruf).
- Dudak senkronu gerektiren insan çekimi yok.
- Müzik sakin, konuşmanın altında; ilk karede başlasın (sessiz açılış olmasın).

## 8. Statik görseller (1080×1350)

1. **Fiyat:** Üstte "Esnafın cari ve kasa uygulaması". Ortada uygulama ekranı. Altta "Ücretsiz başla · Pro yıllık ₺499,99". "Ayda ₺42" gibi aylık abonelik izlenimi veren ifade kullanılmasın; gerekiyorsa "ayda yaklaşık ₺42'ye denk gelir" denilsin.
2. **Ekip:** Ekip grafiği + "Çalışanınız da kaydetsin, kim neyi görecek siz seçin".

## 9. Kurallar (değişmez)

- [ ] Ekranda gerçek müşteri adı, telefon, e-posta yok. Örnek veri ya da bulanıklaştırma.
- [ ] Uygulamada olmayan özellik yok: e-fatura, stok, SMS/WhatsApp ile borç hatırlatma gösterilmesin.
- [ ] Rakip adı geçmesin. "Defter" kelimesi marka gibi kullanılmasın ("veresiye defteri" genel ifade olarak serbest).
- [ ] Kredi, borç verme, yatırım, "para kazan" gibi finans ürünü çağrıştıran dil yok.
- [ ] Yapay zekâ ile üretilmiş gerçekçi insan ya da sahne eklenirse videoda "Yapay zekâ ile oluşturuldu" yazısı olsun.
- [ ] Uydurma müşteri yorumu ya da kullanıcı sayısı yok.

## 10. Teslim kontrol listesi

- [ ] `ffprobe` çıktısı: 1080×1920, 30 kare/sn, H.264, AAC, süre 17–20 sn.
- [ ] Güvenli alan kontrol kareleri (açılış, gövde, kapanış) sohbete gönderildi.
- [ ] Sesi kapalı izlendi, mesaj anlaşılıyor.
- [ ] İlk 0,3 saniyede hareket var.
- [ ] Kapanış en az 4 sn, "Ücretsiz başla" okunuyor.
- [ ] Dosyalar `video/meta-v2/` altında, commit edilip push'landı.
- [ ] Meta reklam sohbetine bitti haberi verildi; kampanya bu dosyalarla PAUSED kurulacak.
