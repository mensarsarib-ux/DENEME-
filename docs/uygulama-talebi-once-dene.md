# Uygulama değişiklik talebi: "Önce dene, sonra kayıt ol" (misafir modu)

Tarih: 22 Kasım 2026. Kimden: "Meta reklam yönetimi ve pazarlama" sohbeti. Ensar Bey bu konuyu uygulama sohbetiyle konuşmak istiyor. Önce seçenekleri ve planı Ensar Bey'e anlat, onay gelmeden kod yazma.

## Veri (11–22 Kasım, Ensar Bey'in kendi hesapları hariç)
| Aşama | Kişi | İndirmeye oranı |
|---|---|---|
| App Store ilk kez indirme | 225 | %100 |
| Kayıt formunu dolduran | 138 | %61 |
| Hesabını onaylayan | 97 | %43 |
| Ana ekrana (müşteri ekleme) ulaşan | 91 | %40 |
| En az 1 müşteri ekleyen | 62 | %28 |
| En az 1 işlem giren | 53 | %24 |
| Ücretli abone | 1 | — |

- En büyük kayıp: indirip hiç kayıt olmayan 87 kişi (%39). Uygulamayı açıp 6 adımlı kayıt formunu görünce bırakıyorlar; ne aldıklarını görmeden işletme adı, telefon + SMS, e-posta, şifre isteniyor.
- E-posta kodu kaybı (41 kişi) 22 Kasım'da çözüldü: Supabase "Confirm email" kapatıldı (mailer_autoconfirm = true), takılı 15 hesap elle onaylandı. 1.3'teki telefon SMS doğrulaması kalıyor.
- App Store'da 1 yıldızlı yorum (20 Kasım): "Giriş yapılmıyor — kayıt girişi yapılmıyor sürekli hata veriyor". Sebebi e-posta kodu adımıydı.

## İstek
Kullanıcı uygulamayı kayıt olmadan açıp denesin; verisini kaybetmemek / başka cihazda görmek / ekip için hesap açsın.

Konuşulacak seçenekler (Ensar Bey'e artı-eksi ile anlat, öneri ver):
1. **Tam misafir modu:** Veriler cihazda (localStorage) tutulur, hesap açılınca buluta taşınır. Kayıt tetikleyicisi: ör. 5. kayıtta, ekstre paylaşırken, ikinci cihaz/ekip isteyince ya da bir uyarı bandıyla ("Verileriniz sadece bu telefonda, kaybolmasın diye hesap açın").
2. **Kısa kayıt:** Kayıt formunu en aza indirmek (ör. sadece telefon + SMS; işletme adı, e-posta, şifre sonradan). Daha az iş, ama kayıt ekranı yine ilk ekran.
3. **Örnek veriyle tanıtım:** İlk açılışta örnek işletme ile gezinme, "kendi işletmeni başlat" ile kayıt.

Dikkat edilecekler:
- Misafir verisi hesap açılınca kaybolmamalı (buluta taşıma, çakışma yok).
- Paket sınırları (ücretsiz: 1 işletme, 4 sekme, listede 10 kayıt) misafirde de geçerli olmalı.
- Apple kuralı (5.1.1): Hesap gerektirmeyen özellikler için zorunlu kayıt istenmemesi Apple'ın da önerdiği yol; misafir modu incelemeyi kolaylaştırır.
- Meta SDK olayları: "kayıt tamamlandı" (fb_mobile_complete_registration) misafirden hesaba geçişte gönderilsin, ayrıca misafir başlangıcı ölçülsün.
- Ölçüm: misafir olarak başlayan, kayıt olan, ilk müşteriyi ekleyen sayıları Supabase'de ya da Meta'da görülebilmeli.

## Ek, daha küçük işler (aynı konuşmada önceliklendirilsin)
- Ücretsiz sınıra gelince doğrudan paketler sayfasına atmak yerine açıklama: "Ücretsiz paketin 10 kayıt sınırına ulaştınız. Pro ile 20 kayıt, 3 işletme, ekip." (Sınırdaki 5 kullanıcıdan hiçbiri almadı.)
- Hiç müşteri eklemeyen 29 kişi için ana ekranda "İlk müşterini ekle" yönlendirmesi.
- PDF/ekstre paylaşımı ölçülmüyor: Meta SDK'ya "ekstre_paylasildi" olayı; PDF altına "Hesabım Muhasebe ile hazırlanmıştır" + indirme bağlantısı + QR (docs/uygulama-talebi-paylasim-qr.md, henüz yapılmadı).
