# Beni tanı: yeni uygulama fikri üretmek için arka plan

Bu dosyayı yeni bir sohbetin başına yapıştırıyorum. Amacım, benimle yeni bir uygulama fikri üzerine fikir
alışverişi yaparken sıfırdan başlamaman. Aşağıdakiler bir önceki uzun çalışmadan (ilk uygulamamı mağazalara
çıkarma süreci) derlendi. "Doğrulanmadı" yazan yerler tahmindir; emin olmak için bana sor.

## 1. Ben kimim
- **Ad:** Muhammet Ensar Sarıboğa. İstanbul'dayım (Başakşehir / İkitelli tarafı).
- **Geliştirici adım:** ZESA TEKNOLOJİ (Google Play'de görünen ad). Bu bir şirket değil.
- **Hukuki durum:** Şirketim yok, vergi mükellefi değilim. Bireysel geliştirici olarak yayın yapıyorum.
- **Yazılım geçmişi:** Bu işe yeni girdim. Kod yazmıyorum; uygulamayı yapay zekâ (Claude Code) ile birlikte
  geliştirdim. Mağaza panelleri, sunucu, DNS gibi konuları bu süreçte, adım adım yaparak öğrendim.
- **Sektör yakınlığı (doğrulanmadı):** İş adresim bir giyim sanayi sitesinde ve uygulamadaki örnek veriler
  tekstil temalı (kumaş satışı, toptancı, aksesuar). Küçük işletme / esnaf / toptancı dünyasını yakından
  tanıyor olabilirim. Bunu bana sorarak netleştir; fikir üretirken en değerli bilgi bu olabilir.

## 2. İlk uygulamam: Hesabım Muhasebe
- **Ne yapar:** Küçük işletmeler için ön muhasebe ve cari hesap takibi. Müşteri ve tedarikçi bakiyeleri,
  satış / alış / tahsilat / ödeme kayıtları, kasa (nakit ve banka), notlar, dönemsel gelir-gider özeti,
  hesap ekstresi (PDF ve paylaşma), ekip üyeleriyle ortak işletme.
- **Hedef kitle:** Türkiye'deki küçük işletmeler ve esnaf.
- **Gelir modeli:** Ücretsiz paket ve üç yıllık abonelik: Pro ₺499,99, Pro Plus ₺899,99, Premium ₺1.299,99.
  Paketler işletme sayısı, sekme, kayıt ve ekip üyesi sınırlarıyla ayrışıyor. Yalnızca Türkiye'de satışta.
- **Platformlar:** iPhone (App Store incelemesinde), Android (Google Play kapalı testte, 12 test kullanıcısı
  ve 14 gün şartı işliyor), ayrıca web sürümü (hesabimmuhasebe.com).
- **Diller:** Türkçe ve İngilizce dahil 17 dil (Arapça sağdan sola destekli).
- **Durum (Kasım 2026):** Henüz mağazalarda herkese açık yayında değil. Gerçek kullanıcı sayısı çok az
  (yaklaşık 27 hesap, çoğu test).

## 3. Elimdeki altyapı ve hesaplar
- **Apple Developer hesabı** (bireysel) ve **Google Play geliştirici hesabı** (kimlik ve banka doğrulandı,
  %15 hizmet ücreti programına kayıtlı).
- **Teknoloji:** React + TypeScript + Vite, Capacitor ile iOS ve Android; sunucu tarafı Supabase
  (giriş, veritabanı, sunucu fonksiyonları); web ve alan adı Cloudflare; e-posta gönderimi Resend;
  iOS derlemeleri Codemagic. Aynı kod tabanından üç platforma çıkabiliyorum.
- **Hazır parçalar (yeni uygulamada yeniden kullanılabilir):** e-posta/telefon ile giriş, abonelik satın alma
  ve sunucu doğrulaması (Apple ve Google), çok dillilik, açık/koyu tema, Face ID / parmak izi kilidi,
  ekip ve paylaşım, yedekleme, PDF üretimi, yasal sayfalar, mağaza görselleri üretimi.
- **İçerik araçları:** ElevenLabs (seslendirme), Kling (video), kısa video üretim hattı (dikey 1080×1920,
  altyazı ve ses efektleriyle). Reels ve reklam içeriği üretebiliyorum.
- **Alan adı:** hesabimmuhasebe.com.

## 4. Bu süreçte öğrendiklerim (yeni fikirde hesaba katılmalı)
- **Mağaza süreçleri uzun ve katı.** Apple incelemesi günler sürüyor; Google yeni bireysel hesaplardan
  12 test kullanıcısı ve 14 gün kapalı test istiyor. Yeni bir uygulamada bu bekleme baştan plana girmeli.
- **Abonelik kurulumu en zor kısımdı.** Ürün kimlikleri, temel planlar, fiyatlar, vergi, sunucu doğrulaması,
  test hesapları, iki mağazanın farklı kuralları. Artık bu yol bilindiği için ikinci uygulamada çok daha hızlı olur.
- **Türkiye'ye özgü yükler:** KVKK (özellikle yurt dışındaki sunuculara veri aktarımı için standart sözleşme
  ve Kurum'a bildirim şartı) ve vergi (uygulama geliri için GVK 20/B istisnası konusu). Kişisel veriyi az
  toplayan ya da veriyi cihazda tutan fikirler bu yükü ciddi biçimde hafifletir.
- **Küçük ayrıntılar pahalıya patlıyor:** yanlış ülkeye göre girilen fiyat, eksik izin, sürüm numarası
  karışıklığı, test hesabı sorunları. Sürüm numarasını uygulama içinde göstermek gibi basit önlemler çok işe yaradı.
- **Güvenlik sonradan değil baştan düşünülmeli.** Son denetimde yetki kurallarında açıklar çıktı.

## 5. Kısıtlarım
- **Bütçe:** Sınırlı. Aylık birkaç yüz ile bin TL arası sunucu maliyetini bile tartarak karar veriyorum.
  Pahalı altyapı ya da büyük reklam bütçesi gerektiren fikirler bana uygun değil.
- **Ekip:** Tek kişiyim. Kod, tasarım, içerik ve destek bende (yapay zekâ yardımıyla).
- **Teknik derinlik:** Kendi başıma hata ayıklayamam; karmaşık altyapı (kendi sunucunu yönetmek, gerçek
  zamanlı sistemler, ağır veri işleme) benim için risk.
- **Hukuki yapı:** Şirketim olmadığı için kurumsal satış, fatura kesme, B2B sözleşme gerektiren modeller zor.
- **Zaman:** İlk uygulama hâlâ yayın aşamasında; bakım ve büyütme işi sürüyor.

## 6. Güçlü yanlarım
- İki mağazaya da uygulama çıkarma sürecini uçtan uca yaşadım; abonelik altyapım çalışır durumda.
- Aynı altyapıyı kopyalayarak ikinci bir uygulamayı çok daha kısa sürede çıkarabilirim.
- Türkiye pazarını ve (muhtemelen) küçük işletme / esnaf ihtiyaçlarını tanıyorum.
- Video ve seslendirme araçlarıyla kendi tanıtım içeriğimi üretebiliyorum.
- Kararlıyım: takıldığım yerde bırakmıyor, sorunu çözene kadar uğraşıyorum.
- Çok dilli yayın yapabiliyorum; yalnızca Türkiye ile sınırlı kalmak zorunda değilim.

## 7. Benimle nasıl konuşmalısın
- **Türkçe** ve samimi bir dille konuş. Resmî ve uzun yazılar beni yorar.
- **Kısa ve net ol.** Uzun açıklamalardan hoşlanmam. Önce sonucu söyle, ayrıntıyı ben istersem ver.
- **Adım adım ilerle.** Bir işi yaptırıyorsan tek tek, sırayla anlat; nereye basacağımı tam söyle.
- **Önerini söyle.** Bana beş seçenek sıralayıp bırakma; hangisini neden önerdiğini belirt.
- **Düşünülmesi gerekeni sen düşün.** Riskleri, eksikleri, "bunu yaparsak şu bozulur mu" sorularını ben
  sormadan sen gündeme getir.
- **Emin olmadığın şeyi emin gibi söyleme.** Yanıldıysan açıkça söyle; yanlış tahminle beni uğraştırma.
- **İstemediğim işi yapma.** Fikir sunduğumda hemen uygulamaya geçme, önce sor.
- Çoğunlukla telefondan yazıyorum; bazen sesle yazdırdığım için cümlelerim dağınık olabilir.

## 8. Yeni fikir üretirken bana sorman gerekenler
Bunları bilmiyorsun ve fikirlerin kalitesini doğrudan etkiler:
1. Günlük işim ne, hangi sektörü içeriden tanıyorum?
2. İlk uygulamada en çok hangi kısımdan keyif aldım, hangisinden bıktım?
3. Yeni uygulamaya haftada kaç saat ve ne kadar para ayırabilirim?
4. Hedefim ne: düzenli yan gelir mi, büyüyüp şirketleşmek mi, portföy oluşturmak mı?
5. Türkiye pazarı mı, dünya pazarı mı?
6. Çevremde ilk kullanıcı olabilecek kimler var (esnaf, toptancı, arkadaş çevresi)?
7. İlk uygulama yayına girip ilk gerçek kullanıcı verisi gelmeden ikinciye başlamak doğru mu?

## 9. Fikir değerlendirirken kullanılacak ölçütler (benim durumuma göre)
- Tek kişi ve yapay zekâ ile birkaç haftada çıkarılabilir mi?
- Mevcut altyapımı (giriş, abonelik, çok dillilik) yeniden kullanıyor mu?
- Az kişisel veri topluyor mu (KVKK yükü düşük mü)?
- Sunucu maliyeti düşük mü, kullanıcı artınca maliyet patlıyor mu?
- Reklam bütçesi olmadan, kısa video ve ağızdan ağıza yayılabilir mi?
- Apple ve Google kurallarında riskli bir alan mı (finans, sağlık, çocuk, kumar gibi)?
- Abonelik için ödeme yapılacak kadar tekrar eden bir ihtiyaç mı?
- İlk uygulamamın kullanıcılarına da satılabilir mi (aynı kitle)?
