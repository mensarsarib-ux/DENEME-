# Uygulama değişiklik talebi (Meta reklam ve pazarlama sohbetinden)

Tarih: 13 Kasım 2026. Dal: claude/hesabim-splash-dashboard. Gerekçeler ve veriler: `docs/aso-ve-reklam-metinleri.md`, `docs/meta-reklam-arastirmasi.md`.

Her madde için kullanıcıya önce planı göster. "Karar bekliyor" olan maddeleri kullanıcı onaylamadan yapma.

## 1. App Store metinleri (sonraki sürümle) — ONAYLI

Hesabım App Store aramasında "veresiye", "borç alacak", "kasa takibi", "gelir gider" kelimelerinde ilk 50'de yok; "muhasebe"de 33., "cari hesap"ta 34. Ad, alt başlık ve anahtar kelimeler ancak yeni sürüm gönderilirken değişir.

- `docs/app-store.md` güncellenecek:
  - Ad: `Hesabım Muhasebe: Veresiye`
  - Alt başlık: `Cari, borç alacak, kasa takibi`
  - Anahtar kelimeler (98/100 bayt, boşluk yok): `defter,tahsilat,gelir,gider,esnaf,müşteri,tedarikçi,ekip,dükkan,bakkal,market,ön,hesap,ekstre`
  - Tanıtım metni ve açıklamanın ilk 3 satırı: `docs/aso-ve-reklam-metinleri.md` bölüm 2.
- Uygulama içindeki görünen ad (`CFBundleDisplayName`) "Hesabım" ya da mevcut hâliyle kalabilir; App Store adı ayrı alan.
- Yeni ekran görüntüsü sırası ve yazıları: aynı dosya, bölüm 2.

## 2. Puan isteme penceresi — ONAYLI

Uygulamanın 0 puanı var; kodda SKStoreReviewController / in-app review yok.

- iOS'un yerel puan penceresini ekle (Capacitor 6 uyumlu bir in-app review eklentisi ya da küçük bir yerel eklenti ile `SKStoreReviewController.requestReview(in:)`).
- Tetik: kullanıcı toplamda 5. kaydını girdikten sonra, ya da ilk ekstresini paylaştıktan sonra. Cihazda bir kez gösterildiğini işaretle; 30 gün içinde tekrar isteme.
- Apple pencereyi yılda en fazla 3 kez gösterir, gösterip göstermemeye Apple karar verir.
- Puan karşılığı ödül, indirim ya da yönlendirici metin yok.
- Android henüz yok; kod iOS dışında sessizce hiçbir şey yapmamalı.

## 3. Web sitesi ana sayfası (hesabimmuhasebe.com) — ONAYLI

Repoda tanıtım ana sayfası yok (sadece destek, gizlilik, koşullar, KVKK, hesap silme).

- Basit, hızlı, tek sayfa (Türkçe), mevcut sitenin yayın düzenine uygun yerde.
- `<title>`: Hesabım Muhasebe – Veresiye, Cari ve Kasa Takibi Uygulaması
- `<meta name="description">`: Esnaf için veresiye defteri, cari hesap, borç alacak ve kasa takibi. Çalışanınızla birlikte kullanın. iPhone'da ücretsiz indirin.
- `<meta name="apple-itunes-app" content="app-id=6826814944">`
- App Store düğmesi: https://apps.apple.com/tr/app/hesab%C4%B1m-muhasebe/id6826814944
- 3 ekran görüntüsü (`public/tanitim/` içindekiler kullanılabilir), 3 özellik (cari hesap, tek dokunuşla kayıt, ekip), kısa SSS (yalnızca doğru bilgiler), alt bilgide destek, gizlilik, koşullar bağlantıları.
- Open Graph etiketleri (paylaşımda görsel ve başlık). Gerçek kişi adı, telefon, e-posta, uydurma yorum yok.
- Meta Pikseli şimdilik EKLENMESİN (KVKK aydınlatma metni ve çerez onayı gerekir; ayrıca karar verilecek).

## 4. Ücretsiz plan sınırında paket ekranı — ONAYLI (küçük)

Ücretsiz plan: 1 işletme, 4 sekme, sekme başına 10 kayıt, ekip yok (`src/lib/plan.ts`).

- Kullanıcı sınıra takıldığında (11. kayıt, 2. işletme, ilk ekip daveti) mevcut uyarı yerine doğrudan paket ekranı açılsın ya da uyarıda "Paketleri gör" düğmesi olsun. Mevcut akış zaten böyleyse dokunma, sadece kullanıcıya bildir.
- Metin reklamdaki dille aynı olsun: "Çalışanınız da kayıt girsin", "Birden çok işletme".

## 5. Meta SDK / abonelik olayı — KARAR BEKLİYOR

Meta şu an sadece yüklemeyi görüyor, abone olanı göremiyor; bu yüzden reklamlar ücretli müşteriye göre optimize edilemiyor.

- Seçenek A: Meta (Facebook) iOS SDK ile App Events (`fb_mobile_activate_app`, kayıt, `Subscribe`/`StartTrial`). App Tracking Transparency penceresi ve App Store gizlilik etiketi güncellemesi gerekir.
- Seçenek B: Sunucu tarafı Conversions API (App Store Server Notifications geldiğinde Supabase Edge Function'dan Meta'ya olay). SDK eklemez ama kurulumu daha uzun.
- Meta Uygulama ID: 2195198467790132.
- Kullanıcıya iki seçeneği, gizlilik etkisini ve iş yükünü anlat; onay gelmeden yapma.

## 6. Pro için ücretsiz deneme — KARAR BEKLİYOR

Uzun denemeler (17–32 gün) medyan %42,5 ile ücretliye dönüyor; şu an deneme yok.

- App Store Connect'te tanıtım teklifi (introductory offer, ör. 7 ya da 14 gün ücretsiz) + uygulamada metin.
- Fiyatlar değişmiyor. Kullanıcıya sor.

## Teslim

- Her madde ayrı commit, aynı dal, push.
- Bitince kullanıcıya hangi maddelerin yapıldığını ve yeni derleme gerekip gerekmediğini yaz.
