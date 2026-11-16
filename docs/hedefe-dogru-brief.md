# Hedefe Doğru — 6 aylık büyüme planı için başlangıç notu

Tarih: 16 Kasım 2026. Hazırlayan: "Meta reklam yönetimi ve pazarlama" sohbeti.
Dal: claude/hesabim-splash-dashboard. Bu sohbetin görevi: Ensar Bey ile 6 aylık (Kasım 2026 – Mayıs 2027) hedef planını kurmak, her ay sonuçları birlikte analiz etmek.

## Kısıtlar (Ensar Bey'den)
- Aylık reklam bütçesi: 5.000 TL. Gerekirse biraz üstüne çıkılabilir.
- Uygulamadan gelen tüm abonelik geliri büyümeye (reklama) geri yatırılacak.
- Ensar Bey'in ayrı bir işi var; geçim bu uygulamaya bağlı değil. Acele yok, para yakmak yok.
- Geliştirme Ensar Bey ve "Hesabım uygulaması geliştirme" sohbeti tarafından yapılıyor; uygulama değişikliği talepleri oraya gider.

## Bugünkü durum (16 Kasım 2026)
- App Store: "Hesabım Muhasebe: Veresiye", sürüm 1.1 yayında, 1.2 (derleme 59) TestFlight'ta. 3 puan, ortalama 5,0. Sadece iPhone, Android yok.
- Anahtar kelime sıraları: docs/veri/aso-siralama-2026-11-16.md (veresiye 21, veresiye takip 16, borç alacak 40; muhasebe ve cari hesap yeni ad sonrası ilk 50 dışı — 19 Kasım'da tekrar ölçülecek).
- Meta: iOS 14+ yükleme kampanyası 52618613339893 yayında (16 Kasım 22:30'dan beri), günde 150 TL (≈4.500 TL/ay), 24 Kasım'a kadar. Trafik kampanyası durduruldu, verisi docs/veri/trafik-kampanyasi-veri-2026-11-16.json (CTR %2,5–3, tıklama ~1,9 TL).
- Meta SDK (v18.1.1) olayları geliyor: uygulama açılışı, yükleme, abonelik.
- Ayrıntılar: docs/meta-reklam-arastirmasi.md, docs/aso-ve-reklam-metinleri.md, docs/rakip-defter-yol-haritasi.md.

## Bilinen ekonomi (tahmin, ölçülecek)
- Yükleme başı maliyet varsayımı 35 TL → 5.000 TL ≈ ayda ~140 reklam yüklemesi. Büyümenin çoğu reklamsız kanallardan gelmek zorunda.
- Pro yıllık ≈ ₺425 net. Başa baş için yükleyenlerin ~%7,5'i ücretliye geçmeli; sektör medyanı %2,1.
- Rakip DEFTER: 12,5 yıl, iOS TR 25.641 puan, Android ~30 bin, şu an Meta reklamı yok; büyüme motoru paylaşım ve arama.

## Önerilen büyüme kanalları (ucuzdan pahalıya)
1. Puan penceresi (uygulamada, talep edildi).
2. Paylaşım döngüsü: ekstre/PDF'e "Hesabım Muhasebe ile hazırlandı" + tıklanabilir bağlantı + QR kod (uygulama sohbetine talep gönderildi: docs/uygulama-talebi-paylasim-qr.md).
3. ASO: haftalık anahtar kelime ölçümü, yorumlara cevap.
4. Meta yükleme kampanyası, 5.000 TL/ay + gelir.
5. Sonra: Apple Search Ads küçük test, Android.

## Bu sohbette yapılacak ilk iş
1. 6 aylık hedefleri Ensar Bey ile belirle (öneri başlangıç noktası: Mayıs 2027 sonunda toplam ~3.000–5.000 yükleme, 150+ puan, veresiye aramasında ilk 10, ücretli abone sayısı ve dönüşüm oranı ölçülmüş). Hedefleri gerçek verilerle (ilk Meta yükleme verisi ~19 Kasım) güncelle.
2. Aylık çizelge: her ay bütçe, kanal, hedef, ölçüm.
3. Her ayın sonunda analiz: Meta (Graph API, act_4581603412076546), App Store sıralamaları (iTunes Search API, trackId 6826814944), App Store Connect (Ensar Bey ekran görüntüsü paylaşır).
4. Kural: Meta'da harcama açan her değişiklik için Ensar Bey'in onayı.
