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

CLEANUP_WEBUI

log "Startup tasks complete. Service exiting."