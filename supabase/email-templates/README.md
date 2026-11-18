# Supabase e-posta şablonları

Supabase → Authentication → Emails bölümüne yapıştırılır. Şablonlar 17 dildedir: kayıt sırasında
uygulamanın dili hesabın bilgilerine (`lang`) yazılır, e-posta o dilde gider. Dili olmayan eski
hesaplara Türkçe gider. Change email address şablonu, telefonla açılan hesaba Ayarlar → Hesabım'dan
e-posta eklenince doğrulama kodunu gönderir.

| Şablon | Konu (Subject) | İçerik (Body) |
|---|---|---|
| Confirm signup | confirm-signup-subject.txt | confirm-signup.html |
| Reset password | reset-password-subject.txt | reset-password.html |
| Change email address | change-email-subject.txt | change-email.html |
| Magic link | magic-link-subject.txt | magic-link.html |

Magic link şablonu, Ayarlar → Hesabım'dan "E-postayı doğrula" denince giden doğrulama kodudur
(kayıtta e-posta kodu istenmez; "Confirm email" kapalıdır). İçeriği kayıt onayı şablonuyla aynıdır.

Dosyalar bir betikle üretilir; metni elle değiştirirken her iki dosyada da aynı dil bloğunu düzeltin.

Logo: public/mail-logo.png, sitenin kendi adresinden (https://hesabimmuhasebe.com/mail-logo.png) gösterilir. Gmail SVG göstermediği için PNG kullanılır.
