#!/system/bin/sh

MODPATH="${0%/*}"
. "$MODPATH/utils.sh"
LOCKDIR="/dev/fontcraftlock"

# Define a lock directory in /dev (RAM) to prevent parallel execution
if mkdir "$LOCKDIR" 2>/dev/null; then
    rm -rf "$logfont" 2>/dev/null
    log "Lock acquired: Main instance starting (PID=$$)"
else
    log "Duplicate instance detected (PID=$$). Exiting."
    exit 0
fi

log "FontCraft service started"

while [ "$(getprop sys.boot_completed)" != "1" ]; do
    sleep 20
done

log "Boot completed, executing startup tasks"

CLEANUP_WEBUI() {
    log "Running WebUI cleanup..."
    FOUND_BB=$(find_busybox)

    if [ -n "$FOUND_BB" ]; then
        "$FOUND_BB" pkill -f "httpd -p 127.0.0.1:" >/dev/null 2>&1
        "$FOUND_BB" pkill -f "$MODPATH/monitor.sh" >/dev/null 2>&1
        "$FOUND_BB" pkill -f "$MODPATH/monitor" >/dev/null 2>&1
    fi

    rm -rf "/cache/fontcraft"

    log "WebUI cleanup: Stopped processes and removed stale files"
}

CLEANUP_WEBUI
gms_cleaner

log "Startup tasks complete. Service exiting."