# Whatsuck 🟢

> **WhatsApp Web, native bir Ubuntu masaüstü uygulaması olarak.**
> Aynı anda birden fazla WhatsApp hesabı. Her hesap tamamen izole.
> Bildirimler, masaüstü kısayolları, otomatik güncelleme — hepsi dahil.

[![GitHub release](https://img.shields.io/github/v/release/yucOx/whatsuck)](https://github.com/yucOx/whatsuck/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Ubuntu](https://img.shields.io/badge/platform-Ubuntu%20%7C%20Debian-E95420?logo=ubuntu)](https://ubuntu.com)
[![Electron: 35](https://img.shields.io/badge/electron-35-47848F?logo=electron)](https://www.electronjs.org/)

**[🇬🇧 English documentation](README.md)**

---

## Neden Whatsuck?

Tarayıcı sekmesinde WhatsApp Web kullanmak işe yarar — ama:

- ❌ Sekmeyi kapatırsan bildirimler gelmez
- ❌ Aynı anda iki numara kullanamazsın
- ❌ WhatsApp'ın "works with Google Chrome 85+" uyarısı çıkar
- ❌ Tarayıcı kapandığında oturum kaybolur

**Whatsuck bunların hepsini çözer:**

- ✅ Her mesaj için gerçek OS bildirimi (libnotify / GNOME / KDE)
- ✅ Birden fazla profil — birden fazla WhatsApp hesabı, aynı anda
- ✅ Electron Chromium ile stabil rendering, uyarı yok
- ✅ Profil başına izole oturum, çerezler OS keyring ile şifrelenir
- ✅ Sistem tepsisi, masaüstü kısayolları, otomatik güncelleme

---

## Özellikler

### 💬 WhatsApp için her şey

- **Gerçek bildirimler** — gelen mesajlar OS notification center'a düşer, Whatsuck ikonuyla
- **Çoklu profil** — birden fazla WhatsApp hesabı, her biri kendi izole oturumunda (cookies, localStorage, IndexedDB)
- **Masaüstüne sabitle** — her profili GNOME/KDE uygulama menüsüne "Whatsuck (İş)" gibi pinle
- **Varsayılan profil** — `whatsuck`'ı açtığında hangi hesap gelsin sen seç

### 🔐 Güvenlik

- **Otomatik güncelleme** — yeni sürüm çıktığında arka planda indirir, restart edince kurar
- **OS keyring** — session cookie'leri GNOME Keyring / KWallet ile şifrelenir (varsa)
- **Sert webPreferences** — `contextIsolation`, `sandbox`, `webSecurity=true` hepsi açık
- **İzolasyonlu dialog** — preload script + contextBridge, Node.js'e renderer erişimi yok
- **SHA512 doğrulama** — güncellemeler hash kontrolüyle doğrulanır
- **Dış linkler** — WhatsApp'taki linkler varsayılan tarayıcında açılır, uygulama içinde değil

### ⚙️ Teknik

- **Menü çubuğu her zaman görünür** — View menüsünden gizleyebilirsin, Alt ile geri getirirsin
- **Klavye kısayolları** — `Ctrl+R` reload, `Ctrl+N` yeni pencere, `F12` DevTools
- **CLI profiller** — `whatsuck --profile=is` ile belirli profili aç
- **Düşük yüzey** — telemetry yok, analytics yok, ekstra bağımlılık yok
- **~85 MB** — tek dosya `.deb` içinde bütün Electron runtime

---

## Kurulum

### Kolay yol (önerilir)

Yazılım bilmenize gerek yok. Sadece şunu çalıştırın:

```bash
git clone https://github.com/yucOx/whatsuck.git
cd whatsuck
./setup.sh
```

Kurulum scripti sizin için her şeyi yapar:
- ✅ `git`, `node`, `npm` kurulu mu kontrol eder (değilse ne kurmanız gerektiğini söyler)
- ✅ npm paketlerini yükler
- ✅ `.deb` paketini derler
- ✅ Sisteminize kurar
- ✅ Whatsuck uygulama menüsünde görünür

### Manuel kurulum

Önceden derlenmiş `.deb` indirmek istiyorsanız: [Releases sayfası](https://github.com/yucOx/whatsuck/releases)

```bash
sudo dpkg -i whatsuck_1.0.0_amd64.deb
sudo apt-get install -f   # eksik bağımlılıkları tamamla
```

Uygulama menüsünde **Whatsuck**'ı arayın.

### Kaldırma

```bash
./setup.sh --uninstall    # hem uygulamayı hem session verisini siler
```

veya manuel:

```bash
sudo apt remove whatsuck
rm -rf ~/.config/whatsuck                  # session verisi
rm ~/.local/share/applications/whatsuck-*.desktop  # pinlenmiş kısayollar
```

---

## Çoklu WhatsApp Hesabı

Whatsuck'in en güçlü özelliği. Aynı anda iki (veya daha fazla) WhatsApp hesabı kullanın — birbirinden tamamen izole.

### Profil menüsü

Uygulama menüsünde **Profiles**'a tıklayın:

| Seçenek | Ne yapar |
| --- | --- |
| **New Profile…** | Yeni profil oluşturur, ayrı bir WhatsApp penceresi açar |
| **Rename…** | Mevcut profilin görünen adını değiştirir |
| **Delete** | Profilin tüm oturum verisini siler (geri alınamaz!) |
| **Set as Default** | `whatsuck` komutuyla hangi profil açılsın |
| **Pin to Desktop** | Profili uygulama menüsüne sabitle |

### Komut satırından

```bash
whatsuck                       # Varsayılan profili açar
whatsuck --profile=is          # "İş" profilini açar
```

### Nasıl çalışır

Her profil kendi Electron partition'ında çalışır. Çerezler, IndexedDB ve HTTP cache ayrı dizinlerde tutulur:

```
~/.config/whatsuck/
├── profiles.json           # Profil metadata
├── Cookies                 # default profil çerezleri
├── Local Storage/          # default profil storage
├── IndexedDB/              # default profil database
└── Partitions/
    ├── is/
    │   ├── Cookies
    │   └── Local Storage/
    └── freelance/
        └── ...
```

`default` profil geriye uyumlu — mevcut kullanıcılar upgrade sonrası oturumlarını kaybetmez.

---

## Güvenlik

### Ne saklanıyor?

| Veri | Şifreleme |
| --- | --- |
| Çerezler (session token) | Mümkünse OS keyring ile şifrelenir |
| IndexedDB / LocalStorage | Düz metin (LevelDB/SQLite) |
| Uygulama tercihleri | Düz metin |

### Kim okuyabilir?

| Erişim seviyesi | Risk |
| --- | --- |
| Siz (kullanıcı) | Tam erişim |
| Aynı makinedeki diğer kullanıcılar | `0700`/`0600` Unix izinleriyle korunur |
| `sudo` / root | Her şeyi okuyabilir |
| Çalıntı disk (FDE yok) | Her şeyi okuyabilir |
| Çalıntı disk (LUKS) | Disk şifrelemesiyle korunur |

**Önerilen**: Tam disk şifrelemesi (LUKS) kullanın. Keyring kontrolü ilk açılışta uyarır.

### Mimari

- Her pencere `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` ile çalışır
- Profil dialog'u `preload` + `contextBridge` ile izole; renderer'da Node.js erişimi yok
- Bildirimler saniyede bir ile sınırlı (spam koruması)
- Güncellemeler HTTPS + SHA512 ile doğrulanır
- İzinler: yalnızca `notifications` izni verilir
- Dış linkler: `http`/`https` ve `web.whatsapp.com` dışı hostlar varsayılan tarayıcıda açılır

---

## Geliştirici

```bash
npm install
npm start        # geliştirme modu (auto-update atlanır)
npm run build    # .deb derler
```

### Modül yapısı

```
src/
├── main.js                  # Entry point, lifecycle, multi-window
├── window.js                 # BrowserWindow, partitions, UA spoofing
├── profiles.js               # Profil metadata store
├── desktop.js                # .desktop file yönetimi
├── profile-dialog.js         # Modal text input dialog
├── profile-dialog-preload.js # Preload — contextBridge, no nodeIntegration
├── menu.js                   # Uygulama menüsü
├── notifications.js          # Bildirim köprüsü (rate-limited)
├── security.js               # Keyring kontrolü
├── updater.js                # Otomatik güncelleme (SHA512)
├── browser-check.js          # Chromium güncellik uyarısı
└── constants.js              # Config
build/
└── afterPack.js              # Wrapper script generator
```

---

## Lisans

MIT — detaylar için [LICENSE](LICENSE).