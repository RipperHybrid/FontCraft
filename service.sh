#!/system/bin/sh

logfont="/cache/fontcraft.log"
LOCKDIR="/dev/fontcraft_lock"

[ -d /data/adb/ksu ] || [ -f /data/adb/ksu/ksu ] && KSU=1

[ -d /data/adb/magisk ] || [ -f /data/adb/magisk/magisk ] && MAGISK=1

if [ "$KSU" ] && [ "$MAGISK" ]; then
    method="KernelSU+Magisk"
elif [ "$KSU" ]; then
    method="KernelSU"
elif [ "$MAGISK" ]; then
    method="Magisk"
else
    method="Unknown"
fi

logit() {
    echo "$(date '+%Y-%m-%d %I:%M:%S %p') - $1" >> "$logfont"
}

# Define a lock directory in /dev (RAM) to prevent parallel execution
if mkdir "$LOCKDIR" 2>/dev/null; then
    log "Lock acquired: Main instance starting (PID=$$)"
else
    log "Duplicate instance detected (PID=$$). Exiting."
    exit 0
fi

logit "StylizeText service started"

while [ "$(getprop sys.boot_completed)" != "1" ]; do
    sleep 20
done

logit "Boot completed, starting main loop"

REMOVE_FONTS() {
    DELETED=0
    file_count=0
    font_files=""

    logit "Checking for fonts to remove..."

    if [ -d /data/fonts/config ]; then
        font_files=$(find /data/fonts/config -maxdepth 1 -type f -name "*.xml" 2>/dev/null)
        if [ -n "$font_files" ]; then
            file_count=$(echo "$font_files" | wc -l)
            echo "$font_files" | while IFS= read -r file; do
                rm -f "$file"
            done
            logit "Deleted $file_count XML config files"
            DELETED=1
        fi
    fi

    if [ -d /data/fonts/files ]; then
        font_files=$(find /data/fonts/files -maxdepth 1 -type f \( -name "*.ttf" -o -name "*.otf" \) 2>/dev/null)
        if [ -n "$font_files" ]; then
            file_count=$(echo "$font_files" | wc -l)
            echo "$font_files" | while IFS= read -r file; do
                rm -f "$file"
            done
            logit "Deleted $file_count font files directly in files directory"
            DELETED=1
        fi

        find /data/fonts/files -maxdepth 1 -type d -name "~~*" 2>/dev/null | \
        while IFS= read -r folder; do
            if [ "$folder" != "/data/fonts/files" ] && [ -n "$folder" ]; then
                ttf_count=$(find "$folder" -maxdepth 1 -type f -name "*.ttf" 2>/dev/null | wc -l)
                otf_count=$(find "$folder" -maxdepth 1 -type f -name "*.otf" 2>/dev/null | wc -l)
                total_count=$((ttf_count + otf_count))

                if [ $total_count -gt 0 ]; then
                    rm -rf "$folder"
                    folder_name=$(basename "$folder")
                    logit "Deleted: '$folder_name' ($total_count fonts: $ttf_count ttf, $otf_count otf)"
                    echo "1" > /tmp/fonts_deleted.flag
                fi
            fi
        done

        if [ -f /tmp/fonts_deleted.flag ]; then
            DELETED=1
            rm -f /tmp/fonts_deleted.flag
        fi
    fi

    return $DELETED
}

while true; do
    REMOVE_FONTS
    DELETED=$?

    if [ $DELETED -eq 1 ]; then
        for i in 1 2 3 4 5 6 7 8 9 10; do
            su 2000 -c "cmd notification post -t \"$method\" \"StylizeText\" \"StylizeText: Fonts/Emojis error fixed. Reboot recommended.\"" && break
            sleep 1
        done
    fi

    sleep 2500
done