<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Whatsuck ikonu">
</p>

<h1 align="center">Whatsuck</h1>

<p align="center">
  <strong>WhatsApp Web, native bir Ubuntu masaüstü uygulaması olarak.</strong><br>
  Aynı anda birden fazla hesap. Gerçek bildirimler. Otomatik güncelleme. Hepsi ~85 MB'lık tek pakette.
</p>

<p align="center">
  <a href="https://github.com/yucOx/whatsuck/releases"><img src="https://img.shields.io/github/v/release/yucOx/whatsuck?style=flat-square" alt="Sürüm"></a>
  <a href="https://github.com/yucOx/whatsuck/actions/workflows/release.yml"><img src="https://img.shields.io/github/actions/workflow/status/yucOx/whatsuck/release.yml?style=flat-square" alt="Build"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/yucOx/whatsuck?style=flat-square" alt="Lisans"></a>
  <a href="https://github.com/yucOx/whatsuck/releases"><img src="https://img.shields.io/github/downloads/yucOx/whatsuck/total?style=flat-square" alt="İndirme"></a>
  <a href="https://github.com/yucOx/whatsuck/issues"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PR kabul edilir"></a>
  <a href="https://github.com/yucOx/whatsuck"><img src="https://img.shields.io/github/last-commit/yucOx/whatsuck?style=flat-square" alt="Son commit"></a>
</p>

<p align="center">
  <a href="README.md">🇬🇧 English</a> ·
  <a href="README.tr.md">🇹🇷 Türkçe</a>
</p>

---

## Neden Whatsuck?

Tarayıcı sekmesinde WhatsApp Web işin %90'ını görür — geri kalan %10'u aslında yaşamaya başlayınca fark edersiniz.

| Tarayıcı sekmesi | Whatsuck |
|---|---|
| ❌ Sekmeyi kapatırsan bildirim gelmez | ✅ Arka plan, bildirimler her zaman açık |
| ❌ Aynı anda tek numara | ✅ Birden fazla profil, yan yana |
| ❌ "Chrome 85+ gerekli" uyarısı | ✅ Chromium 130+ dahili, uyarı yok |
| ❌ Tarayıcı reset'lerse çerezler silinir | ✅ OS keyring ile şifreli, restart sonrası kalır |
| ❌ Uygulama menüsünde gözükmez | ✅ Her profil için gerçek `.desktop` entegrasyonu |
| ❌ Otomatik güncelleme yok | ✅ Arka planda indirir ve kurar |

**Asıl öne çıkan özellik: aynı anda birden fazla WhatsApp hesabı.** Her profil tamamen izole (ayrı çerez, localStorage, IndexedDB, HTTP cache). Kişisel numaranla bir pencerede, iş numaranla diğerinde — incognito gereksiz, ikinci tarayıcı gereksiz, logout gereksiz.

---

## ✨ Özellikler

### 💬 WhatsApp için her şey

- **Çoklu profil** — iki veya daha fazla WhatsApp hesabı yan yana, her biri kendi izole oturumunda
- **Masaüstüne sabitle** — istediğin profili "Whatsuck (İş)" olarak uygulama menüsüne pinle
- **Varsayılan profil** — `whatsuck` açtığında hangi hesap gelsin sen seç
- **Gerçek bildirimler** — gelen mesajlar OS bildirim merkezine (libnotify / GNOME / KDE) Whatsuck ikonuyla düşer
- **Bildirim ayarları** — Settings menüsünden bildirimleri ve sesi açıp kapatabilirsin
- **Dış linkler** — sohbetteki URL'ler uygulama içinde değil, varsayılan tarayıcıda açılır

### 🖥️ Sistem entegrasyonu

- **Sistem tepsisi** — pencereyi kapat uygulama arka planda çalışır; tepsiden geri getir
- **Tek instance** — uygulama launcher'a tekrar tıklayınca yeni pencere açmak yerine mevcut pencereyi gösterir
- **Dock'a küçült** — tepsinin çalışmadığı sistemlerde (GNOME Wayland) pencereyi kapatmak görev çubuğuna küçültür
- **Dış linkler** — URL'ler varsayılan tarayıcıda açılır

### 🔐 Güvenlik

- **Otomatik güncelleme** — GitHub releases'i kontrol eder, arka planda indirir, SHA512 doğrulamalı
- **OS keyring** — session çerezleri GNOME Keyring / KWallet ile şifrelenir (varsa)
- **Sert sandboxing** — `contextIsolation`, `sandbox`, `webSecurity=true`, `nodeIntegration` yok, `webviewTag` yok
- **İzolasyonlu dialog** — profil girişi preload + `contextBridge` ile; renderer'ın Node.js erişimi yok
- **Dış linkler** — sadece `http`/`https` ve WhatsApp dışı hostlar uygulamadan çıkar
- **Bildirim throttle** — saniyede en fazla 1, OS DoS koruması

### ⚙️ Teknik

- **Menü çubuğu her zaman açık** — View menüsünden gizleyebilirsin, Alt ile geri getirebilirsin
- **Klavye kısayolları** — `Ctrl+R` reload, `Ctrl+N` yeni pencere, `F12` DevTools
- **CLI profiller** — `whatsuck --profile=is` ile belirli hesabı aç
- **Chromium güncellik uyarısı** — bundled Chromium 2+ ana sürüm gerideyse haber verir
- **~85 MB `.deb`** — bağımsız, dış runtime gerektirmez
- **Sağlam hata yönetimi** — bozuk profil dosyaları otomatik yedeklenir; kötü CLI girdisi zarifçe varsayılana düşer

---

## 📦 Kurulum

### Tek komut (önerilir)

`git`, `node` veya `npm` gerekmez — sadece `curl` veya `wget`:

```bash
curl -sL https://raw.githubusercontent.com/yucOx/whatsuck/main/setup.sh | bash -
```

Veya klonla ve yerel çalıştır:

```bash
git clone https://github.com/yucOx/whatsuck.git
cd whatsuck
./setup.sh
```

Kurulum scripti sizin için her şeyi yapar:
- ✅ `curl`/`wget` ve `dpkg` kurulu mu kontrol eder
- ✅ GitHub releases'tan en son `.deb` dosyasını indirir
- ✅ Sisteminize kurar
- ✅ Whatsuck uygulama menüsünde görünür

### Manuel kurulum

```bash
sudo dpkg -i whatsuck_1.0.2_amd64.deb
sudo apt-get install -f   # eksik bağımlılıkları tamamla
```

### Kaldırma

```bash
./uninstall.sh
```

Kaldırıcı size interaktif olarak sorar: session verisi (profiller, çerezler, WhatsApp oturumları) silinsin mi? Silmezseniz daha sonra yeniden kurduğunuzda oturumlarınız korunur.

---

## 👥 Çoklu WhatsApp Hesabı

Her profil tamamen izole bir WhatsApp oturumudur. Menü çubuğunda **Profiles**'a tıklayın:

| Menü öğesi | Ne yapar |
|---|---|
| New Profile… | Yeni oturum oluşturur ve WhatsApp penceresi açar |
| Rename… | Profilin görünen adını değiştirir |
| Delete | Profilin tüm oturum verisini kalıcı olarak siler |
| Set as Default | `whatsuck` komutuyla hangi profil açılsın |
| Pin to Desktop | Uygulama menüsünde `.desktop` girdisi oluşturur |

### Komut satırından

```bash
whatsuck                       # Varsayılan profili açar
whatsuck --profile=is          # "İş" profilini açar
```

### Nasıl çalışır

Her profil kendi Electron partition'ında çalışır (`persist:<id>`), `~/.config/whatsuck/Partitions/<id>/` altında. `default` profil geriye uyumlu kalır — mevcut kullanıcılar upgrade sonrası oturumlarını kaybetmez.

```
~/.config/whatsuck/
├── profiles.json              # Profil metadata
├── Cookies                   # Default profil çerezleri
├── Local Storage/            # Default profil storage
├── IndexedDB/                # Default profil database
└── Partitions/
    ├── is/
    │   ├── Cookies
    │   └── Local Storage/
    └── freelance/
        └── ...
```

---

## 🔒 Güvenlik ve Gizlilik

### Ne saklanıyor?

| Veri | Şifreleme |
|---|---|
| Çerezler (session token) | Mümkünse OS keyring ile şifrelenir |
| IndexedDB / LocalStorage | Düz metin (LevelDB/SQLite) |
| Uygulama tercihleri | Düz metin |

### Kim okuyabilir?

| Erişim seviyesi | Risk |
|---|---|
| Siz (kullanıcı) | Tam erişim |
| Aynı makinedeki diğer kullanıcılar | `0700`/`0600` Unix izinleriyle korunur |
| `sudo` / root | Her şeyi okuyabilir |
| Çalıntı disk (FDE yok) | Her şeyi okuyabilir |
| Çalıntı disk (LUKS) | Disk şifrelemesiyle korunur |

**Önerilen**: Tam disk şifrelemesi (LUKS). İlk açılışta keyring kontrolü `libsecret` / `gnome-keyring` yoksa uyarır.

### Mimari

- Her pencere: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webviewTag: false`
- Profil dialog: preload + `contextBridge` — renderer'ın Node.js erişimi yok
- Bildirimler: saniyede en fazla 1 ile sınırlı (DoS koruması)
- Güncellemeler: HTTPS + SHA512 doğrulama
- İzinler: yalnızca `notifications` verilir
- Dış linkler: yalnızca `http`/`https` ve WhatsApp dışı hostlar `shell.openExternal`'a yönlendirilir

### Güvenlik açığı bildirimi

GitHub'da özel güvenlik danışmanlığı açın veya `yucOx@users.noreply.github.com` adresine e-posta gönderin. Lütfen güvenlik açıkları için public issue açmayın.

---

## 🛠️ Geliştirici

```bash
git clone https://github.com/yucOx/whatsuck.git
cd whatsuck
npm install
npm start        # geliştirme modu (auto-update ve keyring atlanır)
npm run build    # dist/whatsuck_1.0.2_amd64.deb üretir
```

Modül haritası için [ARCHITECTURE.md](ARCHITECTURE.md)'ye bakın.

---

## ❓ SSS

**Bildirimler gelmiyor.** `libnotify-bin` kurulu olmalı: `sudo apt install libnotify-bin`. Minimal Ubuntu Server'da notification daemon çalışmıyor olabilir.

**Yanlışlıkla profil sildim.** Geri alma yok — oturum verisi gitti. Profili yeniden oluşturup QR kodu tarayın.

**WhatsApp "tarayıcı desteklenmiyor" diyor.** Bundled Chromium çok eski olabilir. Uygulama güncellemesini bekleyin veya issue açın.

**Çoklu hesap çalışmıyor.** Her profil benzersiz bir telefon numarası gerektirir. WhatsApp Web her oturum için tek numara zorunlu tutar, partition'lar tam da bunu sağlar.

**Otomatik güncelleme çalışmıyor.** `~/.config/whatsuck/Updater/` dizinindeki log'a bakın. Release'de `.deb` eklenmemiş olabilir.

**Mac'e kurabilir miyim?** Henüz değil — sadece Ubuntu/Debian `.deb` üretiliyor. Windows desteği yol haritasında.

---

## 🗺️ Yol Haritası

- [ ] macOS ve Windows buildleri
- [ ] Profil başına bildirim sesi
- [ ] Tepsi ikonu (okunmamış badge ile)
- [ ] Tüm pencereler kapanınca çık (isteğe bağlı)
- [ ] Tüm profillerde tek pencerede arama
- [ ] Tema özelleştirmesi

---

## 🤝 Katkıda Bulunma

PR kabul edilir. Kod tabanı küçük (`src/`'de 14 dosya, ~700 LOC); modül haritası için [ARCHITECTURE.md](ARCHITECTURE.md)'ye bakın. PR açmadan önce:

1. `npm run build` çalıştırın, `.deb`'in hâlâ kurulabildiğini doğrulayın
2. Değişikliğinizi dev modda test edin (`npm start`)
3. Büyük değişiklikler için önce issue açın

Bug raporları: `whatsuck --version` çıktısı, Ubuntu sürümünüz ve nasıl yeniden üretileceği ile issue açın.

Katkı rehberi için [CONTRIBUTING.md](CONTRIBUTING.md), topluluk standartları için [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## 📄 Lisans

MIT — [LICENSE](LICENSE) detayları.