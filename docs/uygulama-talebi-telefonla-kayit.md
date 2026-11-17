# Uygulama değişiklik talebi: telefon numarasıyla kayıt (SMS kodu, Firebase)

Tarih: 17 Kasım 2026. Kimden: "Meta reklam yönetimi ve pazarlama" sohbeti. Ensar Bey onayladı.
Önce planı Ensar Bey'e göster, onay gelince uygula. Her adım ayrı commit, aynı dal (claude/hesabim-splash-dashboard), push.

## Neden
- Kayıt doğrulama kodu e-postayla gidiyor ve spama düşüyor (bir kullanıcıda yaşandı). Supabase'in hazır e-posta gönderimi saatte birkaç e-postayla sınırlı; reklamdan aynı saatte gelenlerin bir kısmına kod hiç gitmeyebilir.
- Hedef kitle esnaf: telefon numarasını e-postadan iyi biliyor, SMS anında geliyor, iPhone kodu klavyenin üstünde otomatik öneriyor.
- Sağlayıcı: Firebase Authentication (Google). Resmi fiyat sayfası: "The first ten SMS you send per day are free." Bizim hacmimizde (günde < 10 kayıt) ücretsiz. SMS başlığı için belge gerekmiyor.
- Gelecek: "Hesabım Muhasebe" marka tescili gelince İleti Merkezi'nden `HESABIMMUH` başlığına geçilebilir. Bu yüzden SMS gönderen kısım tek yerde, değiştirilebilir olsun.

## Yeni akış
1. **Kayıt:** Ad + telefon (+90…) + şifre → "Kod gönder" → 6 haneli SMS kodu → hesap açılır.
   - Kayıt ekranında e-posta alanı kalkar. E-posta sonradan Ayarlar → Hesabım'dan isteğe bağlı eklenir (bu bölüm zaten var).
2. **Giriş:** telefon veya e-posta + şifre (mevcut davranış korunur; eski e-posta hesapları çalışmaya devam eder).
3. **Şifremi unuttum:** telefonla kayıtlı hesapta SMS kodu → yeni şifre. E-posta hesaplarında mevcut e-posta akışı kalır.
4. iOS kod otomatik doldurma: kod alanında `autocomplete="one-time-code"`.

## Teknik yapı (öneri; mevcut koda göre en iyisini seç ve Ensar Bey'e anlat)
- **İstemci:** Capacitor için Firebase Authentication eklentisi (ör. `@capacitor-firebase/authentication`), telefon doğrulaması yalnızca numarayı doğrulamak için; Firebase oturumu uygulamanın asıl oturumu olmaz. Dil `tr`.
- **Köprü (Supabase Edge Function, ör. `phone-signup`):** Firebase ID token'ını doğrular (Google açık anahtarları, `aud`/`iss` = Firebase proje kimliği, süre), içinden `phone_number` alır; numara başka hesapta yoksa (mevcut `check_phone_unique` mantığı) Supabase'de kullanıcı oluşturur (ad, telefon, dil; şifre), oturum döner.
  - Telefonla açılan hesap: `src/lib/cloud.ts` içinde "Telefonla açılan hesapta e-posta yoktur" notu ve `supabase/phone-login.sql`, `phone-security.sql`, `functions/phone-login` var. Mevcut yapıyla uyumlu olan yolu seç (auth.users.phone + phone_confirm, ya da mevcut eşleme). Giriş (`phone-login`) telefonla açılan hesapları da kapsamalı.
- **Şifre yenileme:** aynı doğrulama + Edge Function'da yönetici yetkisiyle şifre güncelleme.
- **Kötüye kullanım koruması:**
  - Firebase → Authentication → Settings → **SMS region policy: yalnızca Türkiye (TR)** (yurt dışı numaralara SMS pompalama faturasını önler).
  - Google Cloud'da günlük SMS kotası sınırı ve bütçe uyarısı (ör. ayda 100 TL).
  - Edge Function'da numara ve IP başına deneme sınırı (phone-login'deki gibi).
- **Apple incelemesi:** Firebase'de **test telefon numarası** (sabit kodlu, SMS gitmez) tanımla; App Store Connect inceleme notlarına bu numara ve kodu yaz. Yoksa Apple kayıt olamaz, uygulama reddedilir.

## Ensar Bey'in yapacakları (adım adım yaz, ekran görüntüsüyle ilerlesin)
1. console.firebase.google.com → yeni proje "Hesabım Muhasebe" (Google Analytics kapalı olabilir).
2. iOS uygulaması ekle: bundle `com.mensar.hesabim` → `GoogleService-Info.plist` indir (repoya koymak yerine nasıl verileceğini sen söyle; gizli anahtar sayılmaz ama yine de dikkat).
3. Authentication → Sign-in method → **Phone** aç. Proje genel adı: "Hesabım Muhasebe" (SMS metninde görünür).
4. Apple Developer → Keys → **APNs anahtarı** (.p8) oluştur → Firebase → Proje ayarları → Cloud Messaging → yükle. (Firebase iOS'ta sessiz bildirimle doğrulama yapar; yoksa reCAPTCHA sayfası açılır.) Not: bu, App Store Connect API anahtarından farklı bir anahtardır.
5. Gerekirse Blaze (kullandıkça öde) planı + kart; bütçe uyarısı kur.
6. SMS region policy → yalnızca TR.

## Gizlilik
- Gizlilik politikası (public/gizlilik.html ve /en) ve KVKK metnine: telefon numarası doğrulama için Google Firebase'e iletilir.
- App Store gizlilik etiketi: telefon numarası (hesap işlevi için, izleme yok).

## Teslim
- Bitince: neler yapıldı, Ensar Bey'in hangi adımları tamamladığı, test sonucu (gerçek numarayla bir kayıt, bir şifre yenileme), yeni derleme gerekip gerekmediği.
- Bu yeni sürüm yayına girene kadar e-posta kodlarının spama düşmemesi için Resend ile özel SMTP kurulumu önerildi (Supabase → Authentication → Emails → SMTP). Ensar Bey yaptıysa dokunma, yapmadıysa hatırlat.
