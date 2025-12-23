# FontCraft v5.8 - Version Changelog

### ⚡ Stability & Offline Support

#### ✨ New Features
* **Offline Installation Support:** The installation template is now stored locally on your device. You can now install local `.ttf` files without needing an active internet connection (Data-free installation).
* **Revised Safety Protocol:** The "Metamodule Detected" logic has been updated.
    * **Removed Auto-Reboot:** The forced 5-second auto-reboot sequence has been removed as it is no longer necessary.
    * **Updated Warning:** The safety popup now specifically warns about potential "Live Patching" side effects (such as text disappearing or UI freezing) and advises a manual reboot or force restart (Power + Vol Up) only if necessary.

#### 🛠 Technical Changes
* **Codebase Optimization:** Massive cleanup performed. Removed a significant amount of unnecessary code and redundant logic to reduce footprint and improve efficiency.
* **UI Adjustments:** Subtle UI tweaks to better support the new offline workflow and local template handling.

#### 🐛 Bug Fixes
* **Fixed WebUI Crash:** Successfully identified and patched the root cause of the WebUI crash during the flashing process (which allowed for the removal of the auto-reboot workaround).