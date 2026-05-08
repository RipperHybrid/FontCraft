# FontCraft v7.0

### 🎨 WebUI & Frontend Overhaul
- **Vite Migration:** The entire WebUI has been rewritten and containerized using Vite and ES6 Modules for heavily optimized, lightning-fast execution.
- **Visual Redesign:** Implemented a sleek, dark-themed UI featuring glassmorphism, ambient background glows, and a streamlined build queue.
- **Custom Mirrors:** Added a dedicated dropdown in Settings to easily switch between auto-detected mirrors or manual JSON source URLs.
- **Reboot FAB:** Added a floating action button to seamlessly reboot the device directly from the WebUI after a successful flash.

### ⚙️ Core Backend & Shell Upgrades
- **Live XML Injection:** Engineered a dynamic patching system (`inject_font_xml`) that safely injects font targets directly into `/system/etc/fonts.xml` and `/system/etc/font_fallback.xml` for superior system-wide compatibility.
- **Workspace Isolation:** Relocated all server state, tokens, and active build environments to a dedicated, secure directory (`/cache/fontcraft`), eliminating temp file clutter.
- **Standalone Monitor:** Extracted the server watchdog into a dedicated `monitor.sh` script, dropping the old on-the-fly generation for better stability.
- **Clean Uninstallation:** Introduced `uninstall.sh` to guarantee zero residual cache files or logs remain after module removal.
- **Streamlined Action Menu:** Cleaned up `action.sh` to focus strictly on essential tasks (WebUI Launch, GMS Cleaner).

### 🛠 CI/CD & Build Pipeline
- **Node.js Integration:** Upgraded GitHub Actions to run a full Node 20 `npm build` pipeline, packing the optimized `dist` output into the final Magisk/KSU zip.
- **Preview Matching:** Hardened the Python parsing script to perfectly map preview images to their respective font binaries in `fonts.json`.