#!/system/bin/sh

logger() {
    local message="$1"
      echo "$message"
      echo "$(date '+%d.%m.%y %T'): $message" >> "$log_file"
}

set -x
font=none
emoji=none
jq="$MODPATH/jq/jq"
UPDIR="/data/adb/modules_update/StylizeText" 
JSON_URL="https://raw.githubusercontent.com/RipperHybrid/FontCraft/Master/fonts.json" 
JSON_PATH="$TMPDIR/fonts.json" 

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
    echo "   >[Input not detected. Try again ($attempts/3)]< "
    echo " "
  done
  echo "   >[Input not detected after 3 attempts. Aborting.]< "
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
    dest_path=$3/system/fonts/

    logger "###########################"
    logger "   >[Installing $font_name font...]< "
    sleep 0.2

    mkdir -p "$dest_path"
    logger "   >[Created destination directory for $font_name at $dest_path]< "
    sleep 0.5

    if [ "$font_name" = "Emoji" ]; then
        logger "   >[Renaming and installing emoji font...]< "
        cp "$font_path" "$dest_path/NotoColorEmoji.ttf" || {
            logger "   >[Error: Failed to copy NotoColorEmoji.ttf."
            exit 1
        }
        logger "   >[Successfully installed emoji font as NotoColorEmoji.ttf]< "
        emoji="$selected_item"
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
            cp "$tmp_dir/selected_font.ttf" "$dest_path/$dest_file" || {
                logger "   >[Error: Failed to copy $dest_file.]< "
                exit 1
            }
        done
        logger "   >[$font_name font successfully installed.]< "
        font="$selected_item"
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
    elif command -v wget >/dev/null 2>&1; then
        wget -qO "$JSON_PATH" "$JSON_URL"
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