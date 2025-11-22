# FontCraft v5.4 - WebUI & Architecture Overhaul

## 🚀 New Features
- **Hybrid Interface**: Introduced a full HTML/CSS/JS WebUI for KernelSU.
- **Theme System**: Integrated dynamic theming engine (Dark/Light/Retro).
- **Custom File Browser**: Built-in root file picker to select local `.ttf` files from Internal Storage.
- **Visual Queue System**: "Add to Queue" logic allowing simultaneous selection of Fonts and Emojis.
- **Live Terminal**: Embedded terminal window to view installation logs in real-time.

## ⚠️ Compatibility Note
- **KernelSU**: Full WebUI support (Flash directly from the Managers "Modules" tab).
- **Magisk**: WebUI is currently not supported natively. To change fonts or emojis, **simply re-flash the module zip** in your manager app.
  *(Experimental WebUI support for Magisk is in development).*

## 🔧 Technical Improvements
- **Dynamic Module Generation**: Switched to on-the-fly Magisk Module creation (`zip` generation).
- **GMS Countermeasures**: Added `action.sh` with `pm disable` logic to target `FontsProvider`.
- **Service Optimization**: Increased daemon check frequency (5400s → 2500s).
- **Enhanced Metadata**: Updated JSON structure to support direct download URLs.