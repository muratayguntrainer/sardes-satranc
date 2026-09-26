# Sardes Satranç — Üyelik Sistemi (Faz 3)

Bu klasör, satranç kulübü uygulamasının üyelik (kayıt/giriş/şifremi unuttum/profil)
kısmının kaynak kodudur. React + Vite + Supabase Auth ile yazıldı.

## 1. GitHub'a yükle

1. GitHub'da **sardes-satranc** deposunu aç (yoksa github.com/new ile oluştur).
2. "Add file → Upload files" butonuna tıkla.
3. Bu klasördeki **tüm dosya ve alt klasörleri** (src/, supabase/, package.json, vite.config.js,
   index.html, .gitignore, .env.example — .env dosyası varsa YÜKLEME) sürükleyip bırak.
4. "Commit changes" ile kaydet.

## 2. Supabase projesi oluştur

1. [supabase.com](https://supabase.com) üzerinden ücretsiz hesap aç, e-postanı onayla.
2. "New Project" ile yeni bir proje oluştur (isim: sardes-satranc, şifreyi not al, bölge: en yakın Avrupa bölgesi).
3. Proje açıldıktan sonra sol menüden **SQL Editor**'e gir, bu klasördeki
   `supabase/schema.sql` dosyasının içeriğini yapıştırıp **Run** ile çalıştır.
   (Bu, üye profilleri tablosunu, oyun tablosunu ve güvenlik kurallarını kurar.)
   Daha önce bu dosyayı bir kez çalıştırdıysan, güncellenmiş hâlini tekrar çalıştırman
   yeterli — üyeler arası oyun tablosunu ekler, var olanlara dokunmaz.
4. Sol menüden **Project Settings → API**'ye git. Şu iki değeri kopyala:
   - **Project URL**
   - **anon public** anahtarı

## 3. Vercel'de yayına al

1. [vercel.com](https://vercel.com) üzerinden ücretsiz hesap aç (GitHub ile giriş yapabilirsin).
2. "Add New → Project" ile **sardes-satranc** GitHub deponu seç ve import et.
3. "Environment Variables" kısmına Supabase'ten aldığın iki değeri ekle:
   - `VITE_SUPABASE_URL` = Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = Supabase anon public anahtarı
4. "Deploy" butonuna bas. Birkaç dakika içinde canlı bir link (`....vercel.app`) oluşacak.

## 4. Supabase'te e-posta linklerini ayarla

Supabase Dashboard → **Authentication → URL Configuration** kısmında:
- **Site URL**: Vercel'den aldığın canlı adres (örn. `https://sardes-satranc.vercel.app`)
- **Redirect URLs**: aynı adresi ve `.../sifre-guncelle` uzantılı halini ekle

Bu ayar olmadan kayıt onayı ve şifre sıfırlama e-postalarındaki linkler doğru sayfaya yönlenmez.

## Yerel geliştirme (opsiyonel, bilgisayarında Node.js varsa)

```
npm install
cp .env.example .env   # sonra .env içine kendi Supabase bilgilerini yaz
npm run dev
```

## Şu an neler çalışıyor

- E-posta + şifre ile üye ol, giriş yap, çıkış yap
- Şifremi unuttum → e-posta ile sıfırlama linki
- Kayıt olunca otomatik profil oluşturuluyor (ad soyad, oynanan oyun/puzzle sayacı — şimdilik 0)
- Basit korumalı "Profilim" sayfası (giriş yapmadan görülemez)
- **Üyelerle Oyna**: bir üye yeni oyun açar (ya da lobiden bekleyen bir oyuna katılır),
  hamleler Supabase Realtime ile karşı tarafın ekranına anında yansır. Şah mat/berabere
  otomatik tespit edilir.
- **Yapay Zekaya Karşı Oyna**: 10 zorluk seviyesi (negamax + alpha-beta budamalı elle
  yazılmış bir motor), zaman kontrolü, geri al / pes et / beraberlik teklif et. Oyun
  bitince üyenin profilindeki "oynanan oyun" sayacı güncellenir.
- **Puzzle Çöz**: 10 seviyeli, elle doğrulanmış taktik puzzle seti. Çözülen seviyeler
  hem tarayıcıda hem de (giriş yapılmışsa) üyenin profilinde saklanır.

## Üyelerle Oyna nasıl çalışır

- `supabase/schema.sql` içindeki `games` tablosu her oyunun durumunu (kimin sırası,
  tahtanın son hâli, kazanan) tutar.
- Bir üye "Yeni Oyun Oluştur"a basınca bekleyen bir oyun satırı açılır; ister lobiden
  başka bir üye katılsın, ister "Davet Linkini Kopyala" ile linki doğrudan bir arkadaşına
  gönder.
- Oyun açılırken zaman kontrolü seçilir (Süresiz, 1-30 dakika arası) — tıpkı yapay zeka
  modundaki gibi, süresi biten taraf otomatik kaybeder.
- Hamle doğrulaması şu an tarayıcı tarafında (chess.js ile); ileride daha sıkı güvenlik
  istenirse sunucu tarafında da doğrulama eklenebilir (200 kişilik bir kulüp için bu risk düşük).

## Henüz bağlı değil (sıradaki adımlar)

- Faz 4: genel arayüz/tasarım cilası.
- Puzzle havuzu şu an 10 elle hazırlanmış pozisyondan oluşuyor; ileride gerçek bir
  puzzle veritabanına (ör. Lichess) bağlanarak genişletilebilir.
