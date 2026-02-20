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
      echo " - Key not detected. Aborting."
      exit 1
    else
      error=true
      echo " - Key not detected. Try again."
    fi
  done
}

gms_cleaner() {
    FONT_DIR="/data/fonts"
    GMS_PKG="com.google.android.gms"
    TARGETS="$GMS_PKG.fonts.provider.FontsProvider $GMS_PKG.fonts.update.UpdateSchedulerService"
    CHANGES_MADE=0

    echo " "
    echo ">>> GMS Font Cleaner <<<"
    echo " "

    echo "[-] Checking GMS Services..."
    for USER_ID in $(ls /data/user); do
        for COMPONENT in $TARGETS; do
            CURRENT_STATE=$(pm list packages -d --user $USER_ID $GMS_PKG | grep "$GMS_PKG")

            pm disable --user $USER_ID "$GMS_PKG/$COMPONENT" > /dev/null 2>&1

            STATUS=$(pm list components -d --user $USER_ID | grep "$COMPONENT")
            if [ -z "$STATUS" ]; then
                echo " ! Disabled: ${COMPONENT##*.} (User $USER_ID)"
            fi
        done
    done

    if [ -d "$FONT_DIR/config" ]; then
        xml_count=$(find "$FONT_DIR/config" -maxdepth 1 -name "*.xml" -type f | wc -l)
        if [ "$xml_count" -gt 0 ]; then
            find "$FONT_DIR/config" -maxdepth 1 -name "*.xml" -type f -delete
            echo " ! Deleted $xml_count XML configs"
            CHANGES_MADE=1
        fi
    fi

    if [ -d "$FONT_DIR/files" ]; then
        font_count=$(find "$FONT_DIR/files" -maxdepth 1 \( -name "*.ttf" -o -name "*.otf" \) -type f | wc -l)
        if [ "$font_count" -gt 0 ]; then
            find "$FONT_DIR/files" -maxdepth 1 \( -name "*.ttf" -o -name "*.otf" \) -type f -delete
            echo " ! Deleted $font_count loose font files"
            CHANGES_MADE=1
        fi

        for cache_dir in $(find "$FONT_DIR/files" -maxdepth 1 -type d -name "~~*"); do
            rm -rf "$cache_dir"
            echo " ! Removed GMS cache folder: $(basename "$cache_dir")"
            CHANGES_MADE=1
        done
    fi

    echo " "
    if [ "$CHANGES_MADE" -eq 1 ]; then
        echo "!!! CLEANUP COMPLETE !!!"
        echo "Reboot is recommended to apply changes."
    else
        echo "--- System is optimal ---"
        echo "No GMS fonts found. No reboot needed."
    fi
    echo " "
    echo "Returning to exit..."
    sleep 3
}

while true; do
    echo " "
    echo "=============================="
    echo "      FontCraft Menu"
    echo "=============================="
    echo " "
    echo "Controls:"
    echo "  Vol+ = SELECT Option"
    echo "  Vol- = NEXT Option"
    echo " "

    echo "-> [1] Open WebUI"
    echo "   (Manage fonts, settings, logs)"
    if key_check; then
        echo " > Selected: WebUI"
        if start_server; then
            echo "- Opening browser in 3s..."
            sleep 2
            echo "- Localhost set: http://127.0.0.1:$LAUNCH_PORT"
            echo "- Redirecting..."
            sleep 1
            su 2000 -c "cmd activity start -a android.intent.action.VIEW -d 'http://127.0.0.1:$LAUNCH_PORT'" >/dev/null 2>&1
        else
            echo "- Server start failed"
        fi
        exit 0
    else
        echo " > Skipped"
    fi
    echo "------------------------------"

    echo "-> [2] Clean GMS Fonts"
    echo "   (Fix font overriding issues)"
    if key_check; then
        echo " > Selected: GMS Cleaner"
        gms_cleaner
        exit 0
    else
         echo " > Skipped"
    fi
    echo "------------------------------"

    echo "-> [3] Exit"
    echo "   (Close this script)"
    if key_check; then
        echo " > Exiting..."
        exit 0
    else
        echo " > Looping back to start..."
        sleep 1
    fi
done