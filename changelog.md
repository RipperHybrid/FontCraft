# FontCraft v5.9 - Major Release

### 🚀 Major New Features
- **Magisk WebUI Support:** Full WebUI experience now available for Magisk users via new bridge system
- **Browser Bridge Download:** Fallback download system streams through browser when wget fails
- **Toast Notification System:** Visual notifications with success/error/warning/info types
- **New Emoji Pack:** Added SamsungOneUi5_beta4 emoji pack back

### 🛠 Core Improvements
- **Modular Architecture:** Created shared `utils.sh` with all core functions
- **Interactive Action Menu:** Vol+ select / Vol- navigate with WebUI launcher, GMS cleaner, and exit options
- **Process Locking:** Prevents duplicate service instances with lock directory
- **Session Management:** Auto-shutdown after 10min max / 5min idle

### 🎨 WebUI Updates
- **Retro Default Theme:** Reduced to 2 themes (Light/Retro) with Retro as default
- **Magisk Preset:** Added Magisk preset with proper installation args
- **File Size Display:** Shows file sizes in download modal (from JSON metadata)
- **Download Verification:** Byte-accurate size checking

### 🔧 Technical
- **GitHub Workflow:** Added size_bytes field and GitLab sync
- **Better Fallbacks:** Multiple binary detection paths and download methods
- **Fixed:** wget HTTPS issues, duplicate instances, file browser quoting