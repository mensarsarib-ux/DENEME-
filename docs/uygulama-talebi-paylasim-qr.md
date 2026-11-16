# Uygulama değişiklik talebi: paylaşım bağlantısı ve QR kod

Tarih: 16 Kasım 2026. Kimden: "Meta reklam yönetimi ve pazarlama" sohbeti. Ensar Bey onayladı (fikir kendisinden).
Her madde için önce planı Ensar Bey'e göster.

## Neden
Rakip DEFTER 12,5 yılda reklamsız büyüdü; büyüme motoru paylaşım: kullanıcı raporu müşterisine gönderiyor, müşteri uygulamayı görüyor. Bizim reklam bütçemiz ayda 5.000 TL; büyümenin çoğu reklamsız kanallardan gelmeli. Esnafın müşterisine gönderdiği her ekstre, uygulamanın ücretsiz bir reklamı olur.

## 1. PDF / ekstre alt bilgisi
- Paylaşılan her PDF'in (ekstre, rapor) alt kısmına küçük, sade bir satır: "Bu belge Hesabım Muhasebe ile hazırlanmıştır."
- Yanına tıklanabilir bağlantı: https://hesabimmuhasebe.com/indir.html?kaynak=pdf
- Yanına küçük QR kod: aynı bağlantı (kaynak=pdf_qr).
- Neden ikisi birden: PDF çoğu zaman WhatsApp'ta telefonda açılır; aynı telefondaki QR okutulamaz, bağlantıya dokunulur. QR, belge yazdırılınca ya da bilgisayarda açılınca işe yarar.
- Tasarım belgenin içeriğini bastırmasın: alt bilgi küçük ve gri, belgenin asıl bilgisi öne çıkar.

## 2. Paylaşım mesajı
- Ekstre WhatsApp/paylaşım menüsüyle gönderilirken eklenen metnin sonuna tek satır: "Hesabım Muhasebe ile hazırlandı: https://hesabimmuhasebe.com/indir.html?kaynak=paylasim"
- Metin kısa kalsın; kullanıcı mesajı gönderirken silebilir.

## 3. Ölçüm
- kaynak parametresi (pdf, pdf_qr, paylasim) tanıtım sayfasında App Store bağlantısına taşınabilir: App Store kampanya bağlantısı `https://apps.apple.com/app/apple-store/id6826814944?pt=<sağlayıcı kodu>&ct=<kaynak>` ile App Store Connect → Analitik → Kampanyalar'da her kaynaktan gelen indirme görünür. Sağlayıcı kodu (pt) App Store Connect'te; Ensar Bey'den alınacak.
- Sayfa ve indir.html bu repoda (public/indir.html); kaynak→ct taşıma işini web tarafında bu talep kapsamında yapabilirsin ya da pazarlama sohbetine bırakabilirsin.
- Uygulamada paylaşılan PDF sayısı sayılabiliyorsa (Meta SDK olayı ya da mevcut analitik), "ekstre_paylasildi" olayı eklenmesi çok faydalı.

## 4. Puan penceresi (önceki talepten, hatırlatma)
- docs/uygulama-degisiklik-talebi.md madde 2. Henüz yapılmadıysa önceliklidir: puan sayısı App Store sıralamasını doğrudan etkiliyor.

## Teslim
- Ayrı commit'ler, aynı dal (claude/hesabim-splash-dashboard), push.
- Bitince hangi maddelerin yapıldığını ve yeni derleme gerekip gerekmediğini yaz.
