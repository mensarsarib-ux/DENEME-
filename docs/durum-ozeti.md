# Hesabım Muhasebe – Durum özeti ve açık görevler (10 Kasım 2026)

Bu dosya oturumlar arası devir içindir. Yeni bir sohbette "docs/durum-ozeti.md dosyasını oku" demek yeterlidir.
Gizli bilgi (şifre, anahtar, JSON) burada yoktur.

## 1. Şu anki durum

| Konu | Durum |
|---|---|
| iOS | Sürüm 1.0, build **38**, Apple'da "Waiting for Review" (8 Kas 13:03'te üç abonelik ve abonelik grubuyla gönderildi) |
| Android | **versionCode 49** kapalı testte (Alpha) yayında. Menüde "Sürüm 1.0 (49)" yazar |
| Google kapalı test | 12 test kullanıcısı hedefi tamamlandı (10 Kas). 14 günlük süre işliyor; bitince "Üretime başvur" açılır |
| Google ödeme profili | Banka hesabı doğrulandı (9 Kas) |
| Google %15 hizmet ücreti | Hesap grubu "ZESA TEKNOLOJİ" ile kayıt tamam (9 Kas) |
| Android satın alma | Uçtan uca çalışıyor: satın alma, sunucu doğrulaması, paket açılması, üst pakete geçiş (test edildi) |
| Web sitesi | Cloudflare Pages, dal `claude/hesabim-splash-dashboard`; her push otomatik yayınlanır |

## 2. AÇIK GÖREVLER (önem sırasıyla)

### A. Hemen yapılacaklar (kullanıcı)
1. **Veritabanı güvenlik betiğini çalıştır.** `supabase/security-fixes-2.sql` içeriğini
   https://supabase.com/dashboard/project/giirtstszkqicikszkms/sql/new adresine yapıştırıp Run'a bas.
   Kapatacağı açıklar: (1) sahip `owner_id` değiştirip Premium kullanıcının paketini kullanabiliyor,
   (2) sahip istediği kullanıcıyı izinsiz üye yapabiliyor, (3) sahip isteği doğrudan "onaylandı" yapıp ekip
   sınırını aşabiliyor, (4) katılma isteği sınırsız gönderilebiliyor. **Betik henüz uygulanmadı** (10 Kas kontrol edildi).
   Not: Claude'un Supabase aracı onay penceresi yüzünden çalıştıramadı; kullanıcının elle çalıştırması gerekiyor.
   Çalıştırdıktan sonra: Claude kuralları okuyarak doğrulasın; kullanıcı telefonda ekip akışını (katılma isteği,
   onay, işletme paylaşma, üye çıkarma) bir kez denesin. Betik canlıda denenmedi, yalnızca kod okunarak kontrol edildi.
2. **Supabase paneli:** "Leaked password protection" ayarını aç; en kısa şifreyi 8 karakter yap.
3. **Test kullanıcıları** 14 gün boyunca uygulamayı ara ara açsın.

### B. Apple onayı gelince
4. **Türkiye fiyatlarını düzelt.** Apple'da fiyat ABD'ye göre girilmiş ($9,99 → Türkiye otomatik ₺599,99).
   Her abonelikte: Subscription Prices → Edit Price → Country: Türkiye (TRY) → Pro ₺499,99, Pro Plus ₺899,99,
   Premium ₺1.299,99. Duyuru ve reklam bundan sonra.
5. **Apple reddederse** ret mesajını Claude'a ilet.
6. **iOS build 39:** yeni simge/açılış ekranı, menüde sürüm numarası, rehber düzeltmesi ve ekran düzeltmeleri
   iOS'a ancak yeni build ile girer. `CURRENT_PROJECT_VERSION = 39` yap, Codemagic `hesabim-ios` çalıştır.
7. **Sunucu sıkılaştırma (Claude):** `verify-purchase` içinde abonelik devralma riskini kapat (Apple işlem
   numarası tahmin edilirse kaydı eskimiş abonelik başka hesaba taşınabiliyor). İnceleme sırasında dokunulmadı.
8. **Paket sınırlarını sunucuda denetle (Claude):** sekme/kayıt sınırları yalnızca uygulamada kontrol ediliyor.
9. **App Store Server Notifications adresi:** App Store Connect'te ayar sayfası bulunamadı. Adres:
   `https://giirtstszkqicikszkms.supabase.co/functions/v1/apple-notifications`. Olmadan iptal/iade, kullanıcı
   uygulamayı açana kadar sunucuya yansımaz.

### C. Google üretime çıkış
10. 14 gün dolunca **Üretime başvur** (Kontrol paneli). Soruları önceden "Soruları önizleyin"den gör; cevapları
    Claude ile hazırla.
11. **Play Veri güvenliği formu:** "satın alma geçmişi" işaretli mi kontrol et.
12. **Google RTDN** (anlık abonelik bildirimleri): kurulmadı; Pub/Sub gerekir.
13. Sonraki Android sürümü **versionCode 50** olmalı (ekran düzeltmelerini içerir).

### D. KVKK / hukuk / vergi
14. **KVKK yurt dışı aktarım:** Supabase (İrlanda/ABD), Resend (ABD), Cloudflare ile Kurul'un standart sözleşmesi
    imzalanmadı. Sayfalarda "süreç yürütülmektedir" yazıyor; bu cümlenin doğru kalması için imza talepleri
    gönderilmeli (`privacy@supabase.com`; e-posta taslağı sohbette hazırlandı). İmzalamazlarsa seçenek: verileri
    Türkiye'ye taşımak (tahmini 400–1.000 TL/ay, Claude taşır, 2–4 gün; Apple onayı ve Google 14 gününden SONRA).
15. **Avukata sorulacaklar:** Apple/Google aktarım dayanağı; Supabase imzalamazsa geçiş; "bildirmeme" ile
    "güvencesiz aktarım" cezası farkı; gerçek kişi imza şekli; aydınlatma metni; VERBİS muafiyeti.
16. **Mali müşavir:** vergi mükellefi değil; uygulama geliri başlamadan GVK 20/B istisnası sorulmalı.

### E. Büyüme (beklemede)
17. İngilizce mağaza ekran görüntüleri (dünyaya açılırsa).
18. Meta reklamları, Reels içerikleri, Google Ads 8.000 TL kredisi.

## 3. Bilinen riskler (kabul edilmiş ya da ertelenmiş)
- Telefon numarası SMS ile doğrulanmıyor: başkasının numarasıyla kayıt mümkün.
- Telefonla girişte IP sınırı sahte başlıkla aşılabilir; numara başına sınır (15 dk'da 5) sağlam. Biri kasıtlı
  yanlış denemelerle başkasının telefonla girişini 15 dk kilitleyebilir.
- Paket sınırları (sekme, kayıt) sunucuda denetlenmiyor.
- Apple'ın 2.3.10 kuralı nedeniyle ana yasal sayfalarda Google adı geçmemeli (Google sayfaları `/android/` altında).

## 4. Teknik notlar
- Android paket: `com.hesabimmuhasebe`; iOS bundle: `com.mensar.hesabim`.
- Abonelik kimlikleri – iOS: `com.mensar.hesabim.{pro,proplus,premium}.yearly`; Android: `{pro,proplus,premium}.yearly`,
  temel plan `yearly`. Fiyatlar: ₺499,99 / ₺899,99 / ₺1.299,99, yalnızca Türkiye.
- Derleme: `npm run build` → `npx cap sync android` → `cd android && ./gradlew bundleRelease`.
  İmza: `CM_KEYSTORE_PATH`, `CM_KEY_ALIAS`, `CM_KEYSTORE_PASSWORD`, `CM_KEY_PASSWORD`. Anahtar deposu repoda değil.
- Supabase adresi `.env.production` içinde (publishable anahtar, gizli değil).
- Android satın alma eklentisi Billing 8'e yamalı: `scripts/native-purchases-android/`, `scripts/patch-native-purchases.cjs`.
- Menüdeki sürüm numarası derlemede `android/app/build.gradle` ve Xcode projesinden otomatik okunur (`vite.config.ts`).
- Simge/splash üretimi: `node scripts/generate-native-icons.cjs`.
- Sunucu fonksiyonu `verify-purchase` sürüm 15: sayısal işlem numarası = Apple, metin = Google purchaseToken.
  Google servis hesabı `hesabim-play-verify`; Play Console'da kullanıcı olarak ekli (Finansal veriler + Siparişleri yönet);
  anahtar Supabase secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.
- Yasal sayfalar: `public/` (Apple) ve `public/android/` (Google). Play gizlilik adresi: `/android/gizlilik.html`.
- Claude'un bu bulut ortamı `hesabimmuhasebe.com`, `supabase.co`, `kvkk.gov.tr` adreslerine doğrudan bağlanamıyor;
  veritabanına yalnızca Supabase aracıyla erişiyor.

## 5. 10 Kasım güvenlik denetiminin sonucu
- Sağlam: giriş yapmayan veri okuyamıyor; kullanıcı başkasının verisini okuyamıyor/değiştiremiyor; kimse kendine
  paket yazamıyor; ücretsiz pakette ikinci işletme açılamıyor; 5 MB üstü veri reddediliyor; repoda gizli anahtar yok.
- Kapatılan: `?sifirla` bağlantısı (açanın yerel verisini soru sormadan siliyordu) kaldırıldı.
- Bekleyen: bölüm 2-A-1'deki dört veritabanı açığı.
- Ekran taraması: ~45 ekran/pencere açıldı, çökme ve JavaScript hatası yok (giriş yapılmamış yerel modda;
  giriş, ekip ve satın alma ekranları burada denenemedi).

## 6. Kullanıcıyla çalışma tercihleri
- Adım adım, tek tek, kısa. Her ekranda tam olarak nereye basılacağı yazılsın; kopyalanacak metinler kod kutusunda.
- Çoğunlukla telefondan çalışıyor ve ekran görüntüsü gönderiyor.
- Gerçek para ya da geri alınamaz işlem öncesi dur, onay al.
- Deneme-yanılma yerine önce günlük/kayıt incele; yanlış teşhisi açıkça söyle.
- İstenmeyen işi yapma ("fikir sundum" ile "yap" farkına dikkat).
