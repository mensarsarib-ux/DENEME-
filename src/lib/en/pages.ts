/** İngilizce karşılıklar: menü sayfaları (profil, hesaplar, raporlar, notlar, bildirimler, ayarlar, destek) */
export const pages: Record<string, string> = {
  // Ortak
  "KAYDET": "SAVE",
  "Vazgeç": "Cancel",
  "SİL": "DELETE",
  "EVET, SİL": "YES, DELETE",
  "Not": "Note",
  "Telefon": "Phone",
  "E-posta": "Email",
  "Adres": "Address",
  "Nakit": "Cash",
  "Banka": "Bank",
  "Tahsilat": "Collection",
  "Silme onayı": "Delete confirmation",

  // Profil
  "İşletme profili": "Business profile",
  "Adınız ve iletişim bilgileriniz": "Your name and contact details",
  "Şirket adınız": "Your company name",
  "Üst çubukta bu şekilde görünür.": "This is how it appears in the top bar.",
  "İşletme adı": "Business name",
  "Yetkili": "Contact person",
  "Vergi numarası": "Tax number",
  "Profil kaydedildi.": "Profile saved.",

  // Hesaplarım
  "Hesaplarım": "My accounts",
  "Toplam {amount}": "Total {amount}",
  "Açılış bakiyesi": "Opening balance",
  "Toplam tahsilat": "Total collections",
  "Toplam ödeme": "Total payments",
  "Hareket sayısı": "Number of transactions",
  "Hareketleri gör": "View transactions",
  "Açılış bakiyesini düzenle": "Edit opening balance",
  "{name} açılış bakiyesi": "{name} opening balance",
  "Hesabın başlangıç tutarı. Bakiye, bu tutara tahsilatlar eklenip ödemeler çıkarılarak hesaplanır.":
    "The account's starting amount. The balance is calculated by adding collections to this amount and subtracting payments.",
  "Geçerli bir tutar yazın.": "Enter a valid amount.",

  // Raporlar
  "Raporlar": "Reports",
  "{period} özeti": "{period} summary",
  "{title} — {period} raporu": "{title} — {period} report",
  "Rapor dönemi": "Report period",
  "Bu ay": "This month",
  "Geçen ay": "Last month",
  "Bu yıl": "This year",
  "Tümü": "All time",
  "Gelir ve gider": "Income and expenses",
  "Net sonuç": "Net result",
  "Net": "Net",
  "Gelir (satış)": "Income (sales)",
  "Gider (alış)": "Expenses (purchases)",
  "Alacak ve borç": "Receivables and payables",
  "Güncel durum": "Current status",
  "Toplam alacak": "Total receivables",
  "Toplam borç": "Total payables",
  "Kasa (nakit + banka)": "Cash register (cash + bank)",
  "En çok satış yapılan müşteriler": "Top customers by sales",
  "En çok alış yapılanlar": "Top purchases from",
  "En çok satış yapılanlar": "Top sales to",
  "Bu dönemde satış yok.": "No sales in this period.",
  "Bu dönemde alış yok.": "No purchases in this period.",
  "RAPORU KOPYALA": "COPY REPORT",
  "Rapor panoya kopyalandı.": "Report copied to clipboard.",
  "Kopyalanamadı. Metni seçip kopyalayabilirsiniz:": "Could not copy. You can select and copy the text:",

  // Notlar
  "Notlar": "Notes",
  "{n} not": "{n} notes",
  "+ YENİ": "+ NEW",
  "Yeni not": "New note",
  "Yeni not ekle": "Add a new note",
  "Notu düzenle": "Edit note",
  "Geri dönünce otomatik kaydedilir": "Saved automatically when you go back",
  "Başlık": "Title",
  "Üste sabitle": "Pin to top",
  "Üste sabitlendi": "Pinned to top",
  "Sabitlenmiş": "Pinned",
  "Başlıksız not": "Untitled note",
  "Notlarda ara": "Search notes",
  "Henüz not yok.": "No notes yet.",
  "“{query}” ile eşleşen not yok.": "No notes match “{query}”.",
  "Bu notu silmek istediğinize emin misiniz?": "Are you sure you want to delete this note?",
  "Silinen not geri alınamaz.": "A deleted note cannot be recovered.",

  // Bildirimler
  "Bildirimler": "Notifications",
  "{n} okunmamış": "{n} unread",
  "Hepsi okundu": "All read",
  "HEPSİNİ OKU": "MARK ALL READ",
  "Okunmamış": "Unread",
  "Şu an bildirim yok.": "No notifications right now.",
  "Bildirim limitlerini düzenle": "Edit notification limits",
  "Kasa bakiyesi düşük": "Cash balance is low",
  "Nakit ve banka toplamı {total}; belirlediğiniz {limit} limitinin altında.":
    "Cash and bank total is {total}, below your {limit} limit.",
  "Bugünkü işlemler": "Today's transactions",
  "Bugün {n} işlem girildi.": "{n} transactions were entered today.",
  "Yüksek alacak: {name}": "High receivable: {name}",
  "{amount} tahsil edilmeyi bekliyor.": "{amount} is waiting to be collected.",
  "Yüksek borç: {name}": "High payable: {name}",
  "{amount} ödemeniz bekleniyor.": "{amount} is due from you.",

  // Ayarlar
  "Ayarlar": "Settings",
  "Tercihleriniz bu cihazda saklanır": "Your preferences are stored on this device",
  "Genel": "General",
  "Titreşim": "Vibration",
  "Düğmelere ve işlemlere dokununca hafif titreşim (iPhone desteklemeyebilir)":
    "Light vibration when you tap buttons and transactions (may not work on iPhone)",
  "Dil": "Language",
  "Para birimi": "Currency",
  "Para birimi seç": "Select currency",
  "Yalnızca gösterilen simge değişir; mevcut tutarlar başka bir para birimine çevrilmez.":
    "Only the displayed symbol changes; existing amounts are not converted to another currency.",
  "Bildirim limitleri": "Notification limits",
  "Yüksek alacak": "High receivable",
  "Bir kişinin alacağı limiti aşınca": "When a person's receivable exceeds the limit",
  "Alacak limiti": "Receivable limit",
  "Yüksek borç": "High payable",
  "Bir kişiye borcunuz limiti aşınca": "When what you owe a person exceeds the limit",
  "Borç limiti": "Payable limit",
  "Düşük kasa": "Low cash",
  "Nakit ve banka toplamı limitin altına inince": "When the cash and bank total falls below the limit",
  "Kasa limiti": "Cash limit",
  "Destek": "Support",
  "Destek e-postası": "Support email",
  "Destek mesajları bu adrese gönderilir": "Support messages are sent to this address",
  "destek@sirketiniz.com": "support@yourcompany.com",
  "Veriler": "Data",
  "Veriler yalnızca bu tarayıcıda saklanır. Yedek alıp başka cihaza taşıyabilirsiniz.":
    "Data is stored only in this browser. You can back it up and move it to another device.",
  "Yedeği kopyala": "Copy backup",
  "Yedekten yükle": "Restore from backup",
  "Yedek panoya kopyalandı.": "Backup copied to clipboard.",
  "Kopyalanamadı; metni elle kopyalayın:": "Could not copy; copy the text manually:",
  "Yedek metnini yapıştırın": "Paste the backup text",
  "GERİ YÜKLE": "RESTORE",
  "Yedek geri yüklendi.": "Backup restored.",
  "Metin geçerli bir yedek değil.": "The text is not a valid backup.",
  "Bu bir Hesabım yedeği gibi görünmüyor.": "This doesn't look like a Hesabım backup.",
  "Tüm verileri sıfırla": "Reset all data",
  "Sıfırlama onayı": "Reset confirmation",
  "Tüm verileri sıfırlamak istediğinize emin misiniz?": "Are you sure you want to reset all data?",
  "Kayıtlar, notlar ve ayarlar örnek verilere döner. Bu işlem geri alınamaz.":
    "Records, notes and settings return to the sample data. This cannot be undone.",
  "EVET, SIFIRLA": "YES, RESET",

  // Destek
  "Destek al": "Get support",
  "Sık sorulanlar ve sorun bildirme": "FAQ and problem reports",
  "Sık sorulan sorular": "Frequently asked questions",
  "Sorun bildir": "Report a problem",
  "Konu": "Subject",
  "Mesajınız": "Your message",
  "Mesaja kayıt sayıları gibi teknik bir özet eklenir; tutarlar eklenmez.":
    "A technical summary, such as record counts, is added to the message; amounts are not included.",
  "MESAJI KOPYALA": "COPY MESSAGE",
  "Mesaj kopyalandı.": "Message copied.",
  "E-posta ile gönder": "Send by email",
  "E-posta ile göndermek için destek adresi ekleyin": "Add a support address to send by email",
  "Yeni müşteri veya tedarikçi nasıl eklenir?": "How do I add a new customer or supplier?",
  "Ana ekranda sağ üstteki + düğmesine dokunun; etkin sekmeye (Müşteriler, Tedarikçiler veya kendi sekmeniz) eklenir.":
    "Tap the + button at the top right of the home screen; it is added to the active tab (Customers, Suppliers or your own tab).",
  "İşlem nasıl girilir?": "How do I enter a transaction?",
  "Kişinin sayfasında alttaki SATIŞ, ALIŞ, TAHSİLAT veya ÖDEME seçeneklerinden birine dokunun, tutarı yazın ve EKLE'ye basın.":
    "On the person's page, tap one of SALE, PURCHASE, COLLECTION or PAYMENT at the bottom, type the amount and press ADD.",
  "İşlemi düzenlemek veya silmek için ne yapmalıyım?": "How do I edit or delete a transaction?",
  "Listedeki işleme dokunun; Düzenle ve Sil seçenekleri açılır. Silme işlemi geri alınabilir.":
    "Tap the transaction in the list; the Edit and Delete options open. Deleting can be undone.",
  "Dönem nasıl değişir?": "How do I change the period?",
  "Ana ekrandaki grafiğe basılı tutun; hazır dönemleri seçebilir veya özel tarih aralığı verebilirsiniz.":
    "Press and hold the chart on the home screen; you can pick a preset period or set a custom date range.",
  "Sekmeyi nasıl düzenlerim?": "How do I edit a tab?",
  "Sekme adına basılı tutun; Düzenle ve Sil seçenekleri çıkar. Yeni sekme için sağa kaydırıp + düğmesini kullanın.":
    "Press and hold the tab name; the Edit and Delete options appear. For a new tab, swipe right and use the + button.",
  "Verilerim nerede saklanıyor?": "Where is my data stored?",
  "Yalnızca bu cihazdaki tarayıcıda. Ayarlar > Veriler bölümünden yedek alabilir ve geri yükleyebilirsiniz.":
    "Only in the browser on this device. You can back it up and restore it under Settings > Data.",

  // Para birimi adları
  "Türk Lirası": "Turkish Lira",
  "ABD Doları": "US Dollar",
  "Euro": "Euro",
  "İngiliz Sterlini": "British Pound",
  "İsviçre Frangı": "Swiss Franc",
  "Japon Yeni": "Japanese Yen",
  "Çin Yuanı": "Chinese Yuan",
  "Kanada Doları": "Canadian Dollar",
  "Avustralya Doları": "Australian Dollar",
  "Rus Rublesi": "Russian Ruble",
  "Suudi Riyali": "Saudi Riyal",
  "BAE Dirhemi": "UAE Dirham",
  "Katar Riyali": "Qatari Riyal",
  "Kuveyt Dinarı": "Kuwaiti Dinar",
  "Hindistan Rupisi": "Indian Rupee",
  "Güney Kore Wonu": "South Korean Won",
  "Brezilya Reali": "Brazilian Real",
  "Meksika Pesosu": "Mexican Peso",
  "Polonya Zlotisi": "Polish Zloty",
  "İsveç Kronu": "Swedish Krona",
  "Norveç Kronu": "Norwegian Krone",
  "Danimarka Kronu": "Danish Krone",
  "Azerbaycan Manatı": "Azerbaijani Manat",
  "Gürcistan Larisi": "Georgian Lari",
  "Kazakistan Tengesi": "Kazakhstani Tenge",
  "Mısır Lirası": "Egyptian Pound",
  "Güney Afrika Randı": "South African Rand",
};

pages["Fotoğraf seç"] = "Choose photo";
pages["Fotoğrafı kaldır"] = "Remove photo";
pages["Bu dosya okunamadı; başka bir fotoğraf deneyin."] = "This file could not be read; try another photo.";
pages["Fotoğrafı yerleştir"] = "Position photo";
pages["Fotoğrafı sürükleyip daireye tam ortalayın."] = "Drag the photo to center it in the circle.";
pages["Yakınlaştır"] = "Zoom";
pages["UYGULA"] = "APPLY";
pages["DAVET ET"] = "INVITE";
pages["Davet et"] = "Invite";
pages["Hesabım uygulamasını deneyin."] = "Try the Hesabım app.";
pages["Davet metni panoya kopyalandı."] = "Invite text copied to clipboard.";
pages["Paylaşım bu cihazda açılamadı."] = "Sharing could not open on this device.";
pages["Telefon rehberinden ekle"] = "Add from phone contacts";
pages["{n} kişi eklendi."] = "{n} contacts added.";
pages["Rehbere erişim verilmedi."] = "Contacts access was not granted.";
pages["Bağlı cihazlar"] = "Connected devices";
pages["Cihazlar yüklenemedi."] = "Devices could not be loaded.";
pages["Yükleniyor…"] = "Loading…";
pages["Bilinmeyen cihaz"] = "Unknown device";
pages["Bu cihaz"] = "This device";
pages["Şu anda açık"] = "Online now";
pages["Son görülme: {time}"] = "Last seen: {time}";
pages["Filtre"] = "Filter";
pages["Tümü"] = "All";
pages["En yeni"] = "Newest";
pages["En eski"] = "Oldest";
pages["Bu filtrede hareket yok."] = "No movements match this filter.";
