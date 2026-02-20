#!/system/bin/sh

SESSION_TIMEOUT=600
MAX_IDLE_TIME=300
ACTIVITY_CHECK_INTERVAL=30
STATE_FILE="$MODPATH/.session_state"
PORT_FILE="$MODPATH/webroot/nexus/server_port"
CACHE_DIR="/data/local/tmp/fontcraft_cache"
BUILD_DIR="/data/local/tmp/fontcraft_build"

font=none
emoji=none
jq="$MODPATH/binaries/jq"
JSON_PATH="$TMPDIR/fonts.json"

log_print() {
    # Auto-detects if we are in Magisk install (ui_print) or Action shell (echo)
    if type ui_print >/dev/null 2>&1; then
        ui_print "   >[$1]< "
    else
        echo " - $1"
    fi
}

chooseport() {
  # Original idea by chainfire and ianmacd @xda-developers
  # Modified by AshBorn (@Ripper_Hybrid) to add touch support
  [ "$1" ] && local delay=$1 || local delay=10
  local attempts=0
  while [ $attempts -lt 3 ]; do
    local count=0
    while true; do
      EVENT_LINE=$(timeout "$delay" /system/bin/getevent -lqc 1 2>&1)
      count=$((count + 1))
      echo "$EVENT_LINE" | grep -q 'ABS_MT_TRACKING_ID' && { sleep 0.2; return 0; }
      echo "$EVENT_LINE" | grep -q 'KEY_VOLUMEUP *DOWN' && { sleep 0.2; return 1; }
      echo "$EVENT_LINE" | grep -q 'KEY_VOLUMEDOWN *DOWN' && { sleep 0.2; return 2; }
      [ $count -gt 9 ] && break
      sleep 0.2
    done
    attempts=$((attempts + 1))
    log_print "Input not detected. Try again ($attempts/3)"
    echo " "
  done
  log_print "Input not detected after 3 attempts. Aborting."
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

create_monitor_script() {
    local PORT=$1
    local TIMEOUT=$2
    local MONITOR_NAME="monitor_${PORT}_$(date +%s).sh"

    cat > "$MODPATH/$MONITOR_NAME" << MONITOR_EOF
#!/system/bin/sh
MODPATH="\${0%/*}"
STATE_FILE="\$MODPATH/.session_state"
SELF_SCRIPT="\$MODPATH/$MONITOR_NAME"
PORT_FILE="\$MODPATH/webroot/nexus/server_port"
CACHE_DIR="/data/local/tmp/fontcraft_cache"
BUILD_DIR="/data/local/tmp/fontcraft_build"

find_busybox() {
    for candidate in /data/adb/ksu/bin/busybox /data/adb/magisk/busybox /data/adb/ap/bin/busybox /system/bin/busybox; do
        if [ -f "\$candidate" ] && [ -x "\$candidate" ]; then
            if "\$candidate" true >/dev/null 2>&1; then
                echo "\$candidate"
                return 0
            fi
        fi
    done
    return 1
}

send_notification() {
    for i in 1 2 3; do
        su 2000 -c "cmd notification post -t 'FontCraft' '\$1' '\$2'" >/dev/null 2>&1 && break
        sleep 1
    done
}

cleanup_and_exit() {
    BB=\$(find_busybox)
    [ -n "\$BB" ] && "\$BB" pkill -f "httpd -p 127.0.0.1:$PORT"

    send_notification "WebUI Stopped" "\$1"

    rm -rf "\$CACHE_DIR" "\$BUILD_DIR"
    rm -f "\$STATE_FILE" "\$SELF_SCRIPT" "\$PORT_FILE"
    rm -f "\$MODPATH/webroot/nexus/uplink_key"
    rm -f "\$MODPATH"/monitor_*.sh

    exit 0
}

BB=\$(find_busybox)
[ -z "\$BB" ] && cleanup_and_exit "Error: Busybox not found"

while [ -f "\$STATE_FILE" ]; do
    sleep 30

    if ! "\$BB" pgrep -f "httpd -p 127.0.0.1:$PORT" >/dev/null; then
         cleanup_and_exit "Server process died"
    fi

    read PORT DEADLINE LAST_ACTIVITY < "\$STATE_FILE"
    CURRENT=\$(\$BB date +%s)

    [ "\$CURRENT" -ge "\$DEADLINE" ] && cleanup_and_exit "Killed WebUI reached max session time (10min)"

    IDLE=\$((CURRENT - LAST_ACTIVITY))

    [ "\$IDLE" -ge $TIMEOUT ] && cleanup_and_exit "Killed WebUI reached Idle timeout ($((TIMEOUT/60)) min)"

    REMAINING=\$((DEADLINE - CURRENT))
    [ "\$REMAINING" -le 0 ] && cleanup_and_exit "Session timeout"
done

cleanup_and_exit "Session ended"
MONITOR_EOF

    chmod +x "$MODPATH/$MONITOR_NAME"
    echo "$MONITOR_NAME"
}

start_server() {
    FOUND_BB=$(find_busybox)
    [ -z "$FOUND_BB" ] && { log_print "Error: Busybox not found"; return 1; }

    if [ -f "$PORT_FILE" ]; then
        EXISTING_PORT=$(cat "$PORT_FILE")
        if [ -n "$EXISTING_PORT" ]; then
             "$FOUND_BB" pkill -f "httpd -p 127.0.0.1:$EXISTING_PORT"
        fi
        rm -f "$PORT_FILE" "$MODPATH/webroot/nexus/uplink_key" "$STATE_FILE"
        rm -f "$MODPATH"/monitor_*.sh
    fi

    "$FOUND_BB" pkill -f "httpd -p 127.0.0.1:"
    "$FOUND_BB" pkill -f "$MODPATH/monitor_"

    rm -f "$MODPATH"/monitor_*.sh "$STATE_FILE"
    rm -rf "$CACHE_DIR" "$BUILD_DIR"

    log_print "Found Busybox: $FOUND_BB"

    RANDOM_PORT=$(generate_random_port)
    log_print "Generated port: $RANDOM_PORT"

    TOKEN=$(generate_secure_token)
    [ -z "$TOKEN" ] && { log_print "Error: Token generation failed"; return 1; }

    mkdir -p "$MODPATH/webroot/nexus"
    echo "$TOKEN" > "$MODPATH/webroot/nexus/uplink_key"
    echo "$RANDOM_PORT" > "$PORT_FILE"
    chmod 700 "$MODPATH/webroot/nexus"
    chmod 600 "$MODPATH/webroot/nexus/uplink_key"
    chmod 644 "$PORT_FILE"

    CURRENT_TIME=$(date +%s)
    DEADLINE=$((CURRENT_TIME + SESSION_TIMEOUT))
    echo "$RANDOM_PORT $DEADLINE $CURRENT_TIME" > "$STATE_FILE"

    [ -f "$MODPATH/webroot/cgi-bin/exec" ] && chmod +x "$MODPATH/webroot/cgi-bin/exec"

    BB_DIR=$("$FOUND_BB" dirname "$FOUND_BB")
    export PATH="$BB_DIR:$PATH"

    log_print "Starting server on port $RANDOM_PORT..."
    "$FOUND_BB" httpd -p 127.0.0.1:$RANDOM_PORT -h "$MODPATH/webroot" >/dev/null 2>&1

    sleep 1
    SERVER_PID=$("$FOUND_BB" pgrep -f "httpd -p 127.0.0.1:$RANDOM_PORT")

    if [ -n "$SERVER_PID" ]; then
        log_print "Server started (PID: $SERVER_PID)"

        MONITOR_SCRIPT=$(create_monitor_script "$RANDOM_PORT" "$MAX_IDLE_TIME")
        su -c "sh $MODPATH/$MONITOR_SCRIPT >/dev/null 2>&1 &"

        log_print "Monitor: $MONITOR_SCRIPT"
        log_print "Auto-shutdown: $((SESSION_TIMEOUT/60))min max / $((MAX_IDLE_TIME/60))min idle"

        (
            for i in 1 2 3; do
                su 2000 -c "cmd notification post -t 'FontCraft' 'Server Started' 'WebUI Listening | Idle: $((MAX_IDLE_TIME/60))min'" >/dev/null 2>&1 && break
                sleep 1
            done
        ) &

        LAUNCH_PORT=$RANDOM_PORT
        return 0
    else
        log_print "Error: Server failed to start"
        rm -f "$MODPATH/webroot/nexus/uplink_key" "$PORT_FILE" "$STATE_FILE"
        return 1
    fi
}

updesc() {
    input="$1"
    file="$2"
    prepend="$3"
    [ -f "$file" ] || { log_print "File not found: $file"; return 1; }
    current_desc=$(awk -F= '/^description=/{print substr($0, index($0,$2)); exit}' "$file")
    if [ "$input" = "False" ]; then
        if [ -z "$prepend" ]; then
            orig=$(printf '%s' "$current_desc" | sed 's/^[^[]*\[\(.*\)\]$/\1/')
            log_print "Restoring original description: '$orig'"
            awk -v orig="$orig" 'BEGIN{done=0} /^description=/ && !done {print "description=" orig; done=1; next} {print}' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        else
            case "$current_desc" in
                "$prepend"*) log_print "Skipping prepend, already starts with: $prepend"; return;;
            esac
            log_print "Prepending: '$prepend' to old description: '$current_desc'"
            awk -v pre="$prepend" -v desc="$current_desc" 'BEGIN{done=0} /^description=/ && !done {print "description=" pre " [" desc "]"; done=1; next} {print}' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        fi
    else
        log_print "Setting description to: '$input'"
        awk -v input="$input" 'BEGIN{done=0} /^description=/ && !done {print "description=" input; done=1; next} {print}' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
    fi
}

install_font() {
    font_name=$1
    font_path=$2
    dest_path=$3/system/fonts/

    ui_print "###########################"
    ui_print "   >[Installing $font_name font...]< "
    sleep 0.2

    mkdir -p "$dest_path"

    if [ "$font_name" = "Emoji" ]; then
        ui_print "   >[Renaming and installing emoji font...]< "
        cp "$font_path" "$dest_path/NotoColorEmoji.ttf" || {
            ui_print "   >[Error: Failed to copy NotoColorEmoji.ttf.]< "
            exit 1
        }
        ui_print "   >[Successfully installed emoji font as NotoColorEmoji.ttf]< "
        emoji="$selected_item"
    elif [ "$font_name" = "Fonts" ]; then
        ui_print "   >[Renaming and installing font...]< "
        ttf_file=$(find "$font_path" -type f -name '*.ttf' | head -n 1)
        if [ -z "$ttf_file" ]; then
            ui_print "   >[Error: No TTF file found in $font_path.]< "
            exit 1
        fi
        tmp_dir="$TMPDIR/processed_font"
        mkdir -p "$tmp_dir"
        cp "$ttf_file" "$tmp_dir/selected_font.ttf" || {
            ui_print "   >[Error: Failed to copy selected_font.ttf.]< "
            exit 1
        }
        ui_print "   >[Moved selected_font.ttf to $tmp_dir]< "
        sleep 0.5

        core_fonts="Roboto-Regular.ttf RobotoStatic-Regular.ttf RobotoFlex-Regular.ttf DroidSansMono.ttf CutiveMono.ttf NotoSerif-Regular.ttf NotoSerif-Bold.ttf NotoSerif-Italic.ttf NotoSerif-BoldItalic.ttf SourceSansPro-Regular.ttf SourceSansPro-Italic.ttf SourceSansPro-SemiBold.ttf SourceSansPro-SemiBoldItalic.ttf SourceSansPro-Bold.ttf SourceSansPro-BoldItalic.ttf ComingSoon.ttf DancingScript-Regular.ttf CarroisGothicSC-Regular.ttf"

        replaced_count=0
        skipped_count=0

        for dest_file in $core_fonts; do
            if [ -f "/system/fonts/$dest_file" ]; then
                cp "$tmp_dir/selected_font.ttf" "$dest_path/$dest_file" || {
                    ui_print "   >[Error: Failed to copy $dest_file.]< "
                    exit 1
                }
                replaced_count=$((replaced_count + 1))
            else
                ui_print "   >[Skipped: $dest_file (not found in system)]< "
                skipped_count=$((skipped_count + 1))
            fi
        done

        ui_print "   >[Successfully replaced $replaced_count font files.]< "
        ui_print "   >[Skipped $skipped_count font files.]< "

        font="$selected_item"
    else
        ui_print "Error: Invalid font type. Must be 'Font' or 'Emoji'."
        exit 1
    fi

    sleep 0.2
    ui_print "###########################"
}

extract_info() {
    file="$1"
    category="$2"
    input="$3"
    emoji_list=""
    font_list=""
    if [ -z "$file" ]; then
        file=$(ls -t *.json 2>/dev/null | head -n 1)
        if [ -z "$file" ]; then
            ui_print "   >[No JSON file found!]< "
            return 1
        fi
    fi
    if [ -z "$category" ]; then
        ui_print "   >[Available categories: Emoji, Fonts]< "
        return 0
    fi
    if [ "$category" != "Emoji" ] && [ "$category" != "Fonts" ]; then
        ui_print "   >[Invalid category! Use: Emoji or Fonts]< "
        return 1
    fi
    if [ -z "$input" ]; then
        values=$($jq -r --arg cat "$category" '.[$cat] | keys[]' "$file")
    else
        if $jq -e --arg cat "$category" --arg key "$input" '.[$cat][$key].files | length > 0' "$file" > /dev/null 2>&1; then
            values=$($jq -r --arg cat "$category" --arg key "$input" '.[$cat][$key].files[].filename' "$file")
        else
            ui_print "   >[Error: '$input' structure invalid in JSON!]<"
            return 1
        fi
    fi
    if [ -z "$values" ]; then
        ui_print "   >[No values found in $category!]< "
        return 1
    fi
    list_build=""
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
    url="$1"
    output_path="$2"
    file_size="$3"

    if [ -z "$url" ] || [ -z "$output_path" ]; then
        ui_print "   >[Error: Missing parameters for download.]< "
        return 1
    fi

    if ! command -v wget >/dev/null 2>&1; then
        ui_print "   >[Error: wget not found!]< "
        return 1
    fi

    if [ -n "$file_size" ] && [ "$file_size" != "Unknown Size" ]; then
        ui_print "   >[Downloading: $(basename "$output_path") | Size: $file_size]< "
    else
        ui_print "   >[Downloading: $(basename "$output_path")]< "
    fi

    wget -q --no-check-certificate -O "$output_path" "$url"
    wget_status=$?

    if [ $wget_status -ne 0 ]; then
        ui_print "   >[Download failed with error code: $wget_status]< "
        rm -f "$output_path"
        return 1
    fi

    if [ -s "$output_path" ]; then
        ui_print "   >[Successfully downloaded]< "
        return 0
    else
        ui_print "   >[Error: Downloaded file is empty.]< "
        rm -f "$output_path"
        return 1
    fi
}

get_working_mirror() {
    mirrors_url="https://fontcraft.pages.dev/mirrors.json"
    mirrors_json=""
    test_url=""

    JSON_URL="https://raw.githubusercontent.com/RipperHybrid/FontCraft/Master/fonts.json"

    ui_print "   >[🔍 Fetching mirror list...]< "

    if ! command -v wget >/dev/null 2>&1; then
        ui_print "   >[⚠️ wget not found, using default mirror]< "
        return 0
    fi

    mirrors_json=$(wget -T 10 -q -O - "$mirrors_url" 2>/dev/null)

    if [ -z "$mirrors_json" ]; then
        ui_print "   >[⚠️ Failed to fetch mirrors.json, using default mirror]< "
        return 0
    fi

    ui_print "   >[🧪 Testing mirrors for availability...]< "

    mirror_count=$(echo "$mirrors_json" | $jq -r '.mirrors | length' 2>/dev/null)

    if [ -z "$mirror_count" ] || [ "$mirror_count" = "null" ]; then
        ui_print "   >[⚠️ Invalid mirrors.json format, using default mirror]< "
        return 0
    fi

    i=0
    while [ $i -lt "$mirror_count" ]; do
        test_url=$(echo "$mirrors_json" | $jq -r --argjson idx "$i" '.mirrors[$idx].url' 2>/dev/null)
        repo=$(echo "$mirrors_json" | $jq -r --argjson idx "$i" '.mirrors[$idx].repo' 2>/dev/null)

        if [ -z "$test_url" ] || [ "$test_url" = "null" ]; then
            i=$((i + 1))
            continue
        fi

        ui_print "   >[🔃 Testing mirror $((i + 1)): $repo]< "

        if wget -T 10 -q --spider "$test_url" >/dev/null 2>&1; then
            ui_print "   >[✅ Mirror $((i + 1)) is working! Using: $repo]< "
            JSON_URL="$test_url"
            return 0
        else
            ui_print "   >[❌ Mirror $((i + 1)): $repo failed]< "
        fi

        i=$((i + 1))
    done

    ui_print "   >[⚠️ All mirrors failed, using default fallback]< "
    return 1
}

download_tools() {
    if [ -d "$MODPATH/binaries" ]; then
        chmod +x "$MODPATH"/binaries/*
        ui_print "   >[✅ Set execute permissions for all binaries.]< "
    fi

    get_working_mirror

    if command -v wget >/dev/null 2>&1; then
        ui_print "   >[🛡️ Using wget downloader]< "
        wget --no-check-certificate -qO "$JSON_PATH" "$JSON_URL"
    else
        ui_print "   >[❌ No downloader found (wget required).]< "
        return 1
    fi

    if [ -s "$JSON_PATH" ] && [ -s "$jq" ]; then
        ui_print "   >[✅ JSON and jq_tool downloaded successfully.]< "
    else
        ui_print "    >[❌ Failed to download required files.]< "
        ui_print "    >[⚠️ Try using a VPN or download the offline version of the module.]< "
        abort "   >[❌ Installation aborted. Use the offline version.]< "
    fi
}