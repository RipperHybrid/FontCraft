# FontCraft v7.4

### 🔐 Download Integrity

* **SHA256 Verification:** WebUI and CLI now verify downloads against the JSON manifest's `sha256` value, auto-rejecting corrupted/tampered files. Verified items show a `SHA ✓` badge.

### 🧹 Cleaner Boot & Service Behavior

* **Consolidated Cleanup:** `CLEANUP_WEBUI` moved into `utils.sh`, shared by boot (`service.sh`) and a new **Clean WebUI** option in the Action Menu.
* **Scoped GMS Cleaning:** Now runs at install/flash time instead of every boot.

### 🎛 Settings & Source Management

* **Persistent Custom Source:** Custom library URL/repo now saved via `localStorage`.
* **Args Edit Modal:** Install command arguments now edited via modal instead of a live input.
* **Smarter "Current" Detection:** Reads the module's actual `description=` field rather than relying on update-pending state.

### 🐞 Debug Console

* **Readable Logs:** Noisy output (base64 dumps, repetitive results) summarized into readable labels.
* **Environment Info:** Device model, Android version, and root manager version logged on startup.

### 🖥 UI Polish

* File sizes shown in download list; reduced unnecessary grid re-animations; added terminal Reboot button.