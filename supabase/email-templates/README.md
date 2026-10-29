# Supabase e-posta şablonları

Supabase → Authentication → Emails bölümüne yapıştırılır. Şablonlar 17 dildedir: kayıt sırasında
uygulamanın dili hesabın bilgilerine (`lang`) yazılır, e-posta o dilde gider. Dili olmayan eski
hesaplara Türkçe gider.

| Şablon | Konu (Subject) | İçerik (Body) |
|---|---|---|
| Confirm signup | confirm-signup-subject.txt | confirm-signup.html |
| Reset password | reset-password-subject.txt | reset-password.html |

Dosyalar bir betikle üretilir; metni elle değiştirirken her iki dosyada da aynı dil bloğunu düzeltin.

Logo: public/mail-logo.png, sitenin kendi adresinden (https://hesabimmuhasebe.com/mail-logo.png) gösterilir. Gmail SVG göstermediği için PNG kullanılır.
