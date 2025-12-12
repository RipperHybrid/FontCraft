# FontCraft v5.7 - Version Changelog

### 🚀 Major Architecture Overhaul & Metamodule Intelligence

#### ✨ New Features
* **Metamodule Detection:** The app now intelligently scans installed modules for `metamodule=1` props to detect active Metamodule environments.
* **Safety Confirmation:** Added a smart warning popup before flashing in Metamodule mode to prevent accidental interruptions during instant updates.
* **Auto-Reboot Sequence:** If a Metamodule is active, the app now initiates a **5-second countdown** followed by an automatic reboot after a successful flash to ensure changes are applied safely.
* **Exit Code Verification:** The terminal now explicitly checks for `Exit Code 0` to accurately report Success vs. Failure, rather than just assuming success.

#### 🛠 Technical Changes
* **Modular Architecture:** Refactored the monolithic `script.js` into distinct ES6 modules (`main`, `flasher`, `files`, `utils`, `config`). This improves code readability, maintainability, and performance.
* **iOS-Style Design:** Modals have been redesigned with a "Curvy" aesthetic, featuring softer corners, backdrop blur, and smoother entry animations.
* **Refined Terminal:** Installation logs now consistently use Monospace fonts for a cleaner, hacker-style look.

#### 🐛 Bug Fixes
* **Fixed Flashing Crash:** Resolved a critical race condition where the app would crash right before the installation step due to the UI thread locking up.
* **Fixed Navigation:** Improved file browser stability when navigating deep into system directories.


