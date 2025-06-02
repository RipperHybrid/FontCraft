#!/system/bin/sh

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

install_font() {
    font_name=$1
    font_path=$2
    echo "###########################"
    echo "   >[Installing $font_name font...]< "
    sleep 0.2
    mkdir -p "$MODPATH/new_system/fonts"
    echo "   >[Created destination directory for $font_name]< "
    sleep 0.5
    if [ "$font_name" = "Emoji" ]; then
        echo "   >[Renaming and installing emoji font...]< "
        cp "$font_path" "$MODPATH/new_system/fonts/NotoColorEmoji.ttf" || {
            echo "   >[Error: Failed to copy NotoColorEmoji.ttf."
            exit 1
        }
        echo "   >[Successfully installed emoji font as NotoColorEmoji.ttf]< "
        mka_postfs
    elif [ "$font_name" = "Fonts" ]; then
        echo "   >[Renaming and installing font...]< "
        ttf_file=$(find "$font_path" -type f -name '*.ttf' | head -n 1)
        if [ -z "$ttf_file" ]; then
            echo "   >[Error: No TTF file found in $font_path.]< "
            exit 1
        fi
        tmp_dir="$TMPDIR/processed_font"
        mkdir -p "$tmp_dir"
        echo "   >[Created temporary directory: $tmp_dir]< "
        sleep 0.5
        cp "$ttf_file" "$tmp_dir/selected_font.ttf" || {
            echo "   >[Error: Failed to copy selected_font.ttf."
            exit 1
        }
        echo "   >[Moved selected_font.ttf to $tmp_dir]< "
        sleep 0.5
        for dest_file in SourceSansPro-Regular.ttf RobotoStatic-Regular.ttf Roboto-Regular.ttf DroidSansMono.ttf; do
            cp "$tmp_dir/selected_font.ttf" "$MODPATH/new_system/fonts/$dest_file" || {
                echo "   >[Error: Failed to copy $dest_file.]< "
                exit 1
            }
        done
        echo "   >[$font_name font successfully installed.]< "
        mka_postfs
    else
        echo "Error: Invalid font type. Must be 'Font' or 'Emoji'."
        exit 1
    fi
    sleep 0.2
    echo "###########################"
}

extract_info() {
    local file="$1"
    local category="$2"
    local input="$3"
    local values
    if [ -z "$file" ]; then
        file=$(ls -t *.json 2>/dev/null | head -n 1)
        if [ -z "$file" ]; then
            echo "   >[No JSON file found!]< "
            return 1
        fi
    fi
    if [ -z "$category" ]; then
        echo "   >[Available categories: Emoji, Fonts]< "
        return 0
    fi
    if [ "$category" != "Emoji" ] && [ "$category" != "Fonts" ]; then
        echo "   >[Invalid category! Use: Emoji or Fonts]< "
        return 1
    fi
    if [ -z "$input" ]; then
        values=$($jq -r --arg cat "$category" '.[$cat] | keys[]' "$file")
    else
        if $jq -e --arg cat "$category" --arg key "$input" '.[$cat][$key] | length > 0' "$file" > /dev/null 2>&1; then
            values=$($jq -r --arg cat "$category" --arg key "$input" '.[$cat][$key][]' "$file")
        else
            echo "$input not found in $category!"
            return 1
        fi
    fi
    if [ -z "$values" ]; then
        echo "   >[No values found in $category!]< "
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

update_system_folder() {
    local system_folder="$MODPATH/system"
    local new_system_folder="$MODPATH/new_system"
    
    if [ -d "$system_folder" ]; then
        rm -rf "$system_folder"
    fi

    if [ -d "$new_system_folder" ]; then
        mv "$new_system_folder" "$system_folder"
        find "$system_folder" -type f -exec chmod 644 {} \;
    fi
}

update_system_folder

EMOJI_FONT="$MODPATH/system/fonts/NotoColorEmoji.ttf"
if [ -f "$EMOJI_FONT" ]; then
    mount --bind "$EMOJI_FONT" /system/fonts/NotoColorEmoji.ttf
fi

rm -f "$MODPATH/post-fs-data.sh"

EOF
}

download_ef() {
    local name="$1"
    local output_path="$2"
    local category="$selection_type"  
    if [ -z "$name" ] || [ -z "$output_path" ]; then
        echo "   >[Error: Missing parameters for download.]< "
        return 1
    fi
    if [ "$category" = "emoji" ]; then
        base_url="https://raw.githubusercontent.com/RipperHybrid/FontCraft/Master/Emoji"
    else
        base_url="https://raw.githubusercontent.com/RipperHybrid/FontCraft/Master/Fonts"
    fi
    url="$base_url/$selected_item/$name"
    echo "   >[Downloading from: $url]< "
    if command -v curl >/dev/null 2>&1; then
        curl -sL "$url" -o "$output_path"
    elif command -v wget >/dev/null 2>&1; then
        wget -qO "$output_path" "$url"
    else
        echo "   >[No downloader found (curl/wget).]< "
        return 1
    fi
    if [ -s "$output_path" ]; then
        echo "   >[Successfully downloaded: $name]< "
        return 0
    else
        echo "- Failed to download: $name"
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
        echo "   >[❌ No downloader found (curl/wget).]< "
        return 1
    fi

    chmod +x "$jq"

    if [ -s "$JSON_PATH" ] && [ -s "$jq" ]; then
        echo "   >[✅ JSON and jq_tool downloaded successfully.]< "
    else
        echo "-    >[❌ Failed to download required files.]< "
        echo "-    >[⚠️ Try using a VPN or download the offline version of the module.]< "
        abort "   >[❌ Installation aborted. Use the offline version.]< "
    fi
}