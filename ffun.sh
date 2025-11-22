#!/system/bin/sh

set -x
font=none
emoji=none
jq="$MODPATH/binaries/jq"
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

updesc() {
    input="$1"
    file="$2"
    prepend="$3"
    [ -f "$file" ] || { ui_print "   >[File not found: $file]< "; return 1; }
    current_desc=$(awk -F= '/^description=/{print substr($0, index($0,$2)); exit}' "$file")
    if [ "$input" = "False" ]; then
        if [ -z "$prepend" ]; then
            orig=$(printf '%s' "$current_desc" | sed 's/^[^[]*\[\(.*\)\]$/\1/')
            ui_print "   >[Restoring original description: '$orig']< "
            awk -v orig="$orig" 'BEGIN{done=0} /^description=/ && !done {print "description=" orig; done=1; next} {print}' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        else
            case "$current_desc" in
                "$prepend"*) ui_print "   >[Skipping prepend, already starts with: $prepend]< "; return;;
            esac
            ui_print "   >[Prepending: '$prepend' to old description: '$current_desc']< "
            awk -v pre="$prepend" -v desc="$current_desc" 'BEGIN{done=0} /^description=/ && !done {print "description=" pre " [" desc "]"; done=1; next} {print}' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        fi
    else
        ui_print "   >[Setting description to: '$input']< "
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
    ui_print "   >[Created destination directory for $font_name at $dest_path]< "
    sleep 0.5

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
        ui_print "   >[Created temporary directory: $tmp_dir]< "
        sleep 0.5
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
    local file="$1"
    local category="$2"
    local input="$3"
    local values
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
    if [ -z "$url" ] || [ -z "$output_path" ]; then
        ui_print "   >[Error: Missing parameters for download.]< "
        return 1
    fi
    ui_print "   >[Downloading from: $url]< "
    if command -v wget >/dev/null 2>&1; then
        wget -qO "$output_path" "$url"
    else
        ui_print "   >[No downloader found (wget required).]< "
        return 1
    fi
    if [ -s "$output_path" ]; then
        ui_print "   >[Successfully downloaded]< "
        return 0
    else
        ui_print "- Failed to download file."
        rm -f "$output_path"
        return 1
    fi
}

download_tools() {
    if command -v wget >/dev/null 2>&1; then
        ui_print "   >[Using wget downloader]< "
        wget -qO "$JSON_PATH" "$JSON_URL"
    else
        ui_print "   >[❌ No downloader found (wget required).]< "
        return 1
    fi

    if [ -d "$MODPATH/binaries" ]; then
        chmod +x "$MODPATH"/binaries/*
        ui_print "   >[✅ Set execute permissions for all binaries.]< "
    fi

    if [ -s "$JSON_PATH" ] && [ -s "$jq" ]; then
        ui_print "   >[✅ JSON and jq_tool downloaded successfully.]< "
    else
        ui_print "-    >[❌ Failed to download required files.]< "
        ui_print "-    >[⚠️ Try using a VPN or download the offline version of the module.]< "
        abort "   >[❌ Installation aborted. Use the offline version.]< "
    fi
}