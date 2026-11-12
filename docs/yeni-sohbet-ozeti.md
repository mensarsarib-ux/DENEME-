# Hesabım Muhasebe – yeni sohbet için özet (12 Kasım 2026)

Bu dosyanın içeriğini yeni sohbetin başına yapıştır. Gizli bilgi (şifre, anahtar, e-posta adresi) yoktur.

## Uygulama
- Ne yapar: küçük işletmeler için ön muhasebe ve cari hesap (müşteri/tedarikçi bakiyesi, satış/alış/tahsilat/ödeme, kasa, notlar, dönemsel gelir-gider, PDF ekstre, ekip paylaşımı).
- Hedef kitle: Türkiye'deki küçük işletme ve esnaf.
- Diller: Türkçe, İngilizce ve 15 dil daha (Arapça sağdan sola).
- Paketler (yıllık abonelik, yalnızca Türkiye): Pro ₺499,99, Pro Plus ₺899,99, Premium ₺1.299,99. Ücretsiz paket de var.
- Adı: Hesabım Muhasebe. Apple Kimliği: 6826814944. iOS paket: com.mensar.hesabim. Android paket: com.hesabimmuhasebe.
- Web: hesabimmuhasebe.com (yasal sayfalar: gizlilik, kullanım koşulları, KVKK, destek).

## Durum (12 Kasım 2026)
- **iPhone:** Sürüm 1.0 (build 38) mağazada satışta. Sürüm 1.1 (build 51) Apple incelemesinde. 1.1 onaylanınca yayına girer.
- **Android:** Kapalı test (Alpha). 49 yayında, 50 ve 51 yüklendi/yüklenecek. 12 test kullanıcısı tamam, 14 gün kapalı test sayacı işliyor; bitince üretim başvurusu açılır.
- **Ödeme:** Google ödeme profili doğrulandı. %15 hizmet ücreti programına kayıtlı (ZESA TEKNOLOJİ hesap grubu). Apple fiyatları Türkiye için düzeltildi.
- **Meta reklamı:** Uygulama tanıtımı kampanyası hazırlanıyor (iPhone, Türkiye, 18+, günlük bütçe ayarlanacak). Reklam seti için uygulama seçimi bekliyordu.
- **Reklam için sınır:** Android henüz herkese açık değil; Android reklamı üretim onayından sonra başlar. Meta SDK uygulamada yok, bu yüzden uygulama içi olay optimizasyonu sınırlı.

## Son yapılan değişiklikler (51 ve sonrası)
- Açılış tanıtımı: 4 slayt, ekran görüntüleriyle. Yalnızca uygulama yeni yüklendiğinde gösterilir; kapat-aç ve hesap silme ile tekrar gelmez.
- Klavye: iPhone'da yazı klavyesi açılınca ekran kayması düzeltildi; yazarken sekme boşluğu kaldırıldı.
- Ana ekran: kasa tutarı varsayılan gizli (ilk dokunuş gösterir, ikinci dokunuş kasayı açar).
- Ekiplerim: ücretsiz pakette açıklama sayfası açılır.
- Diğer: tahsilat rengi yeşil, ayarlar Hesabım sayfası boş değil, bildirim başlığı, "iPhone" ifadesi yalnızca iPhone'da, gider/gelir oranı açıklaması.

## Bilinen eksikler ve riskler
- Veritabanı güvenlik betiği (`supabase/security-fixes-2.sql`) henüz çalıştırılmadı. Dört açık: sahip değiştirme, izinsiz üye ekleme, doğrudan onay, istek yağmuru. Kullanıcı SQL Editor'den çalıştıracak.
- Abonelik devralma riski (işlem numarası tahmini), paket sınırlarının yalnızca uygulamada denetlenmesi, telefon numarasının SMS ile doğrulanmaması.
- Apple App Store Server Notifications adresi ayarlanmadı (iptal/iade sunucuya geç yansır).
- Google RTDN kurulmadı.
- Apple minimum iOS sürümü 13.0; Nisan 2027'den itibaren 15.0 istenecek.
- Puan ve yorum yok; uygulamada puan isteme penceresi eklenmedi (kullanıcı şimdilik istemedi).

## KVKK, hukuk, vergi
- Yurt dışı aktarım: Supabase (İrlanda/ABD), Resend (ABD), Cloudflare. Kurulun standart sözleşmeleri henüz imzalanmadı. Sayfalarda "süreç yürütülmektedir" yazıyor. İmza talepleri hazırlandı, gönderilmedi.
- Seçenek: veriyi Türkiye'ye taşımak (tahmini 400–1.000 TL/ay, 2–4 gün iş).
- Avukata sorulacaklar: aktarım dayanağı, imza şekli, bildirmeme cezası, aydınlatma metni, VERBİS.
- Mali müşavir: uygulama geliri için GVK 20/B istisnası. Kullanıcı vergi mükellefi değil, şirketi yok.

## Teknik
- Kod: GitHub, dal `claude/hesabim-splash-dashboard`. Web yayını Cloudflare Pages ile otomatik.
- iOS derleme: Codemagic, iş akışı "Hesabım iOS (TestFlight)", elle başlatılır. Derleme sürümü `CURRENT_PROJECT_VERSION` ve `MARKETING_VERSION` ile ayarlanır (şu an 1.1 / 51).
- Android derleme: `npm run build`, `npx cap sync android`, `cd android && ./gradlew bundleRelease`. İmza bilgileri ortam değişkenlerinde (anahtar dosyası repoda değil).
- Sunucu: Supabase projesi giirtstszkqicikszkms. Fonksiyonlar: verify-purchase (Apple + Google), apple-notifications, phone-login.
- Google servis hesabı: hesabim-play-verify (Play Console'da kullanıcı; finans ve abonelik izinleri).

## Kullanıcı hakkında
- Muhammet Ensar Sarıboğa, Türkiye, bireysel geliştirici (ZESA TEKNOLOJİ). Şirketi yok.
- Kod yazmıyor; uygulamayı yapay zekâ ile geliştiriyor. Mağaza panelleri ve sunucu işlerini adım adım öğrendi.
- Çoğunlukla telefondan çalışıyor, ekran görüntüsü gönderiyor.
- Tercih: kısa, sıralı adımlar; her ekranda nereye basılacağı; gerçek para ya da geri alınamaz işten önce onay.
- Düşünülmesi gerekeni Claude sormadan söylemeli; istenmeyen işi yapmamalı.
