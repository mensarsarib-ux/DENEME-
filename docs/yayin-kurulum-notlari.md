# Yayın kurulum notları (Apple ve Google)

Bu dosya, uygulamayı Apple'a ve Google Play'e çıkarırken yapılanları ve kalan adımları özetler. Şifreler burada tutulmaz.

## Uygulama bilgileri
- Görünen ad: Hesabım Muhasebe (Android/Capacitor adı: Hesabım)
- Paket kimliği (bundle id / applicationId): `com.mensar.hesabim`
- Sürüm: 1.0, derleme 37
- Destek URL: https://hesabimmuhasebe.com/destek.html
- Gizlilik politikası: https://hesabimmuhasebe.com/gizlilik.html
- Kullanım koşulları: https://hesabimmuhasebe.com/kullanim-kosullari.html
- Mağaza metinleri ve abonelik kimlikleri: `docs/app-store.md`

## Apple (App Store)
- Durum: "Waiting for Review" (Cuma, 30 Ekim 2026 civarı gönderildi). 5 Kasım 2026 itibarıyla hâlâ kuyrukta.
- Test hesabı bilgisi App Store Connect'teki inceleme notlarında. Şifreyi inceleme bitince değiştir.
- Bekleyen işler: Apple Developer lisans sözleşmesini hesap sahibinin kabul etmesi; yaş derecesindeki sosyal medya sorularının kontrolü; inceleme sonucu gelince bildirimleri takip etmek.

## Google Play (Android) — henüz başlanmadı
Repoda `android/` klasörü yok. Önce Capacitor ile Android projesi eklenmeli.

### Yapılacaklar
1. **Geliştirici hesabı:** Google Play Console'da kayıt (tek seferlik ücret). Kimlik doğrulaması istenebilir.
2. **Android projesini ekle:** `npx cap add android`, sonra imzalı bir AAB (Android App Bundle) üret. Codemagic'te Android iş akışı eklenebilir.
3. **Uygulamayı Play Console'a yükle:** Dahili test ya da kapalı test kanalına AAB yükle.
4. **Kapalı test şartı:** Kişisel hesap 13 Kasım 2023'ten sonra açıldıysa en az 12 test kullanıcısının 14 gün boyunca kesintisiz kapalı teste katılmış olması gerekir. Bu şart yoksa doğrudan üretime çıkılabilir. Kaynak ve doğrulama: https://support.google.com/googleplay/android-developer/answer/14151465
5. **Üretim erişimi başvurusu:** 14 gün dolunca Play Console'dan üretim erişimi için başvur. Red olursa süre sıfırlanır.
6. **Veri güvenliği formu:** Toplanan veriler (ad, telefon, e-posta, finansal kayıtlar, kişiler) doğru işaretlenmeli.
7. **İçerik derecelendirme anketi** ve **hedef kitle** beyanı doldurulmalı.
8. **Hesap silme:** Google, hesap açan uygulamalar için web üzerinden de hesap silme bağlantısı ister. Bu bağlantı için bir sayfa hazırlanmalı (örneğin hesabimmuhasebe.com altında).
9. **Rehber izni:** Android'de kişi okuma izni varsa Play Console'da gerekçesi açıklanmalı. Mevcut iOS uygulaması rehber seçiciyi izin istemeden kullanıyor, Android'de bu davranış ayrıca kontrol edilmeli.
10. **Mağaza görselleri:** Ekran görüntüleri ve tanıtım metinleri `docs/app-store.md` ve `scratchpad` klasöründeki mağaza görselleriyle hazırlanabilir.

## Açık kararlar
- Android sürümü için Apple ile aynı içerik ve fiyat mı kullanılacak? Abonelikler Google Play Faturalandırma ile ayrı tanımlanmalı.
- Abonelik doğrulaması için sunucu tarafı (verify-purchase) Google Play API'siyle genişletilmeli. Bu, iOS'tan ayrı bir iş.
