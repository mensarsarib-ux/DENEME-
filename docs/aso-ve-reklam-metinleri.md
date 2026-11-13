# App Store bulunurluk (ASO) ve reklam metinleri

Tarih: 13 Kasım 2026. Kaynak: Türkiye App Store araması (iTunes Search API, 24 kelime), rakip mağaza bilgileri, Meta Reklam Kütüphanesi.

## 1. Durum: Hesabım App Store aramasında görünmüyor

| Aranan kelime | Hesabım sırası | İlk sıradakiler (puan sayısı) |
|---|---|---|
| hesabım muhasebe | 1 | — |
| muhasebe | 33 | DEFTER (25.626), İşletme Takip (35), Muhasebe App (132) |
| cari hesap | 34 | Online Cari Hesap (1), Oklif (1.475), Hızlı Cari (15) |
| cari takip | 46 | AKINSOFT (1.513), Cari Takip (68) |
| veresiye | ilk 50'de yok | Dijital Veresiye Defteri (29), Veresiye Defteri-Borç Takibi (25) |
| veresiye defteri | ilk 50'de yok | aynı uygulamalar |
| borç alacak | ilk 50'de yok | Borç/Alacak Defteri (10), Borç Alacak (12) |
| kasa takibi | ilk 50'de yok | Oklif (1.475), Kasa+ (6) |
| gelir gider | ilk 50'de yok | DEFTER (25.626), Ödedimmi (384) |
| ön muhasebe | ilk 50'de yok | DEFTER, Paraşüt (5.193), İşbaşı (1.944) |
| esnaf defteri, müşteri takip, tahsilat, alacak takip | ilk 50'de yok | küçük uygulamalar (0–77 puan) |

Sebepler:
- Uygulama 11 Kasım'da yayınlandı, **0 puan** var. Yeni ve puansız uygulama aramada geride kalır.
- Uygulama adında sadece "Muhasebe" var. Rakipler aranan kelimeyi adına koyuyor: "Veresiye Defteri-Borç Takibi", "Hızlı Cari: Borç Alacak Takip", "Esnaf Defteri: Veresiye Takip".
- Esnafın en çok kullandığı kelime **veresiye** ad, alt başlık ve anahtar kelimelerde hiç yok.
- Anahtar kelime alanı ad ve alt başlıktaki kelimeleri tekrar ediyor (muhasebe, cari, kasa, işletme): boşa harcanan yer.
- Uygulamada puan isteme penceresi yok (kodda SKStoreReviewController / in-app review bulunamadı).

Fırsat: "veresiye" ve "borç alacak" aramalarında ilk sıradakilerin 10–30 puanı var. Rekabet zayıf, kazanılabilir. "DEFTER" (Bizce Teknoloji, 25.626 puan) hemen her aramada üstte; onunla doğrudan yarışmak yerine veresiye ve cari takip kelimelerinde öne çıkmak daha gerçekçi.

## 2. App Store'a girilecek yeni metinler (Türkçe)

Ad, alt başlık ve anahtar kelimeler ancak yeni bir sürüm gönderilirken değişir. Bir sonraki derlemeyle birlikte App Store Connect'e girilmeli.

**Uygulama adı (26/30):**
```
Hesabım Muhasebe: Veresiye
```

**Alt başlık (30/30):**
```
Cari, borç alacak, kasa takibi
```

**Anahtar kelimeler (98/100 bayt; Türkçe harfler 2 bayt sayılır, boşluk yok):**
```
defter,tahsilat,gelir,gider,esnaf,müşteri,tedarikçi,ekip,dükkan,bakkal,market,ön,hesap,ekstre
```
Not: "defter" genel bir kelime ama en büyük rakibin adı "DEFTER". Apple rakip marka adını anahtar kelimede yasaklıyor; hukuki risk görülürse "defter" yerine "ciro" yazılsın.

**Tanıtım metni (170, sürüm göndermeden değişebilir):**
```
Veresiye defterini telefonuna taşı. Müşteri ve tedarikçi hesapları, satış, tahsilat ve kasa tek yerde. Çalışanın da kayıt girsin, kimin neyi göreceğine sen karar ver.
```

**Açıklamanın ilk 3 satırı (aramada ve sayfada ilk görünen kısım):**
```
Hesabım Muhasebe, esnaf ve küçük işletmeler için veresiye, cari hesap ve kasa takibi uygulamasıdır. Müşterinin borcunu deftere değil telefona yazın; kimin ne kadar borçlu olduğunu, kime ne kadar borcunuz olduğunu anında görün.
```
Açıklamanın geri kalanı docs/app-store.md'deki gibi kalabilir.

**Ekran görüntüleri (ilk 3 tanesi aramada görünür):**
1. "Veresiye defterin cebinde" + müşteri listesi
2. "Satış ve tahsilat tek dokunuşla" + kayıt ekranı
3. "Çalışanın da kayıt girsin" + ekip grafiği (videodaki "İşletmeniz → görebilir/göremez")
Yazılar büyük ve kalın; gerçek isim, telefon, e-posta yok.

## 3. Puan almak (aramada yükselmenin en hızlı yolu)

- Uygulamaya iOS puan isteme penceresi eklenmeli (Capacitor için in-app review eklentisi, Apple'ın SKStoreReviewController'ı).
- Ne zaman: kullanıcı 5. kaydını girdikten ya da ilk ekstresini paylaştıktan sonra. Apple yılda en fazla 3 kez gösterir.
- Puan karşılığı hediye, indirim ya da uydurma yorum yok (Apple kuralı ve bizim kuralımız).

## 4. Web sitesi (Google'da bulunma)

hesabimmuhasebe.com'da şu an bir tanıtım sayfası yok (repoda sadece destek, gizlilik, koşullar, hesap silme sayfaları var). Basit bir ana sayfa önerisi:
- `<title>`: Hesabım Muhasebe – Veresiye, Cari ve Kasa Takibi Uygulaması
- `<meta name="description">`: Esnaf için veresiye defteri, cari hesap, borç alacak ve kasa takibi. Çalışanınızla birlikte kullanın. iPhone'da ücretsiz indirin.
- `<meta name="apple-itunes-app" content="app-id=6826814944">` (iPhone'da üstte "Aç / İndir" bandı çıkar)
- App Store düğmesi, 3 ekran görüntüsü, 3 özellik, SSS ("Veresiye defteri uygulaması ücretsiz mi?", "İnternetsiz çalışır mı?" vb. — sadece doğru cevaplarla).
- İleride Meta Pikseli: siteye gelenlere yeniden reklam.

## 5. Meta reklam metinleri (kampanyada kullanılacak)

Meta 3 ana metni ve 3 başlığı aynı reklamda dener, iyi olanı daha çok gösterir.

**Ana metinler:**
```
Müşteri borcunu hâlâ kafanızda mı tutuyorsunuz? Veresiyeyi, cari hesabı ve kasayı tek uygulamada takip edin. Ücretsiz indirin.
```
```
Dükkânda siz yokken kayıtları çalışanınız girsin, kimin neyi göreceğine siz karar verin. Hesabım Muhasebe ile işletmeniz cebinizde.
```
```
Satış, tahsilat, borç, alacak. Her müşterinin hesabı ayrı, bakiye anında güncel. Esnafın cari ve kasa uygulaması: Hesabım Muhasebe.
```

**Başlıklar (40 karakterin altında):**
```
Veresiye ve cari tek uygulamada
```
```
Çalışanınla birlikte hesap tut
```
```
Ücretsiz indir, hemen başla
```

**Düğme:** Yükle

Kurallar: fiyat yok, rakip adı yok, "Defter" marka gibi kullanılmıyor, kredi/yatırım dili yok, uygulamada olmayan özellik yok.

## 6. Apple Search Ads (sonraki adım)

App Store'da arama reklamı, aramayı yapan kişiye doğrudan çıkar. "veresiye", "veresiye defteri", "cari takip", "borç alacak" kelimelerinde rakipler zayıf olduğu için ucuz olabilir. Türkiye tıklama maliyeti verisi bulunamadı; Meta testinden sonra küçük bir bütçeyle denenmeli.
