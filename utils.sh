#!/system/bin/sh

SESSION_TIMEOUT=600
MAX_IDLE_TIME=300
ACTIVITY_CHECK_INTERVAL=30
FC_ROOT="/cache/fontcraft"
STATE_FILE="$FC_ROOT/.session_state"
PORT_FILE="$FC_ROOT/server_port"
KEY_FILE="$FC_ROOT/uplink_key"
CACHE_DIR="$FC_ROOT/cache"
BUILD_DIR="$FC_ROOT/build"
STABLE_PATH="/data/adb/modules/StylizeText"
logfont="/cache/fontcraft.log"
font=none
emoji=none
jq="$MODPATH/binaries/jq"
JSON_PATH="$TMPDIR/fonts.json"
core_fonts="Roboto-Regular.ttf DroidSansMono.ttf NotoSerif-Regular.ttf NotoSerif-Bold.ttf NotoSerif-Italic.ttf NotoSerif-BoldItalic.ttf"

log() {
    echo "- $1"
    echo "$(date '+%Y-%m-%d %I:%M:%S %p') - $1" >> "$logfont"
}

chooseport() {
    [ "$1" ] && local delay=$1 || local delay=10
    local attempts=0
    while [ $attempts -lt 3 ]; do
        local count=0
        while true; do
            EVENT_LINE=$(timeout "$delay" /system/bin/getevent -lqc 1 2>&1)
            count=$((count + 1))
            echo "$EVENT_LINE" | grep -q 'ABS_MT_TRACKING_ID'  && { sleep 0.2; return 0; }
            echo "$EVENT_LINE" | grep -q 'KEY_VOLUMEUP *DOWN'  && { sleep 0.2; return 1; }
            echo "$EVENT_LINE" | grep -q 'KEY_VOLUMEDOWN *DOWN' && { sleep 0.2; return 2; }
            [ $count -gt 9 ] && break
            sleep 0.2
        done
        attempts=$((attempts + 1))
        log "Input not detected. Try again ($attempts/3)"
        echo " "
    done
    log "Input not detected after 3 attempts. Aborting."
    return 1
}

find_busybox() {
    for candidate in /data/adb/ksu/bin/busybox /data/adb/magisk/busybox /data/adb/ap/bin/busybox /system/bin/busybox; do
        if [ -f "$candidate" ] && [ -x "$candidate" ]; then
            if "$candidate" true >/dev/null 2>&1; then
                echo "$candidate"
                return 0
            fi
        fi
    done
    if command -v busybox >/dev/null 2>&1; then
        sys_bb=$(command -v busybox)
        if "$sys_bb" true >/dev/null 2>&1; then
            echo "$sys_bb"
            return 0
        fi
    fi
    return 1
}

generate_random_port() {
    local attempts=0
    local PORT
    while [ $attempts -lt 5 ]; do
        if [ -c "/dev/urandom" ]; then
            PORT=$(od -An -N2 -tu2 /dev/urandom | tr -d ' ')
            PORT=$((6000 + (PORT % 4000)))
        else
            PORT=$((6000 + ($(date +%s) % 4000)))
        fi
        if ! netstat -nlt | grep -q ":$PORT "; then
            echo "$PORT"
            return 0
        fi
        attempts=$((attempts + 1))
    done
    echo "$PORT"
}

generate_secure_token() {
    local token=""
    if [ -f "/proc/sys/kernel/random/uuid" ]; then
        token=$(cat /proc/sys/kernel/random/uuid)
    elif [ -c "/dev/urandom" ]; then
        token=$(dd if=/dev/urandom bs=16 count=1 2>/dev/null | od -An -tx1 | tr -d ' \n')
    else
        token=$(cat /proc/uptime /proc/loadavg /proc/stat 2>/dev/null | md5sum | cut -d' ' -f1)-$(date +%s%N)
    fi
    echo "$token"
}

start_server() {
    FOUND_BB=$(find_busybox)
    [ -z "$FOUND_BB" ] && { log "Error: Busybox not found"; return 1; }

    if [ -f "$PORT_FILE" ]; then
        EXISTING_PORT=$(cat "$PORT_FILE")
        [ -n "$EXISTING_PORT" ] && "$FOUND_BB" pkill -f "httpd -p 127.0.0.1:$EXISTING_PORT"
        rm -f "$PORT_FILE" "$KEY_FILE" "$STATE_FILE"
    fi

    "$FOUND_BB" pkill -f "httpd -p 127.0.0.1:"
    "$FOUND_BB" pkill -f "$STABLE_PATH/monitor.sh"

    rm -rf "$FC_ROOT"
    mkdir -p "$FC_ROOT"

    log "Found Busybox: $FOUND_BB"

    RANDOM_PORT=$(generate_random_port)
    log "Generated port: $RANDOM_PORT"

    TOKEN=$(generate_secure_token)
    [ -z "$TOKEN" ] && { log "Error: Token generation failed"; return 1; }

    echo "$TOKEN" > "$KEY_FILE"
    echo "$RANDOM_PORT" > "$PORT_FILE"
    chmod 700 "$FC_ROOT"
    chmod 600 "$KEY_FILE"
    chmod 644 "$PORT_FILE"

    CURRENT_TIME=$(date +%s)
    DEADLINE=$((CURRENT_TIME + SESSION_TIMEOUT))
    echo "$RANDOM_PORT $DEADLINE" > "$STATE_FILE"

    [ -f "$STABLE_PATH/webroot/cgi-bin/exec" ] && chmod +x "$STABLE_PATH/webroot/cgi-bin/exec"

    BB_DIR=$("$FOUND_BB" dirname "$FOUND_BB")
    export PATH="$BB_DIR:$PATH"

    log "Starting server on port $RANDOM_PORT..."
    "$FOUND_BB" httpd -p 127.0.0.1:$RANDOM_PORT -h "$STABLE_PATH/webroot" >/dev/null 2>&1

    sleep 1
    SERVER_PID=$("$FOUND_BB" pgrep -f "httpd -p 127.0.0.1:$RANDOM_PORT")

    if [ -n "$SERVER_PID" ]; then
        log "Server started (PID: $SERVER_PID)"

        chmod +x "$STABLE_PATH/monitor.sh"
        su -c "sh $STABLE_PATH/monitor.sh >/dev/null 2>&1 &"

        log "Monitor: Background watcher active"
        log "Auto-shutdown: $((SESSION_TIMEOUT/60))min max / $((MAX_IDLE_TIME/60))min idle"

        (
            for i in 1 2 3; do
                su 2000 -c "cmd notification post -t 'FontCraft' 'Server Started' 'WebUI Listening | Idle: $((MAX_IDLE_TIME/60))min'" >/dev/null 2>&1 && break
                sleep 1
            done
        ) &

        LAUNCH_PORT=$RANDOM_PORT
        LAUNCH_TOKEN=$TOKEN
        return 0
    else
        log "Error: Server failed to start"
        rm -rf "$FC_ROOT"
        return 1
    fi
}

modify_prop() {
    local prop_key="$1"
    local prop_value="$2"
    local target_file="${3:-$MODPATH/module.prop}"

    if [ ! -f "$target_file" ]; then
        log "Error: File $target_file not found."
        return 1
    fi

    if grep -q "^$prop_key=" "$target_file"; then
        local safe_value=$(printf '%s\n' "$prop_value" | sed 's/[~&]/\\&/g')
        sed -i "s~^$prop_key=.*~$prop_key=$safe_value~" "$target_file" || {
            log "Error: Failed to modify $prop_key in $(basename "$target_file")"
            return 1
        }
        log "Set $prop_key to $prop_value in $(basename "$target_file")"
    else
        log "Warning: Property $prop_key not found in $(basename "$target_file"), skipping"
    fi
}

inject_font_xml() {
    local font_file="$1"
    local modpath="$2"

    local dest_dir="$modpath/system/etc"
    local fallback_src="/system/etc/font_fallback.xml"
    local fonts_src="/system/etc/fonts.xml"
    local fallback_dest="$dest_dir/font_fallback.xml"
    local fonts_dest="$dest_dir/fonts.xml"

    log "Injecting XML entries for: $font_file"
    mkdir -p "$dest_dir"

    if [ -f "$fallback_src" ]; then
        cp "$fallback_src" "$fallback_dest" || { log "Error: Failed to copy font_fallback.xml"; return 1; }

        local ss_block="  <family name=\"sans-serif\">
    <font supportedAxes=\"wght,ital\">
      ${font_file}
      <axis tag=\"wdth\" stylevalue=\"100.0\"/>
    </font>
  </family>"

        local sc_block="  <family name=\"sans-serif-condensed\">
    <font supportedAxes=\"wght,ital\">
      ${font_file}
      <axis tag=\"wdth\" stylevalue=\"75.0\"/>
    </font>
  </family>"

        awk -v block="$ss_block" '
            /^[[:space:]]*<family name="sans-serif">/ { skip=1; print block; next }
            skip && /^[[:space:]]*<\/family>/ { skip=0; next }
            skip { next }
            { print }
        ' "$fallback_dest" > "$fallback_dest.tmp" && mv "$fallback_dest.tmp" "$fallback_dest"

        awk -v block="$sc_block" '
            /^[[:space:]]*<family name="sans-serif-condensed">/ { skip=1; print block; next }
            skip && /^[[:space:]]*<\/family>/ { skip=0; next }
            skip { next }
            { print }
        ' "$fallback_dest" > "$fallback_dest.tmp" && mv "$fallback_dest.tmp" "$fallback_dest"

        log "Patched font_fallback.xml"
    else
        log "Warning: font_fallback.xml not found, skipping"
    fi

    if [ -f "$fonts_src" ]; then
        cp "$fonts_src" "$fonts_dest" || { log "Error: Failed to copy fonts.xml"; return 1; }

        local fs_block="    <family name=\"sans-serif\">
        <font weight=\"100\" style=\"normal\">${font_file}</font>
        <font weight=\"200\" style=\"normal\">${font_file}</font>
        <font weight=\"300\" style=\"normal\">${font_file}</font>
        <font weight=\"400\" style=\"normal\">${font_file}</font>
        <font weight=\"500\" style=\"normal\">${font_file}</font>
        <font weight=\"600\" style=\"normal\">${font_file}</font>
        <font weight=\"700\" style=\"normal\">${font_file}</font>
        <font weight=\"800\" style=\"normal\">${font_file}</font>
        <font weight=\"900\" style=\"normal\">${font_file}</font>
        <font weight=\"100\" style=\"italic\">${font_file}</font>
        <font weight=\"200\" style=\"italic\">${font_file}</font>
        <font weight=\"300\" style=\"italic\">${font_file}</font>
        <font weight=\"400\" style=\"italic\">${font_file}</font>
        <font weight=\"500\" style=\"italic\">${font_file}</font>
        <font weight=\"600\" style=\"italic\">${font_file}</font>
        <font weight=\"700\" style=\"italic\">${font_file}</font>
        <font weight=\"800\" style=\"italic\">${font_file}</font>
        <font weight=\"900\" style=\"italic\">${font_file}</font>
    </family>"

        awk -v block="$fs_block" '
            /^[[:space:]]*<family name="sans-serif">/ { skip=1; print block; next }
            skip && /^[[:space:]]*<\/family>/ { skip=0; next }
            skip { next }
            { print }
        ' "$fonts_dest" > "$fonts_dest.tmp" && mv "$fonts_dest.tmp" "$fonts_dest"

        log "Patched fonts.xml"
    else
        log "Warning: fonts.xml not found, skipping"
    fi

    log "XML injection complete"
}

gms_cleaner() {
    FONT_DIR="/data/fonts"
    GMS_PKG="com.google.android.gms"
    TARGETS="$GMS_PKG.fonts.provider.FontsProvider $GMS_PKG.fonts.update.UpdateSchedulerService"
    CHANGES_MADE=0

    echo " "
    log "GMS Font Cleaner <<<"
    echo " "

    log "Checking GMS Services..."
    for USER_ID in $(ls /data/user); do
        for COMPONENT in $TARGETS; do
            CURRENT_STATE=$(pm list packages -d --user $USER_ID $GMS_PKG | grep "$GMS_PKG")

            pm disable --user $USER_ID "$GMS_PKG/$COMPONENT" > /dev/null 2>&1

            STATUS=$(pm list components -d --user $USER_ID | grep "$COMPONENT")
            if [ -z "$STATUS" ]; then
                log "Disabled: ${COMPONENT##*.} (User $USER_ID)"
            fi
        done
    done

    if [ -d "$FONT_DIR/config" ]; then
        xml_count=$(find "$FONT_DIR/config" -maxdepth 1 -name "*.xml" -type f | wc -l)
        if [ "$xml_count" -gt 0 ]; then
            find "$FONT_DIR/config" -maxdepth 1 -name "*.xml" -type f -delete
            log "Deleted $xml_count XML configs"
            CHANGES_MADE=1
        fi
    fi

    if [ -d "$FONT_DIR/files" ]; then
        font_count=$(find "$FONT_DIR/files" -maxdepth 1 \( -name "*.ttf" -o -name "*.otf" \) -type f | wc -l)
        if [ "$font_count" -gt 0 ]; then
            find "$FONT_DIR/files" -maxdepth 1 \( -name "*.ttf" -o -name "*.otf" \) -type f -delete
            log "Deleted $font_count loose font files"
            CHANGES_MADE=1
        fi

        for cache_dir in $(find "$FONT_DIR/files" -maxdepth 1 -type d -name "~~*"); do
            rm -rf "$cache_dir"
            log "Removed GMS cache folder: $(basename "$cache_dir")"
            CHANGES_MADE=1
        done
    fi

    echo " "
    if [ "$CHANGES_MADE" -eq 1 ]; then
        log "CLEANUP COMPLETE !!!"
        log "Reboot is recommended to apply changes."
    else
        log "System is optimal"
        log "No GMS fonts found. No reboot needed."
    fi
}

install_font() {
    local font_name="$1"
    local font_path="$2"
    local modpath="$3"
    local dest_path="$modpath/system/fonts"

    ui_print " "
    ui_print "=============================="
    log "Installing: $font_name"
    ui_print "=============================="
    sleep 0.2

    mkdir -p "$dest_path"

    if [ "$font_name" = "Emoji" ]; then
        log "Installing emoji font..."
        cp "$font_path" "$dest_path/NotoColorEmoji.ttf" || {
            log "Error: Failed to copy NotoColorEmoji.ttf."
            exit 1
        }
        log "Installed as NotoColorEmoji.ttf"
        emoji="$selected_item"

    elif [ "$font_name" = "Fonts" ]; then
        local ttf_file
        ttf_file=$(find "$font_path" -type f -name '*.ttf' | head -n 1)
        if [ -z "$ttf_file" ]; then
            log "Error: No TTF file found in $font_path."
            exit 1
        fi

        local tmp_dir="$TMPDIR/processed_font"
        mkdir -p "$tmp_dir"
        cp "$ttf_file" "$tmp_dir/selected_font.ttf" || {
            log "Error: Failed to stage selected_font.ttf."
            exit 1
        }

        local replaced_count=0
        local skipped_count=0

        log "Replacing core font files..."
        for dest_file in $core_fonts; do
            if [ -f "/system/fonts/$dest_file" ]; then
                cp "$tmp_dir/selected_font.ttf" "$dest_path/$dest_file" || {
                    log "Error: Failed to copy $dest_file."
                    exit 1
                }
                replaced_count=$((replaced_count + 1))
            else
                log "Skipped: $dest_file (not on this ROM)"
                skipped_count=$((skipped_count + 1))
            fi
        done

        log "Replaced: $replaced_count files | Skipped: $skipped_count files"

        local installed_filename
        installed_filename=$(basename "$ttf_file")
        cp "$tmp_dir/selected_font.ttf" "$dest_path/$installed_filename" 2>/dev/null

        log "Patching font XMLs..."
        inject_font_xml "$installed_filename" "$modpath" || {
            log "Warning: XML injection failed. Font files replaced but XML not patched."
        }

        font="$selected_item"

    else
        log "Error: Invalid font type '$font_name'. Must be 'Fonts' or 'Emoji'."
        exit 1
    fi

    sleep 0.2
    ui_print "=============================="
    log "Done."
    ui_print "=============================="
}

extract_info() {
    local file="$1"
    local category="$2"
    local input="$3"
    emoji_list=""
    font_list=""

    if [ -z "$file" ]; then
        file=$(ls -t *.json 2>/dev/null | head -n 1)
        if [ -z "$file" ]; then
            log "No JSON file found!"
            return 1
        fi
    fi

    if [ -z "$category" ]; then
        log "Available categories: Emoji, Fonts"
        return 0
    fi

    if [ "$category" != "Emoji" ] && [ "$category" != "Fonts" ]; then
        log "Invalid category! Use: Emoji or Fonts"
        return 1
    fi

    if [ -z "$input" ]; then
        values=$($jq -r --arg cat "$category" '.[$cat] | keys[]' "$file")
    else
        if $jq -e --arg cat "$category" --arg key "$input" '.[$cat][$key].files | length > 0' "$file" > /dev/null 2>&1; then
            values=$($jq -r --arg cat "$category" --arg key "$input" '.[$cat][$key].files[].filename' "$file")
        else
            log "Error: '$input' structure invalid in JSON!"
            return 1
        fi
    fi

    if [ -z "$values" ]; then
        log "No values found in $category!"
        return 1
    fi

    local list_build=""
    values=$(echo "$values" | tr '\n' ' ')
    for value in $values; do
        list_build="$list_build$value,"
    done
    list_build="${list_build%,}"

    if [ "$category" = "Emoji" ]; then
        emoji_list="$list_build"
    else
        font_list="$list_build"
    fi
}

download_ef() {
    local url="$1"
    local output_path="$2"
    local file_size="$3"

    if [ -z "$url" ] || [ -z "$output_path" ]; then
        log "Error: Missing parameters for download."
        return 1
    fi

    if ! command -v wget >/dev/null 2>&1; then
        log "Error: wget not found!"
        return 1
    fi

    if [ -n "$file_size" ] && [ "$file_size" != "Unknown Size" ]; then
        log "Downloading: $(basename "$output_path") | Size: $file_size"
    else
        log "Downloading: $(basename "$output_path")"
    fi

    wget -q --no-check-certificate -O "$output_path" "$url"
    local wget_status=$?

    if [ $wget_status -ne 0 ]; then
        log "Download failed (code: $wget_status)"
        rm -f "$output_path"
        return 1
    fi

    if [ -s "$output_path" ]; then
        log "Download complete"
        return 0
    else
        log "Error: Downloaded file is empty."
        rm -f "$output_path"
        return 1
    fi
}

get_working_mirror() {
    local mirrors_url="https://fontcraft.pages.dev/mirrors.json"
    local mirrors_json=""
    local test_url=""

    JSON_URL="https://raw.githubusercontent.com/RipperHybrid/FontCraft/Master/fonts.json"

    log "Fetching mirror list..."

    if ! command -v wget >/dev/null 2>&1; then
        log "wget not found, using default mirror"
        return 0
    fi

    mirrors_json=$(wget -T 10 -q -O - "$mirrors_url" 2>/dev/null)

    if [ -z "$mirrors_json" ]; then
        log "Failed to fetch mirrors.json, using default mirror"
        return 0
    fi

    log "Testing mirrors..."

    local mirror_count
    mirror_count=$(echo "$mirrors_json" | $jq -r '.mirrors | length' 2>/dev/null)

    if [ -z "$mirror_count" ] || [ "$mirror_count" = "null" ]; then
        log "Invalid mirrors.json, using default mirror"
        return 0
    fi

    local i=0
    while [ $i -lt "$mirror_count" ]; do
        test_url=$(echo "$mirrors_json" | $jq -r --argjson idx "$i" '.mirrors[$idx].url' 2>/dev/null)
        local repo
        repo=$(echo "$mirrors_json" | $jq -r --argjson idx "$i" '.mirrors[$idx].repo' 2>/dev/null)

        if [ -z "$test_url" ] || [ "$test_url" = "null" ]; then
            i=$((i + 1))
            continue
        fi

        log "Testing mirror $((i + 1)): $repo"

        if wget -T 10 -q --spider "$test_url" >/dev/null 2>&1; then
            log "Using mirror $((i + 1)): $repo"
            JSON_URL="$test_url"
            return 0
        else
            log "Mirror $((i + 1)) failed"
        fi

        i=$((i + 1))
    done

    log "All mirrors failed, using default fallback"
    return 1
}

setup_binaries() {
    if [ -d "$MODPATH/binaries" ]; then
        chmod +x "$MODPATH"/binaries/*
        log "Binaries ready"
    fi

    if [ ! -s "$jq" ] || [ ! -x "$jq" ]; then
        log "Error: jq binary missing or not executable."
        log "WebUI and CLI require jq to function."
        abort "Error: Installation aborted. Please ensure your zip is intact."
    fi
}

download_tools() {
    get_working_mirror

    if command -v wget >/dev/null 2>&1; then
        log "Downloading font database..."
        wget --no-check-certificate -qO "$JSON_PATH" "$JSON_URL"
    else
        log "Error: wget not found."
        return 1
    fi

    if [ -s "$JSON_PATH" ]; then
        log "Font database ready"
    else
        log "Failed to download font database."
        log "Try a VPN or use the offline version."
        abort "Error: Installation aborted. Use the offline version."
    fi
}

run_cli_selection() {
    local category="$1"
    local type_lbl="$2"

    extract_info "$JSON_PATH" "$category"

    if [ "$category" = "Fonts" ]; then
        selection_list="$font_list"
    else
        selection_list="$emoji_list"
    fi

    selection_type="$type_lbl"
    select_item
}