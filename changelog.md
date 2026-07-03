# FontCraft v7.2

### 📦 Asset Library Migration
- **Dedicated FontLib Repository:** Extracted all font binaries, emojis, and preview images out of the main repository. All assets are now hosted in a dedicated `RipperHybrid/FontLib` repository, drastically reducing FontCraft's core module size and making asset updates independent of module updates.

### ⚙️ Engine Simplification
- **XML Injection Removed:** Completely ripped out the complex and experimental XML patching system. The engine now relies strictly on a pure, direct-replacement method—targeting the default AOSP `Roboto-Regular.ttf` and native Android emoji fonts for guaranteed system stability and zero bootloops.

### 🎨 WebUI UI/UX Tweaks
- **Neumorphic Redesign:** Updated the visual theme to a clean Neumorphic aesthetic. Anchored the top header so it no longer floats, and added a Scroll-to-Top FAB for better navigation in long lists.
- **Improved FAB Behavior:** Added a Reboot FAB and a Scroll-to-Top button that automatically hide when modals or file pickers are active to prevent UI overlap.