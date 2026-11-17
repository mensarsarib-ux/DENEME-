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
  - **Güncelleme (17 Kasım, Ensar Bey'in kararı):** Proje ücretli plana (Blaze) geçiyor, SMS tüm dünyaya açık kalacak (bölge kısıtı yok; uygulama ileride yurt dışına açılacak).
  - **Bekleme süresi (Ensar Bey'in istediği):** aynı numaraya ve aynı cihazdan kod isteme arası en az **5 dakika**, saatte en fazla **3** kod. Uygulamada "Kodu tekrar gönder" düğmesi geri sayımla kilitli; sınır aşılınca anlaşılır Türkçe mesaj. Sayaç cihazda tutulur; Firebase'in kendi numara başı sınırları ve iOS uygulama doğrulaması (APNs) ek koruma.
  - **Asıl koruma (Ensar Bey Google Cloud'da kuracak):** Identity Toolkit API için **günlük SMS kotası** (ör. günde 100) ve **bütçe uyarısı**. Bölge kısıtı olmadığı için SMS pompalama dolandırıcılığına karşı tavan bu kota.
  - Edge Function'da numara ve IP başına deneme sınırı (phone-login'deki gibi).
- **Apple incelemesi:** Firebase'de **test telefon numarası** (sabit kodlu, SMS gitmez) tanımla; App Store Connect inceleme notlarına bu numara ve kodu yaz. Yoksa Apple kayıt olamaz, uygulama reddedilir.

## Ensar Bey'in yapacakları (adım adım yaz, ekran görüntüsüyle ilerlesin)
1. console.firebase.google.com → yeni proje "Hesabım Muhasebe" (Google Analytics kapalı olabilir).
2. iOS uygulaması ekle: bundle `com.mensar.hesabim` → `GoogleService-Info.plist` indir (repoya koymak yerine nasıl verileceğini sen söyle; gizli anahtar sayılmaz ama yine de dikkat).
3. Authentication → Sign-in method → **Phone** aç. Proje genel adı: "Hesabım Muhasebe" (SMS metninde görünür).
4. Apple Developer → Keys → **APNs anahtarı** (.p8) oluştur → Firebase → Proje ayarları → Cloud Messaging → yükle. (Firebase iOS'ta sessiz bildirimle doğrulama yapar; yoksa reCAPTCHA sayfası açılır.) Not: bu, App Store Connect API anahtarından farklı bir anahtardır.
5. Blaze (kullandıkça öde) planı + kart; bütçe uyarısı; günlük SMS kotası.
6. SMS bölge politikası: kısıt yok (tüm dünya) — Ensar Bey'in kararı.

Yapıldı (17 Kasım): Firebase projesi "HESABIM", iOS uygulaması (com.mensar.hesabim, App Store 6826814944) eklendi, Phone sağlayıcısı açıldı, test numarası +90 555 000 00 00 / 123456 eklendi. GoogleService-Info.plist Ensar Bey'de; bu sohbete ek olarak gönderecek.

## Gizlilik
- Gizlilik politikası (public/gizlilik.html ve /en) ve KVKK metnine: telefon numarası doğrulama için Google Firebase'e iletilir.
- App Store gizlilik etiketi: telefon numarası (hesap işlevi için, izleme yok).

## Teslim
- Bitince: neler yapıldı, Ensar Bey'in hangi adımları tamamladığı, test sonucu (gerçek numarayla bir kayıt, bir şifre yenileme), yeni derleme gerekip gerekmediği.
- Bu yeni sürüm yayına girene kadar e-posta kodlarının spama düşmemesi için Resend ile özel SMTP kurulumu önerildi (Supabase → Authentication → Emails → SMTP). Ensar Bey yaptıysa dokunma, yapmadıysa hatırlat.

## Güncelleme (17 Kasım, 16:45)
- Proje Blaze planında (faturalandırma hesabı "Firebase Ödemesi", para birimi TRY). Türkiye SMS fiyatı 0,01 $/SMS (≈0,50 TL), günde ilk 10 SMS ücretsiz; telefonla giriş ilk 50.000 aylık aktif kullanıcıya kadar ücretsiz (Google Identity Platform fiyat sayfası).
- Bütçe: aylık 1.000 TL, uyarılar 500 / 900 / 1.000 TL (e-posta). Harcamayı durduran tavan YOK: Google Cloud'da Firebase telefon doğrulaması için günlük SMS kotası bulunmuyor, bütçedeki "harcama limiti" seçeneği bu hesapta kapalı.
- Bu yüzden Ensar Bey'in onayıyla **SMS bölge politikası: yalnızca Türkiye**. Yurt dışına açılınca ülke eklenir. Uygulamada yurt dışı numara girilirse anlaşılır bir mesaj göster (ör. "Şimdilik yalnızca Türkiye numaralarıyla kayıt olunabiliyor").
- Uygulamadaki 5 dakika / saatte 3 kod sınırı aynen geçerli.

## Güncelleme (17 Kasım, 16:55) — önceki "yalnızca Türkiye" kararı İPTAL
- Ensar Bey'in kararı: SMS bölge politikası **kısıtsız (tüm dünya)** kalacak. Koruma uygulama sınırlarıyla sağlanacak.
- Sınırlar:
  1. Aynı numaraya iki kod isteği arası en az 5 dakika, saatte en fazla 3 kod.
  2. **Aynı cihazdan farklı numaralara kod gönderilemez:** bir cihaz 24 saatte en fazla 1 farklı numaraya kod isteyebilir (aynı numaraya yeniden gönderim 1. kurala tabi). Numarasını yanlış yazan kullanıcı için: ilk kod doğrulanmadıysa numarayı 1 kez değiştirme hakkı olabilir; nasıl kurgulayacağını Ensar Bey'e öner.
  3. Sayaçlar iOS **Keychain**'de tutulsun (uygulama silinip yeniden kurulunca sıfırlanmasın).
- Sunucu tarafı koruma: Firebase **App Check (App Attest)** Authentication için açılabiliyorsa aç ve zorunlu kıl (istek gerçekten App Store'daki uygulamadan gelmiyorsa SMS gitmez). Desteği ve iOS 14+ gereksinimini doğrula; Apple incelemesindeki test numarası çalışmaya devam etmeli.
- Bütçe uyarısı 500 / 900 / 1.000 TL kurulu; Ensar Bey e-postaları takip edecek.
