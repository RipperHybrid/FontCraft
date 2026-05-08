#!/system/bin/sh
MODPATH="${0%/*}"
. "$MODPATH/utils.sh" || { echo "- Error: Failed to source utils.sh"; exit 1; }

key_check() {
  [ "$1" ] && local delay=$1 || local delay=10
  local error=false
  if [ -z "$TMPDIR" ]; then TMPDIR="/data/local/tmp"; fi
  mkdir -p "$TMPDIR"
  while true; do
    local count=0
    while true; do
      timeout $delay /system/bin/getevent -lqc 1 2>&1 > $TMPDIR/events &
      sleep 0.5; count=$((count + 1))
      if (`grep -q 'KEY_VOLUMEUP *DOWN' $TMPDIR/events`); then
        return 0
      elif (`grep -q 'KEY_VOLUMEDOWN *DOWN' $TMPDIR/events`); then
        return 1
      fi
      [ $count -gt 12 ] && break
    done
    if $error; then
      log " - Key not detected. Aborting."
      exit 1
    else
      error=true
      log " - Key not detected. Try again."
    fi
  done
}

while true; do
    log " "
    log "=============================="
    log "     FontCraft Action Menu"
    log "=============================="
    log "1. Open WebUI"
    log "2. Clean GMS Fonts"
    log "3. Exit"
    echo " "
    log "Controls:"
    log "  Vol+ = SELECT Option"
    log "  Vol- = NEXT Option"
    echo " "

    log "Open WebUI"
    log "(Manage fonts, settings, logs)"
    if key_check; then
        log "Selected: WebUI"
        if start_server; then
            log "Opening browser in 3s..."
            sleep 2
            log "Localhost set: http://127.0.0.1:$LAUNCH_PORT"
            log "Redirecting..."
            sleep 1
            su 2000 -c "cmd activity start -a android.intent.action.VIEW -d 'http://127.0.0.1:$LAUNCH_PORT/#$LAUNCH_TOKEN'" >/dev/null 2>&1
        else
            log "Server start failed"
        fi
        exit 0
    else
        log "Skipped"
    fi
    log "------------------------------"

    log "Clean GMS Fonts"
    log "(Fix font overriding issues)"
    if key_check; then
        log "Selected: GMS Cleaner"
        gms_cleaner
        exit 0
    else
         log "Skipped"
    fi
    log "------------------------------"

    log "Exit"
    log "(Close this script)"
    if key_check; then
        log "Exiting..."
        exit 0
    else
        log "Looping back to start..."
        sleep 1
    fi
done