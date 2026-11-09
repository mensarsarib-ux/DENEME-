# Hesabım Muhasebe – Durum özeti (8–9 Kasım 2026)

Bu dosya oturumlar arası devir içindir. Gizli bilgi (şifre, anahtar, JSON) burada yoktur; anahtar bilgileri
`scratchpad/keys/anahtar-bilgileri.txt` dosyasında ve parola yöneticisindedir.

## Uygulama ve sürümler
- Android paket adı: `com.hesabimmuhasebe`. Sürüm: **versionCode 49** (build.gradle), menüde "Sürüm 1.0 (49)".
- iOS: bundle `com.mensar.hesabim`, build **38**, Apple'da **"1.0 Waiting for Review"** (8 Kas 13:03 gönderildi).
- Android kapalı test (Alpha): 49 yayında, "belirli test kullanıcıları". 46–48 de yüklendi.
- Derleme: `npm run build`, `npx cap sync android`, `cd android && ./gradlew bundleRelease`. İmza için
  `CM_KEYSTORE_PATH`, `CM_KEY_ALIAS`, `CM_KEYSTORE_PASSWORD`, `CM_KEY_PASSWORD` ortam değişkenleri gerekir.
- Supabase adresi `.env.production` ile derlemeye girer (publishable anahtar, gizli değil).

## Abonelikler
- Ürün kimlikleri – iOS: `com.mensar.hesabim.{pro,proplus,premium}.yearly`.
  Android: `{pro,proplus,premium}.yearly`, temel plan `yearly`.
- Fiyatlar (TL, yıllık): Pro ₺499,99 · Pro Plus ₺899,99 · Premium ₺1.299,99. Ülke: sadece Türkiye.
- **Apple'da fiyat hatası:** Türkiye fiyatları ABD $ fiyatından otomatik hesaplanmış (₺599,99 vb.). Onay
  gelince Türkiye satırı **TRY, Edit Price** ile düzeltilecek; temel ülke Türkiye.
- Play'de abonelikler etkin; aktif temel planlar `yearly`, fiyatlar TL.
- Sunucu `verify-purchase` (sürüm 15): iOS = Apple numarası, Android = purchaseToken → Google Play API.
  Google servis hesabı `hesabim-play-verify`, Play'de kullanıcı olarak eklendi (Finansal veriler + Abonelikleri yönet).
  Sunucu anahtarı Supabase secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.
- Android satın alma: eklenti Billing 8'e uyarlandı (`scripts/native-purchases-android/`, `patch-native-purchases.cjs`).
  Cihaz aboneliği `getSubscriptionPurchases` ile okunuyor.

## Ödemeler ve vergi
- Google ödeme profili: banka doğrulandı (TR…4186). 0,22 TL (yanlış kaynak) ve 0,33 TL (Google) denemeleri.
- %15 hizmet ücreti: hesap grubu "ZESA TEKNOLOJİ" oluşturuldu, birincil hesap bu, kayıt tamam (9 Kas).
- Vergi: mali müşavire danışılmalı (GVK 20/B istisnası). Hukukçu: KVKK yurt dışı aktarım dayanağı.

## Google üretim süreci
- Kapalı test kullanıcıları: 12 hedef, 12'ye ulaşıldı (kontrol paneli "11" gösterdi, sonra iki kişi daha eklendi).
- 14 gün kapalı test sayacı: 12 kişi tamamlanınca başlar. Süre dolunca **Üretime başvur** açılır.
- Başvuru soruları: Kontrol paneli → "Soruları önizleyin".

## Yasal sayfalar
- Ana sayfalar (App Store adresleri, Apple'a özel): `https://hesabimmuhasebe.com/{gizlilik,kullanim-kosullari,kvkk,destek}.html` ve `/en/`.
- Google için ayrı sayfalar: `https://hesabimmuhasebe.com/android/…` (aynı adlar, `/android/en/` dahil).
- Play "Gizlilik politikası" adresi: `/android/gizlilik.html` (kaydedildi, yayınlandı).
- Yayın: Cloudflare Pages, branch `claude/hesabim-splash-dashboard`, her push otomatik yayınlanır.
- Ana sayfada Google geçmez (App Store 2.3.10). KVKK dayanak ifadeleri hukukçuya bırakıldı.

## Açık işler
1. **Apple onayı** (48 saate kadar). Onay gelince: Türkiye fiyatlarını düzelt, sonra duyuru.
2. **Apple sunucu bildirimi (App Store Server Notifications):** Ayar sayfası bulunamadı (App Information, Subscriptions,
   Pricing, In-App Purchases, App Store bölümleri bakıldı). Yayını engellemez. URL:
   `https://giirtstszkqicikszkms.supabase.co/functions/v1/apple-notifications`
3. **Google RTDN** (gerçek zamanlı bildirimler): Pub/Sub kurulumu yapılmadı.
4. **iOS build 39:** Yeni simge, açılış ekranı, sürüm numarası, rehber düzeltmesi iOS'a ancak yeni build ile girer.
5. **Play Veri güvenliği formu:** "Satın alma geçmişi" işaretli mi kontrol.
6. **Mağaza görselleri:** Ekran görüntüleri sadece Türkçe. Dünya açılınca İngilizce set eklenecek.
7. **Meta reklamları, Reels, Google Ads 8.000 TL kredisi:** beklemede.

## Kullanıcı tercihleri (önemli)
- Adım adım, kısa ve sıralı ilerle. Her ekranda nereye basılacağını yaz.
- Gerçek kart ya da ödeme işleminde dur, önce onay al.
- Yanlış teşhis yapıp deneme yapma; önce loglara/kayda bak.
