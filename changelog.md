# FontCraft v7.5

### ⬇️ Download Management & UI Overhaul

* **Global Download Tracking:** Progress tracking has been liberated from the modal. Live download stats now render directly on the main grid cards and queue slots. You can safely close the modal, navigate the UI, and reopen the active download view on demand.
* **Live Cancellation:** Engineered a dedicated 'Cancel' action for active downloads. It immediately snipes the background `wget` PID or aborts the browser stream, instantly wiping the partial file from the workspace.

### ⏱️ Network Resilience

* **Stall Detection:** Background downloads now actively monitor byte increments. If a download stagnates for 25 seconds with zero incoming data, the system auto-kills the zombie process and alerts the user.
* **Aggressive Timeouts:** Wrapped all network hooks (JSON fetches, mirror checks, ping tests) in strict `withTimeout` logic to prevent infinite UI hangs on dead connections.

### 🧹 Script Optimization

* **Deferred GMS Cleaning:** Relocated `gms_cleaner` execution. It now runs at the end of each selection path instead of at startup, preventing early installation freezes before the menu is displayed.