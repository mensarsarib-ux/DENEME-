# Yönlendirme metni (yeni sohbetlere yapıştır)

Aşağıdaki "ORTAK BAĞLAM" bölümünü her yeni sohbetin başına yapıştır. Ardından sohbetin türüne ait bölümü (1, 2 ya da 3) ekle.

---

## ORTAK BAĞLAM

**Kullanıcı:** Muhammet Ensar Sarıboğa (Türkiye). Kullanıcının kendi işletmesi ve bir bakkal/esnaf hedef kitlesi var. Kendi adına konuşuluyor, rızası olmadan başka kişilerin adı, verisi ya da yüzü kullanılmaz.

**Uygulama:** "Hesabım Muhasebe" (App Store adı), Android tarafında "Hesabım". Küçük işletmeler ve esnaf için cari hesap, kasa, gelir-gider, alacak-borç takibi, ekip çalışması ve yedekleme. Paket kimliği: `com.mensar.hesabim`.

**Teknik yapı:** React 18 + TypeScript + Vite, Capacitor 6 (iOS), Supabase (kimlik doğrulama, veritabanı, Edge Functions), StoreKit ile abonelikler. Kod deposu: `mensarsarib-ux/DENEME-`, dal `claude/hesabim-splash-dashboard`. Mağaza metinleri `docs/app-store.md`, yayın durumu `docs/yayin-kurulum-notlari.md`.

**Paketler ve fiyatlar (yıllık):** Pro 499,99 TL, Pro Plus 899,99 TL, Premium 1.299,99 TL. Abonelik kimlikleri aynı ürünler için iOS ve Android'de aynı olacak.

**Durum (5 Kasım 2026):**
- iOS 1.0 (derleme 37) Apple incelemesinde, "Waiting for Review". Cuma 30 Ekim civarı gönderildi, henüz sonuç yok.
- Android: henüz başlanmadı. Google Play geliştirici hesabı açılıyor. Kişisel hesaplarda 12 test kullanıcısıyla 14 günlük kapalı test şartı var.
- Hukuki: Kişisel verilerin (KVKK) ve App Store/Play kurallarının uyumu üzerinde çalışıldı. Rehberden davet özelliği ve yerel veri şifreleme bekliyor, yeni sürümle yapılacak.

**Yasaklar (her sohbette geçerli):**
- Sahte müşteri yorumu, sahte hesap, satın alınmış takipçi, bot etkileşimi yok.
- Gerçek kişilerin yüzü ya da kişisel verisi izinsiz kullanılmaz. Ekran görüntülerinde ad, telefon ve e-posta bulanıklaştırılır.
- Yapay zeka ile üretilen gerçekçi insan içerikleri platform kurallarına göre etiketlenir.
- Şifre, API anahtarı ve kişisel telefon/e-posta sohbete yazılmaz.
- Reklam ve paylaşım kampanyaları kullanıcının onayı olmadan yayına alınmaz. Reklamlar PAUSED olarak hazırlanır.

**Repo yolları:**
- `video/build/`: video üretim hattı (stage.html, render.cjs, mux.py, sfx_real.py, assets/)
- `video/build/out/`: son videolar
- `docs/icerik-plani.md`, `docs/icerik-takvimi-hafta1.csv`: organik içerik planı ve takvim
- `docs/bolum-1-sahneler.md`, `docs/kling-istemleri.txt`: Bölüm 1 sahne listesi ve istemler

---

## 1. SOHBET: Uygulama geliştirme ve yayın

Bu sohbet uygulamanın kodunu, App Store ve Google Play yayınını, hukuki ve teknik güvenliği yönetir.

- Apple: inceleme sonucunu bekle. Ret gelirse gerekçeyi oku, düzeltmeyi hazırla, yeni derleme yükle.
- Google Play: Android projesini ekle (`npx cap add android`), AAB üret, kapalı test ve üretim adımlarını takip et.
- Hesap silme için web sayfası hazırla (Google zorunluluğu).
- Abonelik doğrulamasını Google Play için sunucu tarafında genişlet (iOS'taki `verify-purchase` gibi).
- Açık işler: rehber davet özelliğini kaldırmak ya da değiştirmek, yerel veriyi şifrelemek, Supabase'deki kalan 12 yetkili RPC fonksiyonunu tek tek doğrulamak, sızdırılmış şifre korumasını açmak (kullanıcı kendisi yapar).

## 2. SOHBET: Reklam ve tanıtım (Meta bağlantısı)

Bu sohbet reklam kampanyalarını, hedef kitleyi, bütçeyi ve rakip araştırmasını yönetir. Video üretimi bu sohbette değil.

- Meta reklam hesabı için kullanıcı "Adspirer Social Ads" connector'ını claude.ai'de bağlayacak (bağlantı henüz tamamlanmadı). Bağlanınca rakip reklam araması (anahtar kelimeler: hesabım muhasebe, cari hesap, defter, muhasebe uygulaması, kasa takibi) yapılabilir.
- Zapier'da Facebook Pages ve Instagram for Business bağlı değil (Facebook bağlantısı tamamlanmadı, Instagram'da iki bağlantı kaydı var, hangisinin iş hesabı olduğu belirsiz).
- Reklam kampanyaları PAUSED olarak hazırlanır, bütçe kullanıcı tarafından onaylanır. Günlük ve toplam üst sınır koy.
- Politika: Muhasebe uygulaması finansal ürün olarak sınıflanırsa özel reklam kategorisi kısıtları uygulanabilir, kontrol et.
- Marka riski: "DEFTER" adlı rakip uygulamanın marka ve arayüz benzerliği konusunda hukuki görüş alınmadı. Reklam metinlerinde "Defter" marka gibi kullanılmamalı.
- Zapier ücretli mi ücretsiz mi bilinmiyor, yeni uygulama bağlamadan önce kullanıcıdan onay al.

## 3. SOHBET: İçerik ve video üretimi

Bu sohbet kısa dikey videoları (Reels/TikTok, 9:16, 1080×1920) planlar, üretir ve birleştirir.

- Mevcut videolar: `video/build/out/hesabim-reels-altyazisiz.mp4` (altyazısız, 18 sn), `S01-altyazili-yeni.mp4` (altyazılı örnek).
- Üretim araçları: Kling (insan karakterli sahneler; ücretsiz planda kredi çok hızlı bitiyor, 5 sn klip 50 kredi), ElevenLabs (Türkçe seslendirme; eleven_v4 ve ifade etiketleri destekliyor; İrem sesi seçildi), yerel render (`video/build/render.cjs` ile HTML/CSS hareketli grafik, kredi harcamaz).
- Bölüm 1 hedefi: 30 saniye. AI sahneleri (S1, S2, S3, S5, S6) ve uygulama ekranı + CTA (S4, S7).
- Kling'de Türkçe dudak senkronu zayıf. Diyalogları ses hattında ekle, dudakları görünmeyen çekimler kullan.
- Defter tarzı hareketli grafik taslağı (`video/build/out/defter-taslak.mp4`) mevcut. Sayaç yerine üstü çizili "Defter" yazısı kullanıyor. Seslendirme (İrem, fısıltıdan heyecana) henüz üretilmedi, kullanıcının onayını bekliyor.
- Her yayın öncesi: AI etiketi, kullanıcının onayı, gerçek müşteri yorumu yerine kurgu olduğu açık yazılmalı.
- Her ElevenLabs ve Kling üretimi kredi harcar. Üretmeden önce kullanıcıya maliyeti göster.
