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

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Orbitron&weight=500&pause=700&color=41F791&center=true&vCenter=true&width=935&height=70&lines=Interactive+Localhost+WebUI!;Offline+Local+File+Flashing!;Native+KSU,+Magisk,+and+APatch+Support.)](https://git.io/typing-svg)

---

## 📖 About

**FontCraft** is a font and emoji engine for Android. It uses a local WebUI to let you browse, download, and systemlessly inject `.ttf` files straight from your root manager. No extra apps needed.

### ✨ Key Features
- **Local WebUI:** A clean, dark-themed functional interface featuring a neumorphic design, live terminal output, and an integrated debug console.
- **Dynamic File Selection:** Full internal storage browser to easily flash local `.ttf` files completely offline.
- **Hybrid Build Queue:** Queue up and flash both a custom Font and an Emoji pack simultaneously.
- **Custom Mirrors & Repositories:** Auto-detect the fastest download mirror or input your own custom JSON library source directly from the WebUI settings.
- **GMS Font Cleaner:** Built-in utility to remove Google Play Services font overrides that break custom emojis.
- **Universal Root Architecture:** Seamless execution across Magisk, KernelSU, and APatch.

## 🎨 Gallery & Asset Showcase

To keep the core engine lightweight, all fonts, emojis, and their visual previews are maintained in a dedicated, external library repository.

> **[👉 View Full Font & Emoji Preview Library](https://github.com/RipperHybrid/FontLib)**

---

## 🚀 Roadmap

* [x] **Custom Repository URL Support**
* [x] **Offline Storage File Picker**
* [x] **Magisk, KernelSU & APatch UI Integration**
* [x] **Expand Core Font Sources**

## 📥 Usage Guide

**1. Initial Setup (Flashing)**
Flash the module zip in your root manager (Magisk, KernelSU, or APatch). The installer will trigger a volume-key menu. Use your volume buttons (or tap the screen) to select your preferred mode. **WebUI Mode** is highly recommended.

**2. The WebUI Flow**
If you selected the WebUI, a local server will initialize and launch your browser automatically.
- Browse the remote library or use the "Storage" option to pick a local `.ttf` file.
- Add your chosen Font and/or Emoji to the build queue.
- Tap **Flash Module** and monitor the live terminal output.
- Tap the floating reboot button when the process completes.

**3. Post-Install Management**
Need to change fonts later, open the WebUI again, or run the GMS cache cleaner?
- **KernelSU & APatch:** Tap the **WebUI** button directly on the FontCraft module card in your root manager app.
- **Magisk:** Tap the **Action** button on the module card to launch the interactive script menu (which lets you start the WebUI or clean GMS).
- **Unsupported Managers:** Re-flash the module zip to trigger the initial setup menu again. This will not overwrite your existing configuration.

## 🛠 Requirements
- A rooted Android device.
- Magisk, KernelSU, or APatch installed.
- Internet connection (for remote library fetching). *Local file flashing works completely offline.*

## ❓ FAQ

**Q: How do I restore my default system font?**
A: Simply disable or uninstall the FontCraft module in your root manager and reboot your device.

**Q: My emojis aren't showing up (Android 12+)?**
A: There are two common reasons for this. Try these fixes:
1.  **Google Override:** Google Play Services often forces its own fonts. Execute the FontCraft Action script in your root manager and run the **"Clean GMS Fonts"** tool to purge the cache.
2.  **Zygisk Next Users:** If you are using Zygisk Next 1.3.0+, you may need the `FontLoader` module fix.

**Q: Can I use my own files offline?**
A: Absolutely. Tap the "Storage" button on the Custom Font/Emoji card to open the built-in file selector and navigate to your local `.ttf` files.

## 🔗 Credits
- **jq** – [jqlang.org](https://jqlang.org)
- **zip** – [infozip.sourceforge.net](https://infozip.sourceforge.net)
- **Cloudflare** – [Pages](https://pages.cloudflare.com/) (Web Page Hosting & Update System)

> **Note:** All fonts and emojis belong to their respective creators. This repository acts as a distribution engine for legally shareable assets. If you are a copyright holder and wish to have your content removed, please contact the maintainer.

> **Disclaimer:** FontCraft modifies system files systemlessly. Always ensure you have a fallback method to disable modules in case of a bootloop.

---

## 🔄 Resilience & Backup Infrastructure

<details>
<summary><strong>Infrastructure Redundancy details</strong></summary>
<br>

Following a recent temporary suspension of this account, the infrastructure has been updated to prevent future disruptions:

1.  **Updates:** The update verification system is routed through **Cloudflare**. Your module will check for updates reliably, regardless of GitHub's server status.
2.  **Mirrors:** This repository is fully synchronized and backed up via [**GitLab**](https://gitlab.com/RipperHybrid/FontCraft).

</details>

---

<div align="center">
    <sub>👤 Author <strong>AshBorn</strong> • <a href="https://github.com/RipperHybrid"><strong>@RipperHybrid</strong></a></sub>
</div>