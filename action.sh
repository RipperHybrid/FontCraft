#!/system/bin/sh

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
echo "Closing in 10 seconds..."
sleep 10
