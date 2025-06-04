#!/system/bin/sh

logger() {
    local message="$1"
      echo "$message"
      echo "$(date '+%d.%m.%y %T'): $message" >> "$log_file"
}

font=none
emoji=none

chooseport() {
  [ "$1" ] && local delay=$1 || local delay=10
  local attempts=0
  while [ $attempts -lt 3 ]; do
    local count=0
    while true; do
      timeout $delay /system/bin/getevent -lqc 1 2>&1 > $TMPDIR/events &
      sleep 0.5; count=$((count + 1))
      grep -q 'KEY_VOLUMEUP *DOWN' $TMPDIR/events && return 0
      grep -q 'KEY_VOLUMEDOWN *DOWN' $TMPDIR/events && return 1
      [ $count -gt 9 ] && break
    done
    attempts=$((attempts + 1))
    echo "- Volume key not detected. Try again ($attempts/3)"
    echo " "
  done
  echo "- Volume key not detected after 3 attempts. Aborting."
  return 1
}

VKSEL=chooseport
log_file="/cache/FCraft-Installation.log"

updesc() {
    input="$1"
    file="$2"
    prepend="$3"
    [ -f "$file" ] || { logger "   >[File not found: $file]< "; return 1; }
    current_desc=$(awk -F= '/^description=/{print substr($0, index($0,$2)); exit}' "$file")
    if [ "$input" = "False" ]; then
        if [ -z "$prepend" ]; then
            orig=$(printf '%s' "$current_desc" | sed 's/^[^[]*\[\(.*\)\]$/\1/')
            logger "   >[Restoring original description: '$orig']< "
            awk -v orig="$orig" 'BEGIN{done=0} /^description=/ && !done {print "description=" orig; done=1; next} {print}' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        else
            case "$current_desc" in
                "$prepend"*) logger "   >[Skipping prepend, already starts with: $prepend]< "; return;;
            esac
            logger "   >[Prepending: '$prepend' to old description: '$current_desc']< "
            awk -v pre="$prepend" -v desc="$current_desc" 'BEGIN{done=0} /^description=/ && !done {print "description=" pre " [" desc "]"; done=1; next} {print}' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        fi
    else
        logger "   >[Setting description to: '$input']< "
        awk -v input="$input" 'BEGIN{done=0} /^description=/ && !done {print "description=" input; done=1; next} {print}' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
    fi
}

check_enforce_status() {
    local flag_file="/data/adb/zygisksu/denylist_enforce"
    local modprop="$1"
    [ -f "$flag_file" ] || return 0
    if [ "$(cat "$flag_file")" = "1" ]; then
        updesc "False" "$modprop" "❌ Emoji may not work: Zygisk Next DenyList is enforced"
        return 1
    fi
    return 0
}

install_font() {
    font_name=$1
    font_path=$2
    logger "###########################"
    logger "   >[Installing $font_name font...]< "
    sleep 0.2
    mkdir -p "$MODPATH/new_system/fonts"
    logger "   >[Created destination directory for $font_name]< "
    sleep 0.5
    if [ "$font_name" = "Emoji" ]; then
        logger "   >[Renaming and installing emoji font...]< "
        cp "$font_path" "$MODPATH/new_system/fonts/NotoColorEmoji.ttf" || {
            logger "   >[Error: Failed to copy NotoColorEmoji.ttf."
            exit 1
        }
        logger "   >[Successfully installed emoji font as NotoColorEmoji.ttf]< "
        emoji="$selected_item"
        mka_postfs
    elif [ "$font_name" = "Fonts" ]; then
        logger "   >[Renaming and installing font...]< "
        ttf_file=$(find "$font_path" -type f -name '*.ttf' | head -n 1)
        if [ -z "$ttf_file" ]; then
            logger "   >[Error: No TTF file found in $font_path.]< "
            exit 1
        fi
        tmp_dir="$TMPDIR/processed_font"
        mkdir -p "$tmp_dir"
        logger "   >[Created temporary directory: $tmp_dir]< "
        sleep 0.5
        cp "$ttf_file" "$tmp_dir/selected_font.ttf" || {
            logger "   >[Error: Failed to copy selected_font.ttf."
            exit 1
        }
        logger "   >[Moved selected_font.ttf to $tmp_dir]< "
        sleep 0.5
        for dest_file in SourceSansPro-Regular.ttf RobotoStatic-Regular.ttf Roboto-Regular.ttf DroidSansMono.ttf; do
            cp "$tmp_dir/selected_font.ttf" "$MODPATH/new_system/fonts/$dest_file" || {
                logger "   >[Error: Failed to copy $dest_file.]< "
                exit 1
            }
        done
        logger "   >[$font_name font successfully installed.]< "
        font="$selected_item"
        mka_postfs
    else
        logger "Error: Invalid font type. Must be 'Font' or 'Emoji'."
        exit 1
    fi
    sleep 0.2
    logger "###########################"
}

extract_info() {
    local file="$1"
    local category="$2"
    local input="$3"
    local values
    if [ -z "$file" ]; then
        file=$(ls -t *.json 2>/dev/null | head -n 1)
        if [ -z "$file" ]; then
            logger "   >[No JSON file found!]< "
            return 1
        fi
    fi
    if [ -z "$category" ]; then
        logger "   >[Available categories: Emoji, Fonts]< "
        return 0
    fi
    if [ "$category" != "Emoji" ] && [ "$category" != "Fonts" ]; then
        logger "   >[Invalid category! Use: Emoji or Fonts]< "
        return 1
    fi
    if [ -z "$input" ]; then
        values=$($jq -r --arg cat "$category" '.[$cat] | keys[]' "$file")
    else
        if $jq -e --arg cat "$category" --arg key "$input" '.[$cat][$key] | length > 0' "$file" > /dev/null 2>&1; then
            values=$($jq -r --arg cat "$category" --arg key "$input" '.[$cat][$key][]' "$file")
        else
            logger "$input not found in $category!"
            return 1
        fi
    fi
    if [ -z "$values" ]; then
        logger "   >[No values found in $category!]< "
        return 1
    fi
    emoji_list=""
    font_list=""
    if [ "$category" = "Emoji" ]; then
        for value in $values; do
            emoji_list="$emoji_list $value,"
        done
        emoji_list="${emoji_list# }"
    else
        for value in $values; do
            font_list="$font_list $value,"
        done
        font_list="${font_list# }"
    fi
}

mka_postfs() {
cat > "$MODPATH/post-fs-data.sh" << 'EOF'
#!/system/bin/sh

MODPATH="${0%/*}"
log() { logger "[StylizeText] post-fs: $1"; }
. "$MODPATH"/ffun.sh

log "post-fs-data.sh started"

update_system_folder() {
  local system_folder="$MODPATH/system"
  local new_system_folder="$MODPATH/new_system"

  if [ -d "$new_system_folder" ]; then
    if [ -d "$system_folder" ]; then
      log "Removing existing system folder: $system_folder"
      rm -rf "$system_folder" && log "Removed $system_folder" || log "Failed to remove $system_folder"
    fi
    log "Moving new_system → system: $new_system_folder → $system_folder"
    mv "$new_system_folder" "$system_folder" && log "Moved successfully" || log "Failed to move"
  else
    log "No new_system folder found; skipping move"
  fi
}

update_system_folder

check_enforce_status "$MODPATH/module.prop" || exit 0

EMOJI_FONT="$MODPATH/system/fonts/NotoColorEmoji.ttf"
if [ -f "$EMOJI_FONT" ]; then
  log "Found emoji font, mounting..."
  if mount --bind "$EMOJI_FONT" /system/fonts/NotoColorEmoji.ttf; then
    log "Mount successful"
    updesc False "$MODPATH/module.prop"
  else
    log "Mount failed"
  fi
else
  log "Emoji font not found at $EMOJI_FONT"
fi

EOF
}

download_ef() {
    local name="$1"
    local output_path="$2"
    local category="$selection_type"  
    if [ -z "$name" ] || [ -z "$output_path" ]; then
        logger "   >[Error: Missing parameters for download.]< "
        return 1
    fi
    if [ "$category" = "emoji" ]; then
        base_url="https://raw.githubusercontent.com/RipperHybrid/FontCraft/Master/Emoji"
    else
        base_url="https://raw.githubusercontent.com/RipperHybrid/FontCraft/Master/Fonts"
    fi
    url="$base_url/$selected_item/$name"
    logger "   >[Downloading from: $url]< "
    if command -v curl >/dev/null 2>&1; then
        curl -sL "$url" -o "$output_path"
    elif command -v wget >/dev/null 2>&1; then
        wget -qO "$output_path" "$url"
    else
        logger "   >[No downloader found (curl/wget).]< "
        return 1
    fi
    if [ -s "$output_path" ]; then
        logger "   >[Successfully downloaded: $name]< "
        return 0
    else
        logger "- Failed to download: $name"
        return 1
    fi
}

download_tools() {
    if command -v curl >/dev/null 2>&1; then
        curl -sL "$JSON_URL" -o "$JSON_PATH"
        curl -sL "$JQ_URL" -o "$jq"
    elif command -v wget >/dev/null 2>&1; then
        wget -qO "$JSON_PATH" "$JSON_URL"
        wget -qO "$jq" "$JQ_URL"
    else
        logger "   >[❌ No downloader found (curl/wget).]< "
        return 1
    fi

    chmod +x "$jq"

    if [ -s "$JSON_PATH" ] && [ -s "$jq" ]; then
        logger "   >[✅ JSON and jq_tool downloaded successfully.]< "
    else
        logger "-    >[❌ Failed to download required files.]< "
        logger "-    >[⚠️ Try using a VPN or download the offline version of the module.]< "
        abort "   >[❌ Installation aborted. Use the offline version.]< "
    fi
}