# FontCraft v7.1

### ⚙️ Core Backend & Shell Upgrades

* **Pristine XML Backups:** Engineered a bulletproof backup system (`/data/adb/FontCraft_Backup`) that securely extracts and stores your OEM `fonts.xml` and `font_fallback.xml` before patching. This completely eliminates recursive update bugs and dirty flash corruption.
* **Precision AWK Parsing:** Fixed a greedy regex bug in the XML scanner, ensuring flawlessly accurate dynamic font detection across all Android variants without wiping essential configuration lines.
* **Native Port Scanning:** Upgraded the WebUI port generator to directly scan the kernel's routing table (`/proc/net/tcp` and `tcp6`) in pure Hexadecimal. This removes reliance on the often-missing `netstat` binary and guarantees zero port collisions.
* **Sanitized Fallbacks:** Stripped out the bloated 8-file AOSP doomsday fallback. The script now cleanly and smartly targets only `Roboto-Regular.ttf` when flying blind, keeping your `/system/fonts` directory lightweight and strictly consistent.

### 🎨 WebUI & Frontend Parity

* **Unified Injection Engine:** Gutted the massive, redundant inline `awk` patching scripts from `flasher.js`. The WebUI now natively invokes `utils.sh` directly from the workspace, achieving 100% execution parity with the CLI installer.
* **Dynamic Font Tracking:** Removed the hardcoded `SYSTEM_FONTS` array from `config.js`. The WebUI's current item selector now dynamically maps the live module directory (`/data/adb/modules`) to actively detect exactly which fonts are currently installed.