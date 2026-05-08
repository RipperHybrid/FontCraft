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

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Orbitron&weight=500&pause=700&color=41F791&center=true&vCenter=true&width=935&height=70&lines=Now+featuring+a+Vite-powered+WebUI!;Dynamic+XML+Injection+Added!;Native+KSU,+Magisk,+and+APatch+Support.)](https://git.io/typing-svg)

---

## 📖 About

**FontCraft** is an advanced font and emoji engine for Android. Powered by a fully interactive localhost WebUI, it allows you to dynamically browse, download, and seamlessly inject `.ttf` files systemlessly without ever leaving your root manager.

### ✨ Key Features
- **Vite-Powered WebUI:** Ultra-fast, modular frontend featuring a retro/glassmorphism design and real-time terminal output.
- **Dynamic XML Patching:** Automatically injects targets into `fonts.xml` and `font_fallback.xml` for maximum system-wide compatibility.
- **Hybrid Build Queue:** Select and flash both a Font and an Emoji pack simultaneously.
- **Custom Mirrors & Repositories:** Auto-detect the fastest download mirror, or input your own custom JSON library source.
- **True Offline Support:** Browse your internal storage and flash local `.ttf` files without an active internet connection.
- **GMS Font Cleaner:** Built-in utility to wipe out Google Play Services font overrides that break custom emojis.
- **Universal Root Architecture:** Native execution compatibility across Magisk, KernelSU, and APatch.

## 🎨 Gallery & Asset Showcase

Want to see exactly what's available before you install? We maintain an automatically updated visual catalog of every font and emoji pack currently in the remote library.

> **[👉 View Full Font & Emoji Preview Gallery](Preview.md)**

---

## 🚀 Roadmap

* [x] **Custom Repository Support**
* [x] **Offline Installation Support**
* [x] **Magisk & APatch WebUI Support**
* [ ] **Expand Core Font Sources**

## 📥 Usage Guide

**1. Initial Setup (Flashing)**
Flash the module zip in your root manager (Magisk, KernelSU, or APatch). The installer will trigger a volume-key menu. Use your volume buttons (or tap the screen) to select your preferred mode. **WebUI Mode** is highly recommended.

**2. The WebUI Flow**
If you selected the WebUI, a local server will start and open your browser automatically.
- Browse the library or select a local `.ttf` from your storage.
- Add your chosen Font and/or Emoji to the build queue.
- Tap **Flash Module** and monitor the live terminal.
- Reboot via the floating action button when finished.

**3. Post-Install Management (Action Script)**
Need to change fonts later, open the WebUI again, or run the GMS cache cleaner?
- **Magisk & KernelSU:** Tap the **Action** button on the FontCraft module card in your root manager app to launch the interactive script menu.
- **APatch (or unsupported managers):** Simply re-flash the module zip to trigger the initial setup menu again without losing your previous configuration.

## 🛠 Requirements
- A rooted Android device.
- Magisk, KernelSU, or APatch installed.
- Internet connection (for online library browsing). *Local file flashing works fully offline.*

## ❓ FAQ

**Q: How do I restore my default system font?**
A: Simply disable or uninstall the FontCraft module in your root manager and reboot your device.

**Q: My emojis aren't showing up (Android 12+)?**
A: There are two common reasons for this. Try these fixes:
1.  **Google Override:** Google Play Services often forces its own fonts. Execute the FontCraft Action script in your root manager and run the **"Clean GMS Fonts"** tool to purge the cache.
2.  **Zygisk Next Users:** If you are using Zygisk Next 1.3.0+, you may need the `FontLoader` module fix. [Download Here](https://t.me/real5ec1cff/265).

**Q: Can I use my own files offline?**
A: Absolutely. Tap the "Storage" button on the Custom Font/Emoji card to open the file selector and navigate to your local `.ttf` files.

## 🔗 Credits
- **jq** – [jqlang.org](https://jqlang.org)
- **zip** – [infozip.sourceforge.net](https://infozip.sourceforge.net)
- **Cloudflare** – [Pages](https://pages.cloudflare.com/) (Web Page Hosting & Update System)

> **Note:** All fonts and emojis belong to their respective creators. This repository acts as a distribution point for legally shareable assets. If you are a copyright holder and wish to have your content removed, please contact the maintainer.

> **Disclaimer:** FontCraft modifies system files systemlessly. Always ensure you have a fallback method to disable modules in case of a bootloop.

---

## 🔄 Resilience & Backup Infrastructure

<details>
<summary><strong>Infrastructure Redundancy details</strong></summary>
<br>

Following a recent temporary suspension of this account, the infrastructure has been updated to prevent future disruptions:

1.  **Updates:** The update verification system has been migrated to **Cloudflare**. Your module will check for updates reliably, regardless of GitHub's server status.
2.  **Mirrors:** This repository is fully synchronized and backed up via [**GitLab**](https://gitlab.com/RipperHybrid/FontCraft).

</details>

---

<div align="center">
    <sub>👤 Author <strong>AshBorn</strong> • <a href="https://github.com/RipperHybrid"><strong>@RipperHybrid</strong></a></sub>
</div>