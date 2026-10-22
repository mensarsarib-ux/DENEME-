# Hesap ve çoklu telefon girişi (Supabase)

1. https://supabase.com adresinde ücretsiz bir proje açın.
2. Proje panelinde **SQL Editor**'e `supabase/setup.sql` dosyasının içeriğini yapıştırıp çalıştırın.
3. **Authentication > Providers > Email** bölümünde isterseniz "Confirm email" seçeneğini kapatın (kapalıyken kayıt olunca hemen giriş yapılır; açıkken kullanıcı önce e-postasındaki bağlantıyı onaylar).
4. **Project Settings > API** sayfasından **Project URL** ve **anon public** anahtarını alın.
5. Uygulamayı derlerken şu iki değişkeni verin (anon anahtarı herkese açık olacak şekilde tasarlanmıştır; veriyi satır güvenliği kuralları korur):

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   npm run build
   ```

Değişkenler tanımlı değilse uygulama giriş istemeden yalnızca o cihazda çalışır.
