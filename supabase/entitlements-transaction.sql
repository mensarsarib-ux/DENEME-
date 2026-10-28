-- verify-purchase fonksiyonunun geri yükleme ve yenileme için hesabın son işlemini saklaması
alter table public.entitlements add column if not exists transaction_id text;
