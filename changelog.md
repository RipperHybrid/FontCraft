# FontCraft v7.3

### 🛠 APatch Compatibility

* **Path Correction (Issue #3):** Resolved connectivity and install failures by updating target directories from `/data/adb/apd/busybox/` to `/data/adb/ap/bin/busybox` and `/data/adb/apd`.

### 🌐 WebUI Network Resilience

* **Root Fallback:** Fetches now automatically retry via root `wget` if blocked by CORS or browser restrictions.
* **Detailed Logging:** All network requests (mirrors, JSON, custom sources) now log to the Debug Console for visibility.
* **Startup Optimization:** Consolidated `mirrors.json` fetching to a single request at launch.

### 🔒 Installer Safety

* **Input Lock:** Prevents accidental input during app switching. If you leave the root manager mid-install, the installer locks input until you return and press Volume Down to resume.

### 🎛 CLI Menu

* **Clean Exit:** Added an explicit **Exit** option to font/emoji and install-mode menus to prevent script errors.