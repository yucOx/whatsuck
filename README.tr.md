<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Whatsuck ikonu">
</p>

<h1 align="center">Whatsuck</h1>

<p align="center">
  <strong>İki veya daha fazla WhatsApp numarasını tek Ubuntu masaüstünde çalıştır.</strong><br>
  Her hesap çevrimiçi kalan izole bir oturumdur — tek tıkla geç, QR yeniden tarama yok, ikinci tarayıcı veya gizli pencere karmaşası yok. Ayrıca gerçek OS bildirimleri, sesli/görüntülü arama, otomatik güncelleme ve keyring ile şifrelenmiş oturumlar — hepsi tek ~85 MB pakette.
</p>

<p align="center">
  <a href="https://github.com/yucOx/whatsuck/releases"><img src="https://img.shields.io/github/v/release/yucOx/whatsuck?style=flat-square" alt="Release"></a>
  <a href="https://github.com/yucOx/whatsuck/actions/workflows/release.yml"><img src="https://img.shields.io/github/actions/workflow/status/yucOx/whatsuck/release.yml?style=flat-square" alt="Build"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/yucOx/whatsuck?style=flat-square" alt="License"></a>
  <a href="https://github.com/yucOx/whatsuck/releases"><img src="https://img.shields.io/github/downloads/yucOx/whatsuck/total?style=flat-square" alt="Downloads"></a>
  <a href="https://github.com/yucOx/whatsuck/issues"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PR Welcome"></a>
  <a href="https://github.com/yucOx/whatsuck"><img src="https://img.shields.io/github/last-commit/yucOx/whatsuck?style=flat-square" alt="Son commit"></a>
</p>

<p align="center">
  <a href="README.md">🇬🇧 English</a> ·
  <a href="README.tr.md">🇹🇷 Türkçe</a>
</p>

> **WhatsApp veya Meta ile bağlantılı değildir.** Whatsuck bağımsız,
> açık kaynak bir Electron zarfıdır ve `web.whatsapp.com`'u sarar.
> WhatsApp, Meta Platforms, Inc. ticari markasıdır. Bu proje
> WhatsApp'tan veri almaz ve kimseye veri göndermez — tarayıcıda
> açacağınız aynı web sayfasının ince bir zarfıdır.

---

## Neden Whatsuck?

Bir tarayıcı sekmesi WhatsApp masaüstü deneyiminin çoğunu verir — gerçekten onun içinde yaşamaya çalışana kadar.

| Tarayıcı sekmesi | Whatsuck |
|---|---|
| ❌ Sekmeyi kapat, bildirimler gider | ✅ Arka plan processi, bildirimler hep açık |
| ❌ Bir anda tek WhatsApp numarası | ✅ Birden çok izole profil, anında geçiş |
| ❌ "Chrome 85+ ile çalışır" uyarısı | ✅ Gömülü Chromium (Electron 35.7.5), uyarı yok |
| ❌ Tarayıcı sıfırlamasında çerezler silinir | ✅ OS keyring ile şifrelenir, restartlarda korunur |
| ❌ Uygulama menüsünde kayıt yok | ✅ Profil başına gerçek `.desktop` entegrasyonu |
| ❌ Otomatik güncelleme yok | ✅ Arka planda indirir, çıkışta kurar, SHA512 doğrulamalı |
| ❌ Sohbeti kapatmak seni "online" tutar | ✅ İsteğe bağlı Esc-on-minimize sohbetten çıkarır |

Öne çıkan özellik **tek uygulamada birden çok WhatsApp hesabı**. Her profil tamamen izole bir oturumdur (ayrı çerezler, localStorage, IndexedDB, HTTP önbelleği), böylece kişisel numaran ile iş numaranı bir tık uzağa koyabilirsin — gizli pencere, ikinci tarayıcı veya çıkış yapma olmadan. Bir anda tek profil görünür; her profilin penceresi arka planda canlı kaldığı için geçiş anındır.

---

## ✨ Özellikler

### 💬 WhatsApp için

- **Çoklu profil** — iki veya daha fazla WhatsApp hesabı, her biri kendi izole Electron partition'ında. Menüden, tray'den veya CLI'dan geç
- **Yapılandırılabilir layout** — Ayarlar'dan profil görüntüleme: **Switch** (tek görünür, varsayılan), **Tabs** (tek pencere, Chrome gibi sekme çubuğu) veya **Windows** (her profil ayrı pencere, yan yana)
- **Profil aç…** — `Ctrl+T` veya tray menüsü profil seçici açar; mevcut hesabı kapatmadan başka hesap aç
- **Masaüstüne sabitle** — herhangi bir profili "Whatsuck (Work)" olarak uygulama menüsüne sabitle
- **Açılış profili** — sade launch'te hangi hesabın açılacağını seç (Ayarlar → *Açılışta bu profili aç*)
- **Gerçek bildirimler** — gelen mesajlar OS bildirim merkezine (libnotify / GNOME Shell / KDE) Whatsuck ikonuyla düşer; bildirime tıklamak doğru pencereyi öne getirir
- **Yapılandırılabilir bildirimler** — aç/kapa, ses aç/kapa ve bildirim başına cooldown (varsayılan 1/sn) ile DoS koruması
- **Sesli/görüntülü arama** — ilk arama mikrofon/kamera erişimi ister (İzin Ver/Reddet, cihaz başına hatırlanır); her birini Ayarlar'dan ayrı aç/kapa
- **Harici linkler** — sohbetteki URL'ler uygulama içinde değil varsayılan tarayıcıda açılır

### 🖥️ Sistem entegrasyonu

- **Sistem trayi** — pencereyi kapat uygulamayı arka planda çalıştırır; tray sağ-tık menüsü her profili listeler, oradan geçiş/geri getirme yapabilirsin
- **Tek instance** — uygulama başlatıcısına tekrar tıklamak ikinci bir kopya açmak yerine mevcut pencereyi odaklar
- **Minimize-to-dock yedeği** — tray olmayan sistemlerde (AppIndicator'sız GNOME Wayland) pencereyi kapatmak taskbar'a minimize eder, çıkmaz
- **Esc-on-minimize** — minimize ettiğinde isteğe bağlı Esc basar, WhatsApp seni son sohbette "içinde" tutmaz
- **Kapat düğmesi davranışı** — varsayılan (tray'e gizle) veya X düğmesinin uygulamayı tamamen çıkarması

### 🔐 Güvenlik

- **Otomatik güncelleme** — GitHub releases'i kontrol eder, arka planda indirir, `electron-updater` ile SHA512 doğrular
- **OS keyring** — oturum çerezleri mümkün olduğunda GNOME Keyring / KWallet ile şifrelenir; `libsecret` yoksa ilk açılışta uyarı verilir
- **Katı sandbox** — `contextIsolation`, `sandbox`, `webSecurity=true`, `nodeIntegration` yok, `webviewTag` yok
- **İzole diyaloglar** — profil girişi ve Ayarlar penceresi preload + `contextBridge` kullanır; renderer'ların Node.js erişimi sıfırdır
- **Kilitli izinler** — `notifications` ve `media` (mikrofon/kamera) Ayarlar'a bağlı; diğer tüm izinler reddedilir. İlk medya kullanımında İzin Ver/Reddet sorulur, cevap hatırlanır
- **Harici linkler** — yalnızca `http`/`https` ve WhatsApp dışı hostlar uygulamadan `shell.openExternal` ile çıkar

### ⚙️ Teknik

- **Gömülü Chromium** — Electron 35.7.5, Chromium ~134. Stabil Chrome'dan 2+ major geride kalırsa eskime uyarısı verilir
- **Sade JavaScript** — TypeScript yok, bundler yok, transpile yok. `src/` baştan sona okunabilir düz Node
- **UA spoofing** — WhatsApp Web'in "Chrome 85+ ile çalışır" gate'i Electron'un varsayılan UA'sını reddeder; standart bir Linux Chrome UA'sını hem session hem webContents seviyesinde spooflarız
- **Sağlam I/O** — bozuk `profiles.json` / `settings.json` otomatik yedeklenir ve yeniden tohumlanır, crash loop olmaz
- **Atomik yazım** — tüm store'lar `.tmp`'ye yazar sonra `rename`
- **Kısayollar** — `Ctrl+R` reload, `Ctrl+N` yeni pencere, `F12` DevTools
- **CLI** — `whatsuck --profile=work` belirli bir hesabı açar

---

## 📦 Kurulum

### Tek komut (önerilen)

Git, node veya npm gerekmez — sadece `curl` veya `wget`:

```bash
curl -sL https://raw.githubusercontent.com/yucOx/whatsuck/main/setup.sh | bash -
```

Ya da klonla ve lokal çalıştır:

```bash
git clone https://github.com/yucOx/whatsuck.git
cd whatsuck
./setup.sh
```

Setup betiği `curl`/`wget` ve `dpkg` kontrol eder, GitHub releases'ten son `.deb`'i indirir, sistem geneline kurar ve `apt-get install -f` ile runtime bağımlılıkları çözer. Whatsuck uygulama menünde belirir.

### Manuel kurulum

```bash
sudo dpkg -i whatsuck_1.0.9_amd64.deb
sudo apt-get install -f   # eksik runtime bağımlılıklarını çöz
```

### Kaldırma

```bash
./uninstall.sh
```

Kaldırıcı, WhatsApp oturum verisini (profiller, çerezler, girişler) saklayıp saklamayacağını ve pinlenmiş profil kısayollarının kaldırılıp kaldırılmayacağını etkileşimli sorar. Veriyi tutarsan yeniden kurulumda oturumların korunur.

---

## 📋 Gereksinimler ve uyumluluk

| | |
|---|---|
| **OS** | Ubuntu 22.04 / 24.04, Debian 12 (x86_64). Diğer Debian-türevleri çalışabilir ama test edilmemiştir |
| **Paket** | Yalnızca `.deb` (macOS/Windows yol haritasında) |
| **Kurulum bağımlılığı** | `curl` veya `wget`, `dpkg`, `sudo` |
| **Bildirimler** | `libnotify-bin` (çoğunlukla önceden kurulu); çalışan bir bildirim daemon'ı |
| **Çerez şifreleme** | `libsecret` + GNOME Keyring veya KWallet (isteğe bağlı — yoksa uyarıyla plaintext'e düşer) |
| **Tray ikonu** | X11 kutudan çıkar. GNOME Wayland'de `libayatana-appindicator3-1` ve *AppIndicator* uzantısını kur, yoksa tray devre dışı kalır ve kapatma taskbar'a minimize eder |

Runtime bağımlılıklarını tek seferde:

```bash
sudo apt install libnotify-bin libsecret-1-0 gnome-keyring libayatana-appindicator3-1
```

---

## 👥 Birden çok WhatsApp hesabı

Her profil tamamen izole bir WhatsApp oturumudur. Menü çubuğundan (**Profiller**) veya tray ikonuna sağ-tıklayıp profil seçerek geç. Bir anda tek pencere görünür; diğerleri arka planda canlı kalır.

| Menü öğesi | Ne yapar |
|---|---|
| Yeni Profil… | Yeni oturum oluşturur ve taze bir WhatsApp penceresi açar |
| Yeniden Adlandır… | Geçerli profilin görünen adını değiştirir |
| Sil | Profilin oturum verisini kalıcı olarak siler |
| Varsayılan Yap | Sade launch'te hangi profilin açılacağı (Ayarlar'dan da ayarlanır) |
| Masaüstüne Sabitle | Profile bir `.desktop` kaydı ekler; uygulama başlatıcısında belirir |

### Komut satırı

```bash
whatsuck                       # Açılış profilini açar (Ayarlar veya varsayılan)
whatsuck --profile=work        # "work" profilini açar (Ayarlar'ı geçersiz kılar)
```

### Nasıl çalışır

Her profil kendi Electron partition'ında (`persist:<id>`) çalışır, `~/.config/whatsuck/Partitions/<id>/` altında saklanır. `default` profili geriye uyumluluk için `session.defaultSession` kullanır — mevcut kullanıcılar yükseltme sonrası oturumunu korur.

```
~/.config/whatsuck/
├── profiles.json              # Profil metaverisi
├── settings.json              # Kullanıcı ayarları (bildirimler, açılış, pencere davranışı)
├── Cookies                   # Varsayılan profil çerezleri
├── Local Storage/            # Varsayılan profil depolaması
├── IndexedDB/                # Varsayılan profil veritabanı
└── Partitions/
    ├── work/
    │   ├── Cookies
    │   └── Local Storage/
    └── side-hustle/
        └── ...
```

---

## ⚙️ Ayarlar

Tüm pencere için **Ayarlar → Ayarları Aç…**'ı aç, ya da Ayarlar menüsü altındaki hızlı toggles'ı kullan.

| Ayar | Ne kontrol eder |
|---|---|
| Bildirimler açık | OS bildirimleri ana anahtarı |
| Bildirim sesi | Her bildirimde ses çal (Linux'ta elden geldiğince; bazı masaüstleri `silent`'ı görmezden gelir) |
| Bildirimler arası min gecikme | ms cinsinden cooldown (varsayılan 1000) — patlamaları yavaşlatır |
| Mikrofon | WhatsApp Web sesli aramalarına izin/engel. İlk arama izin ister; buradan istediğiniz zaman değiştirir. Bir değişikliği kaydetmek uygulamayı yeniden başlatır; böylece WhatsApp cihazı yeniden ister |
| Kamera | WhatsApp Web görüntülü aramalarına izin/engel. İlk arama izin ister; buradan istediğiniz zaman değiştirir. Bir değişikliği kaydetmek uygulamayı yeniden başlatır; böylece WhatsApp cihazı yeniden ister |
| Açılışta bu profili aç | Sade launch'te hangi profil açılır (`--profile=` CLI geçersiz kılar) |
| Layout | Switch (tek görünür) / Tabs (tek pencere, Chrome gibi) / Windows (yan yana). Bir sonraki Profil Aç'ta etkili |
| Minimize'de Esc | Minimize ettiğinde Esc basar, açık sohbet seçimsiz kalır |
| Kapat düğmesi | *Tray'e gizle* (çalışmaya devam, varsayılan) veya *Uygulamadan çık* |

Ayarlar `~/.config/whatsuck/settings.json`'da, varsayılanlarla deep-merge edilir; yeni seçenekler seçimlerini silmeden otomatik belirir.

---

## 🔔 Bildirimler nasıl çalışır

WhatsApp Web bildirimleri tarayıcı Notifications API'siyle oluşturur. Whatsuck bunları main-process seviyesinde yakalar:

1. Renderer, pencerenin `webContents`'inde bir `notification` event'i fırlatır.
2. Bridge `event.preventDefault()` çağırır; böylece Electron kendi bildirimini göstermez (bu bizim ayarlarımızı görmezden gelir ve click handler taşımaz).
3. Bildirimler açıksa, ses kapalıyken `silent: true` ile kendi `Notification`'ımızı yayınlarız, cooldown ile sınırlarız.
4. Bildirimin click handler'ı, tray'e gizli bile olsa doğru profil penceresini geri getirir ve öne taşır.

Bu yüzden "Bildirimler açık: kapalı" gerçekten durdurur ve bildirime tıklamak hiçbir şey yapmak yerine doğru pencereyi getirir.

---

## 🔒 Güvenlik ve gizlilik

### Diskte ne var

| Veri | Şifreleme |
|---|---|
| Çerezler (oturum token'ı) | Mümkün olduğunda OS keyring |
| IndexedDB / LocalStorage | Düz metin (LevelDB/SQLite) |
| Uygulama tercihleri (`profiles.json`, `settings.json`) | Düz metin |

| Erişim seviyesi | Risk |
|---|---|
| Sen (kullanıcın) | Tam erişim |
| Aynı makinede diğer kullanıcılar | `0700`/`0600` Unix izinleriyle korunur |
| `sudo` / root | Her şeyi okuyabilir |
| Çalınan disk (FDE yok) | Her şeyi okuyabilir |
| Çalınan disk (LUKS) | Tam disk şifrelemesiyle korunur |

**Önerilen**: tam disk şifrelemeyi aç. `libsecret` / `gnome-keyring` yoksa ilk açılışta uyarı verilir.

### Telemetri

**Yok.** Whatsuck hiçbir analytics, kullanım verisi veya crash raporu toplamaz. Tek ağ çağrıları:

- WhatsApp Web'in kendisi (tarayıcıda yükleyeceğin sayfa zaten)
- Güncelleme kontrolü için GitHub releases API'si (ve açılış başına bir kez Chromium eskime kontrolü için `googlechromelabs.github.io`)

Tüm oturum verisi `~/.config/whatsuck/` altında lokal kalır.

### Mimari (kısaca)

Her ana pencere `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webviewTag: false` ile oluşturulur. Profil diyalogu ve Ayarlar penceresi preload + `contextBridge` kullanır; renderer'lar Node.js'e erişemez. Yalnızca `notifications` ve `media` (mikrofon/kamera) izinleri verilir ve ikisi de Ayarlar'a bağlı — `media` ilk kullanımda izin ister, cevabı hatırlar. Diğer her şey reddedilir. Güncellemeler HTTPS + her GitHub release yanında yayınlanan `latest-linux.yml`'e karşı SHA512 hash doğrulaması. Tam modül haritası ve startup veri akışı için [ARCHITECTURE.md](ARCHITECTURE.md)'ye bak.

### Güvenlik açığı bildirimi

GitHub'da özel bir güvenlik danışmanlığı aç, veya `yucOx@users.noreply.github.com`'a e-posta at. Güvenlik hataları için public issue açma.

---

## 🛠️ Geliştirme

```bash
git clone https://github.com/yucOx/whatsuck.git
cd whatsuck
npm install        # Node 18+, npm
npm start          # dev modu (auto-update ve keyring uyarıları atlanır)
npm run build      # dist/whatsuck_1.0.9_amd64.deb üretir
```

Build önkoşulları: Node 18+, npm ve `dpkg` (electron-builder `.deb` için ona çıkar). Debian/Ubuntu'da zaten vardır.

Yamalamadan önce bilinmesi gereken birkaç bilinçli kısıtlama:
- Electron **35.7.5**'e tam sabitlenmiştir. Aralığı genişletme — küçük bir bump Chromium davranışını değiştirip UA spoof / WhatsApp gate'i bozabilir.
- `main.js` feature modülleri arası import yapmasına izin verilen tek modüldür; feature modülleri bağımsız kalır, döngüsel import olmaz.
- Henüz test framework'ü yok — gerçek bir WhatsApp hesabıyla manuel test gerilemeleri yakalar. Framework eklemek kendi PR'ı olmalı.

Modül haritası ve veri akışı için [ARCHITECTURE.md](ARCHITECTURE.md), katkı kılavuzu için [CLAUDE.md](CLAUDE.md), topluluk standartları için [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)'ye bak.

---

## 🚀 Release

Release'ler `v*` tag push'unda GitHub Actions ile otomatiktir:

```bash
# 1. package.json'da sürümü bumpla (ör. 1.0.8 → 1.0.9)
# 2. README.md ve README.tr.md'deki deb dosya adını güncelle
# 3. Commit, tag, push:
git commit -am "v1.0.9: değişiklik açıklaması"
git tag v1.0.9
git push origin main
git push origin v1.0.9
```

Actions `npm ci` → `npm run build` → `.deb` eklenmiş bir GitHub Release oluşturur. Aynı isimde tag'i silip yeniden oluşturma — yeniden tetiklemek gerekirse force-move et (`git tag -f`).

Kullanıcılar güncellemeyi `electron-updater` ile (açılışta kontrol, çıkışta kurar) veya `setup.sh`'i yeniden çalıştırarak alır.

---

## 🖼️ Ekran görüntüleri

<!-- screenshots/ dizinine PNG'ler koy ve yorumu aç:
![Ana pencere](screenshots/main.png)
![Tray profil listesi](screenshots/tray.png)
![Ayarlar penceresi](screenshots/settings.png)
-->

Ekran görüntüleri yakında. Uygulama penceresi WhatsApp Web; dikkat çekici UI yüzeyleri **Profiller** menüsü (geçiş / yeni / yeniden adlandır / sil / sabitle), **tray context menüsü** (profil listesi) ve **Ayarlar** penceresidir.

---

## ❓ SSS

**Bildirimler görünmüyor.** `libnotify-bin` kurulu olduğundan emin ol: `sudo apt install libnotify-bin`. Minimal Ubuntu Server'da bildirim daemon'ı çalışmıyor olabilir.

**Tray ikonu yok.** Muhtemelen AppIndicator'sız GNOME Wayland'desin. `sudo apt install libayatana-appindicator3-1` kur ve *AppIndicator* uzantısını etkinleştir, sonra yeniden başlat. Tray olmadan pencereyi kapatmak taskbar'a minimize eder.

**X düğmesi çıkarmıyor.** Tasarım gereği tray'e gizler (uygulama bildirimler için çalışmaya devam eder). X'in çıkarması için Ayarlar'da *Kapat düğmesi → Uygulamadan çık*'ı seç. Her halükarda **Ctrl+Q** veya **Dosya → Çık** anında çıkarır.

**İki profili aynı anda nasıl görebilirim?** Ayarlar → Layout'tan **Tabs** (tek pencere, sekme çubuğu) veya **Windows** (ayrı pencereler yan yana) seç. Varsayılan **Switch** tek gösterir. Layout değişikliği bir sonraki açtığın profilde etkili (açık pencereler canlı taşınmaz).

**Profil değiştirince iki pencere açılıyor.** Olmamalı — bir profil seç onu gösterir, gerisini gizler. İki görüyorsan eski bir build'desin; en son sürüme güncelle.

**Yanlışlıkla bir profili sildim.** Geri alma yok — oturum verisi gitti. Profili yeniden oluştur ve QR'ı tekrar tara.

**WhatsApp "tarayıcı desteklenmiyor" diyor.** Gömülü Chromium çok eski olabilir. Uygulama güncellemesini bekle veya bir issue aç.

**Çoklu hesap çalışmıyor.** Her profilin benzersiz bir telefon numarası olmalı. WhatsApp Web oturum başına tek numara zorlar; partition'lar tam bunu verir.

**Otomatik güncelleme bozuk.** İndirme logu için `~/.config/whatsuck/Updater/`'a bak. Release'ler eksikse GitHub release'inde `.deb` olmayabilir.

**Mac veya Windows'a kurabilir miyim?** Henüz hayır — yalnızca Ubuntu/Debian `.deb` build edilir. Çapraz platform yol haritasında.

---

## 🗺️ Yol haritası

- [ ] macOS ve Windows build'leri
- [ ] Okunmamış badge'li tray ikonu
- [ ] Profil başına bildirim kuralları
- [ ] Tek pencerede tüm profillerde arama
- [ ] Proper ekran görüntüsü seti

---

## 🤝 Katkıda bulunma

PR'ler welcome. Kod tabanı küçük (sade JavaScript, build adımı yok); modül haritası için [ARCHITECTURE.md](ARCHITECTURE.md)'ye bak. PR açmadan önce:

1. `npm run build` çalıştır ve `.deb`'in hâlâ kurulduğunu doğrula
2. Değişikliğini dev modunda test et (`npm start`)
3. Önemli değişiklikler için önce bir issue aç

Hata bildirimi: `whatsuck --version` çıktısı, Ubuntu sürümün ve nasıl yeniden üretileceğiyle bir issue aç.

---

## 📄 Lisans

MIT — [LICENSE](LICENSE)'e bak.

**Whatsuck WhatsApp veya Meta Platforms, Inc. ile bağlantılı, onaylı veya sponsorlu değildir.** "WhatsApp", Meta Platforms, Inc. ticari markasıdır. Bu proje, public `web.whatsapp.com` web uygulamasının bağımsız bir Electron zarfıdır ve veri toplamaz.