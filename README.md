# FontCraft

<div align="center">
  <img src="https://raw.githubusercontent.com/RipperHybrid/FontCraft/Master/.github/resources/banner.png" width="60%" alt="FontCraft Banner">
  <br>
  <img src="https://img.shields.io/badge/Compatible%20with-Magisk%20%7C%20KernelSU%20%7C%20APatch-blueviolet" alt="Compatibility Badge">
  <br>

  <a href="https://github.com/RipperHybrid/FontCraft/releases/latest">
    <img src="https://img.shields.io/github/v/release/RipperHybrid/FontCraft?label=Latest%20Release&logo=git&logoColor=white&color=18673F&labelColor=2E2E3F&style=flat" alt="Latest Release">
  </a>

  <a href="https://fontcraft.pages.dev/">
    <img src="https://img.shields.io/website?url=https%3A%2F%2Ffontcraft.pages.dev&up_message=Online&style=flat&logo=cloudflare&label=Cloudflare%20Page&color=F38020&logoColor=white" alt="Website Status">
  </a>
  <br>

  <a href="https://github.com/RipperHybrid/FontCraft">
    <img src="https://img.shields.io/github/commit-activity/t/RipperHybrid/FontCraft?label=Total%20Commits&logo=git&logoColor=white&color=18673F&labelColor=2E2E3F&style=flat" alt="Total Commits">
  </a>
  <a href="https://github.com/RipperHybrid/FontCraft/commits/main">
    <img src="https://img.shields.io/github/last-commit/RipperHybrid/FontCraft?label=Last%20Commit&logo=git&logoColor=white&color=18673F&labelColor=2E2E3F&style=flat" alt="Last Commit">
  </a>
  <br>

  <a href="https://github.com/RipperHybrid/FontCraft/releases">
    <img src="https://img.shields.io/github/downloads/RipperHybrid/FontCraft/total?label=Total%20Downloads&logo=github&logoColor=orange&color=18673F&labelColor=2E2E3F&style=flat" alt="Total Downloads">
  </a>
</div>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Orbitron&weight=500&pause=700&color=41F791&center=true&vCenter=true&width=935&height=70&lines=Now+featuring+a+full+WebUI!;Offline+Support+Added!;Native+KSU+and+APatch+Support.)](https://git.io/typing-svg)

---

## 📖 About

**FontCraft** is a font/emoji module with a fully interactive **WebUI**. Browse, download, and flash fonts with a modern, touch-friendly interface.

### ✨ Key Features
- **WebUI Interface:** Visual browser with preview images
- **File Size Display:** See sizes in download modal (KB/MB/GB)
- **Retro Default Theme:** Warm amber/orange with black backgrounds
- **Offline Support:** Install local `.ttf` files without internet
- **Custom Repositories:** Add your own JSON sources
- **Hybrid Queue:** Select Font + Emoji simultaneously
- **File Selector:** Browse and select local files
- **Live Terminal:** Real-time installation output
- **GMS Cleaner:** Disable Google font overriding
- **Universal:** Magisk | KernelSU | APatch

## 🎨 Gallery & Asset Showcase

Want to see exactly what's available before you install? We maintain an automatically updated visual catalog of every font and emoji pack currently in the remote library.

> **[👉 Full Font & Emoji Preview](Preview.md)**

---

## 🚀 Roadmap (To-Do)

* [x] ~~**Custom Repository Support**~~
* [x] ~~**Offline Installation Support**~~
* [x] ~~**Magisk WebUI Support**~~
* [ ] **More Font Sources**

## 📥 How WebUI Works
1.  **Open Module:** Launch from "Modules" tab in your manager
2.  **Browse Library:** Switch between **Emoji** and **Fonts** tabs
3.  **Custom Import:** Use "Custom Font" card for local `.ttf` files
4.  **Queue & Flash:** Select items and hit **"Flash Module"**
5.  **Reboot:** Restart to see changes

## 🛠 Requirements
- Rooted device
- KernelSU | APatch | Magisk (or any compatible fork)
- Internet for online browsing (offline for local files)

## 📌 Installation
1. Download latest release zip
2. Install via root manager
3. Open WebUI from modules tab
4. Select and flash your fonts

## ❓ FAQ

**Q: How do I restore default font?**
A: Uninstall the module and reboot.

**Q: My emojis aren't showing up (Android 12+)?**
A: There are two common reasons for this. Try these steps:
1.  **Zygisk Next Users:** If you are using Zygisk Next 1.3.0+, you may need the `FontLoader` module fix. [Download Here](https://t.me/real5ec1cff/265).
2.  **Google Override:** Google Play Services often forces its own fonts. Go to the Module Action button and run it. This will disable the GMS font provider and clear the cache.

**Q: Can I use my own files offline?**
A: Yes! Use the "Custom Font" card.

## 🔗 Credits
- **jq Binary** – [jq](https://jqlang.org)
- **zip Binary** – [zip](https://infozip.sourceforge.net)
- **Cloudflare** – [Pages](https://pages.cloudflare.com/) (Web Page Hosting & Update System)

> **Note:** All fonts and emojis belong to their respective creators. This repository acts as a distribution point for legally shareable assets. If you're a copyright holder and wish to have your content removed, please contact the maintainer.

> **Disclaimer:** FontCraft modifies system files (systemlessly). Always ensure you have a backup before flashing custom modules.

---

## 🔄 Backup Plans & Resilience

<details>
<summary><strong>Infrastructure Redundancy</strong></summary>
<br>

Following a recent temporary suspension of this account, I have updated the infrastructure to prevent future disruptions:

1.  **Updates:** The update check has moved to **Cloudflare**. Your module will check for updates reliably, regardless of GitHub's status.
2.  **Mirrors:** This repository is fully synchronized with [**GitLab**](https://gitlab.com/RipperHybrid/FontCraft).

</details>

---

<div align="center">
    <sub>👤 Author <strong>AshBorn</strong> • <a href="https://github.com/RipperHybrid"><strong>@RipperHybrid</strong></a></sub>
</div>