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

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Orbitron&weight=500&pause=700&color=41F791&center=true&vCenter=true&width=935&height=70&lines=Now+featuring+a+full+WebUI!;Custom+Fonts,+Emojis,+and+Themes.;Native+KSU+and+APatch+Support.)](https://git.io/typing-svg)

---

## 📖 About

<details>
<summary><strong>Click to read: Project Integrity, Compatibility & Important Notices</strong></summary>
<br>

> **⚠️ Notice: Resilience & Backup Plans**
> Following a recent temporary suspension of this account, I have updated the infrastructure to prevent future disruptions:
> 
> 1.  **Updates:** The update check has moved to **Cloudflare**. Your module will check for updates reliably, regardless of GitHub's status.
> 2.  **Mirrors:** This repository is fully synchronized with [**GitLab**](https://gitlab.com/RipperHybrid/FontCraft).

### 🛡️ Trust & Verification
I believe in full transparency for root modules. **Nothing in this project is obfuscated.** All code is public, auditable, and free to inspect.

* **View the Source:** You can download the core template logic to see exactly how the module functions internally:
    * 📂 **Download Template Source:** [https://fontcraft.pages.dev/template.zip](https://fontcraft.pages.dev/template.zip)
* **Mirror Configuration:** Want to see where the fonts are fetched from? Check the JSON configuration:
    * 🔗 **Mirror List:** [https://fontcraft.pages.dev/mirrors.json](https://fontcraft.pages.dev/mirrors.json)

> **⚠️ Compatibility Note:** The Full WebUI is available on **KernelSU**, **APatch**, and any **KSU Fork** that supports the module WebUI standard. Magisk users will use the classic Volume Key interface or simply re-flash the module to change settings.

> **🧪 Help Me Expand Compatibility**
> - If your root solution (or specific fork) is not listed or supported, **please open an issue or reach out!** I am looking for testers to help verify and add compatibility for other root environments.

</details>

**FontCraft** now features a fully interactive **WebUI** for KernelSU and APatch users. Browse, download, and flash fonts with a modern, touch-friendly interface designed for seamless customization.

---

### ✨ Key Features
* **Interactive Web Interface:** Browse the remote library visually with preview images (KSU, APatch & Forks).
* **Custom Repositories:** Support for adding user-defined JSON sources to expand your font library.
* **Hybrid Queue System:** Select a **Font** and an **Emoji** pack simultaneously and flash them in one go.
* **Integrated File Selector:** Have your own `.ttf` file? Use the built-in storage navigator to browse and select local font files directly within the interface.
* **Live Terminal Output:** Watch the installation process in real-time via the embedded terminal window.
* **GMS Cleaner:** Built-in action to disable Google Play Services font syncing if it overrides your custom emojis.
* **Theming Engine:** Choose your vibe with **Dark**, **Light**, and **Retro (Amber)** modes.
* **Universal Compatibility:**
    * ✅ **Magisk** (CLI Mode)
    * ✅ **KernelSU** (WebUI Mode)
    * ✅ **APatch** (WebUI Mode)
    * ✅ **Android 15 (Tested on Nothing OS)**

---

## 🎨 Gallery & Asset Showcase

Want to see exactly what's available before you install? We maintain an automatically updated visual catalog of every font and emoji pack currently in the remote library.

> **[👉 Click here to view the Full Font & Emoji Preview](Preview.md)**

---

## 🚀 Roadmap (To-Do)
I am actively working on expanding FontCraft. Here is what is coming next:

* [x] ~~**Custom Repository Support:** A feature in the WebUI to allow users to input their own source URLs.~~
* [ ] **Magisk WebUI Support:** Porting the full WebUI experience to Magisk users.
    * *Note:* This is technically possible but requires significant architectural changes. It is a long-term goal.

## 📥 How WebUI Works (KSU & APatch)
1.  **Open the Module:** Launch the FontCraft WebUI from the "Modules" tab in your manager (KernelSU or APatch).
2.  **Browse Library:** Switch between the **Emoji** and **Fonts** tabs to see available options from the cloud repository.
3.  **Custom Repositories:** Input your own source URLs via the settings to load external collections.
    > *Note:* You can provide any direct link to a JSON file, but the JSON structure must strictly follow the format generated by the official repository's automation script (i.e., the `fonts.json` schema).
4.  **Custom Import:** Use the "Custom Font" card to browse your internal storage and select any `.ttf` file using the integrated file picker.
5.  **Queue & Flash:**
    * Add your desired font/emoji to the queue.
    * Hit **"Flash Module"**.
    * The built-in terminal will generate the installation script, build the zip, and install it automatically.
6.  **Reboot:** Restart your device to see the changes.

## 🛠 Requirements
- Rooted device.
- **KernelSU** (or any KSU fork with WebUI support).
- **APatch** (WebUI Supported).
- **Magisk** (Supported via standard Volume Key installation).
- Internet connection (for fetching the online library).

## 📌 Installation
1. Download the latest release zip.
2. Install via your root manager.
3. **For KSU / APatch Users:** You can open the UI immediately after flashing (no reboot needed to browse, only to apply).
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

## 🔗 Credits
- **jq Binary** – [jq](https://jqlang.org)
- **zip Binary** – [zip](https://infozip.sourceforge.net)
- **Cloudflare** – [Pages](https://pages.cloudflare.com/) (Web Page Hosting & Update System)
> - **Note**: All fonts and emojis belong to their respective creators. This repository acts as a distribution point for legally shareable assets. If you're a copyright holder and wish to have your content removed, please contact the maintainer.

> **Disclaimer:** FontCraft Pro modifies system files (systemlessly). While safe, always ensure you have a backup of your ROM or a way to recover from bootloops before flashing custom modules.

---

<div align="center">
    <sub>👤 Author <strong>AshBorn</strong> • <a href="https://github.com/RipperHybrid"><strong>@RipperHybrid</strong></a></sub>
</div>