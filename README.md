# Selim: Zombi Avcısı 🚗💥🧟

Selim'in arabasıyla zombi dünyalarını temizlediği tarayıcı oyunu. Telefonda ve bilgisayarda oynanır, kurulum gerektirmez.

## Oyun
- **30 bölüm, 5 dünya:** Zombi Şehri, Kavurucu Çöl, Karanlık Orman, Buzul Dağı (kaygan!), Volkan Adası (lav gölleri!). Her dünyanın 6. bölümü boss savaşı.
- **6 araba:** Kum Böceği, Orman Jipi, Şimşek Spor, Polis Arabası, Canavar Kamyon, Mini Tank.
- **Araba özelleştirme:** Motor, Zırh, Dikenli Tampon, Nitro yükseltmeleri; 12 boya, 6 desen, 6 jant rengi.
- **9 silah:** Tabanca, Uzi, Pompalı, Buz Tabancası, Makineli, Alev Silahı, Roketatar, Lazer, Yıldırım Topu. Her birinin hasar ve atış hızı yükseltmesi var.
- **Zombi türleri:** Normal, Koşucu, Şişko, Tükürücü, Patlayan ve Boss'lar.
- Kırmızı variller vurulunca patlar, zombiler hızla çarpınca ezilir, kombo yapınca ekstra altın gelir.
- İlerleme tarayıcıda otomatik kaydedilir.

## Kontroller
**Telefon:** Ekranın soluna dokunup sürükle → sür. Selim otomatik ateş eder. Sağa dokunursan oraya nişan alır. NİTRO ve SİLAH düğmeleri sağ altta.

**Bilgisayar:** WASD / Ok tuşları → sür · Fare basılı → nişan + ateş · Boşluk → nitro · Q/E veya 1-9 → silah · P → duraklat

## GitHub Pages'te yayınlama
1. GitHub'da yeni bir repo aç (ör. `selim-oyun`), **Public** olsun.
2. `index.html` dosyasını ve `js` klasörünü (içindeki 4 dosyayla) yükle.
3. **Settings → Pages → Source: Deploy from a branch → Branch: main / (root) → Save**.
4. 1-2 dakika sonra oyun şu adreste açılır: `https://KULLANICI-ADIN.github.io/selim-oyun/`

## Dosyalar
| Dosya | İçerik |
|---|---|
| `index.html` | Sayfa, menüler ve tasarım |
| `js/veri.js` | Arabalar, silahlar, zombiler, dünyalar, kayıt ve sesler |
| `js/cizim.js` | Selim, araba, silah, zombi ve harita çizimleri |
| `js/oyun.js` | Oyun motoru: sürüş, ateş, zombi yapay zekâsı, kamera |
| `js/arayuz.js` | Garaj, silah dükkânı, bölüm seçimi, HUD ve ana döngü |
