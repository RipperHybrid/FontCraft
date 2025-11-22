# FontCraft

<p align="center">
  <img src="https://raw.githubusercontent.com/RipperHybrid/FontCraft/Master/.github/resources/banner.png" width="60%" alt="FontCraft Banner">
  <br>
  <img src="https://img.shields.io/badge/Compatible%20with-Magisk%20%7C%20KernelSU%20%26%20Forks-blueviolet" alt="Compatibility Badge">
  <br>
  
  <a href="https://github.com/RipperHybrid/FontCraft/releases/latest">
    <img src="https://img.shields.io/github/v/release/RipperHybrid/FontCraft?label=Latest%20Release&logo=git&logoColor=white&color=18673F&labelColor=2E2E3F&style=flat" alt="Latest Release">
    <img src="https://img.shields.io/github/license/RipperHybrid/FontCraft?label=License&logo=git&logoColor=white&color=18673F&labelColor=2E2E3F&style=flat" alt="License">
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
</p>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Orbitron&weight=500&pause=700&color=41F791&center=true&vCenter=true&width=935&height=70&lines=Now+featuring+a+full+WebUI!;Custom+Fonts,+Emojis,+and+Themes.;Native+KSU+Support.)](https://git.io/typing-svg)

## 🚀 Major Update: The WebUI Era
**FontCraft Pro** now features a fully interactive **WebUI** for KernelSU users. Browse, download, and flash fonts with a modern, touch-friendly interface designed for seamless customization.

> **⚠️ Compatibility Note:** The Full WebUI is available on **KernelSU** and any **KSU Fork** that supports the module WebUI standard. Magisk users will use the classic Volume Key interface or simply re-flash the module to change settings.

### ✨ Key Features
* **Interactive Web Interface:** Browse the remote library visually with preview images (KSU & Forks Only).
* **Hybrid Queue System:** Select a **Font** and an **Emoji** pack simultaneously and flash them in one go.
* **Integrated File Selector:** Have your own `.ttf` file? Use the built-in storage navigator to browse and select local font files directly within the interface.
* **Live Terminal Output:** Watch the installation process in real-time via the embedded terminal window.
* **GMS Cleaner:** Built-in action to disable Google Play Services font syncing if it overrides your custom emojis.
* **Theming Engine:** Choose your vibe with **Dark**, **Light**, and **Retro (Amber)** modes.
* **Universal Compatibility:**
    * ✅ **Magisk** (CLI Mode)
    * ✅ **KernelSU & Compatible Forks** (WebUI Mode)
    * ✅ **Android 15 (Tested on Nothing OS)**

## 📥 How WebUI Works (KernelSU)
1.  **Open the Module:** Launch the FontCraft WebUI from the "Modules" tab in your manager.
2.  **Browse Library:** Switch between the **Emoji** and **Fonts** tabs to see available options from the cloud repository.
3.  **Custom Import:** Use the "Custom Font" card to browse your internal storage and select any `.ttf` file using the integrated file picker.
4.  **Queue & Flash:**
    * Add your desired font/emoji to the queue.
    * Hit **"Flash Module"**.
    * The built-in terminal will generate the installation script, build the zip, and install it automatically.
5.  **Reboot:** Restart your device to see the changes.

## 🛠 Requirements
- Rooted device.
- **KernelSU** (or any KSU fork with WebUI support).
- **Magisk** (Supported via standard Volume Key installation).
- Internet connection (for fetching the online library).

## 📌 Installation
1. Download the latest release zip.
2. Install via your root manager.
3. **For KSU Users:** You can open the UI immediately after flashing (no reboot needed to browse, only to apply).
4. **For Magisk Users:** Follow the volume key prompts during installation. To change fonts later, simply flash the zip again.

## ❓ FAQ

**Q: How do I restore the default font?**
A: Simply uninstall the module from your root manager and reboot.

**Q: My emojis aren't showing up (Android 12+)?**
A: There are two common reasons for this. Try these steps:
1.  **Zygisk Next Users:** If you are using Zygisk Next 1.3.0+, you may need the `FontLoader` module fix. [Download Here](https://t.me/real5ec1cff/265).
2.  **Google Override:** Google Play Services often forces its own fonts. Go to the Module Action button and run it. This will disable the GMS font provider and clear the cache.

**Q: Can I use my own font files?**
A: Yes! Use the "Custom Font" or "Custom Emoji" card in the WebUI to navigate your internal storage and pick any `.ttf` file.

**Q: Does this work on KSU forks (like KSU-Next)?**
A: Yes, as long as the fork supports the WebUI standard, the interface will work perfectly.

## 👤 Author
Developed by **AshBorn** – [@Ripper_Hybrid](https://t.me/Ripper_Hybrid)

## 🔗 Credits
- **jq Binary** – [jq](https://jqlang.org)
- **zip Binary** – [zip](https://infozip.sourceforge.net)
- **Banner By** – [Adi](https://t.me/adiLohar) - [Banner Channel](https://t.me/WDableuW)

---

> **Disclaimer:** FontCraft Pro modifies system files (systemlessly). While safe, always ensure you have a backup of your ROM or a way to recover from bootloops before flashing custom modules.