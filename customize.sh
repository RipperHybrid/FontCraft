#!/system/bin/sh

. "$MODPATH"/utils.sh || { echo "Error: Failed to source utils.sh"; exit 1; }
both=false

select_item() {
    ui_print "###########################"
    ui_print "- Select An Item"
    items="$selection_list"
    set -- $(echo "$items" | sed 's/,/ /g')
    count=$#
    pos=1
    while :; do
        i=1
        for item; do
            [ $i -eq $pos ] && ui_print "   >[$item]<"
            i=$((i+1))
        done
        chooseport
        input=$?
        if [ "$input" -eq 0 ]; then
            pos=$((pos % count + 1))
        elif [ "$input" -eq 2 ]; then
            pos=$(( (pos - 2 + count) % count + 1 ))
        elif [ "$input" -eq 1 ]; then
            break
        fi
    done

    i=1
    for item; do
        [ $i -eq $pos ] && selected_item="$item"
        i=$((i+1))
    done

    if [ -z "$selected_item" ]; then
        log "Error: No item selected."
        exit 1
    fi
    log "Selected $selected_item $selection_type..."
    if [ "$selection_type" = "font" ]; then
        handle_selection "Fonts" "$selected_item"
    elif [ "$selection_type" = "emoji" ]; then
        handle_selection "Emoji" "$selected_item"
    else
        log "Error: Invalid selection type."
        exit 1
    fi
}

handle_selection() {
    category="$1"
    selected_item="$2"
    log "Extracting available versions for: $selected_item"

    extract_info "$JSON_PATH" "$category" "$selected_item"
    if [ $? -ne 0 ]; then
        log "Aborting: Could not get file list for $selected_item"
        exit 1
    fi

    if [ "$category" = "Fonts" ]; then
        item_list="$font_list"
    else
        item_list="$emoji_list"
    fi

    if [ -z "$item_list" ]; then
        log "Error: Item list is empty!"
        exit 1
    fi

    set -- $(echo "$item_list" | sed 's/,/ /g')
    count=$#

    if [ "$count" -eq 0 ]; then
        log "Error: No files found!"
        exit 1
    elif [ "$count" -eq 1 ]; then
        selected_version="$1"
        log "Auto-selecting $category: $selected_version"
    else
        ui_print "###########################"
        ui_print "- Select $category Version"
        ui_print "###########################"
        pos=1
        while :; do
            i=1
            for item; do
                [ $i -eq $pos ] && ui_print "   >[$item]<"
                i=$((i+1))
            done
            chooseport
            input=$?
            if [ "$input" -eq 0 ]; then
                pos=$((pos % count + 1))
            elif [ "$input" -eq 2 ]; then
                pos=$(( (pos - 2 + count) % count + 1 ))
            elif [ "$input" -eq 1 ]; then
                break
            fi
        done
        i=1
        for item; do
            [ $i -eq $pos ] && selected_version="$item"
            i=$((i+1))
        done
    fi

    if [ -z "$selected_version" ]; then
        log "Error: No version selected!"
        exit 1
    fi

    log "Fetching download link and file size..."

    download_url=$($jq -r --arg cat "$category" --arg key "$selected_item" --arg file "$selected_version" \
        '.[$cat][$key].files[] | select(.filename == $file) | .download_url' "$JSON_PATH")

    size_bytes=$($jq -r --arg cat "$category" --arg key "$selected_item" --arg file "$selected_version" \
        '.[$cat][$key].files[] | select(.filename == $file) | .size_bytes' "$JSON_PATH")

    if [ -z "$download_url" ] || [ "$download_url" = "null" ]; then
        log "Error: Download URL not found in JSON!"
        exit 1
    fi

    if [ -n "$size_bytes" ] && [ "$size_bytes" != "null" ]; then
        size_mb=$(awk -v bytes="$size_bytes" 'BEGIN { printf "%.2f MB", bytes / 1048576 }')
    else
        size_mb="Unknown Size"
    fi

    item_path="$TMPDIR/${selected_version}"
    download_ef "$download_url" "$item_path" "$size_mb"

    if [ ! -f "$item_path" ]; then
        log "Error: $category download failed!"
        exit 1
    fi
    log "Installing $category: $selected_version"
    install_font "$category" "$item_path" "$MODPATH"
}

select_mode() {
    ui_print "###########################"
    ui_print "- Select Installation Mode"
    ui_print "1. WebUI (Recommended)"
    ui_print "2. CLI - Emojis"
    ui_print "3. CLI - Fonts"
    ui_print "4. CLI - Both"
    ui_print "5. Exit"
    ui_print "###########################"

    modes="WebUI Emojis Fonts Both Exit"
    set -- $modes
    pos=1
    count=5
    while :; do
        i=1
        for mode in $modes; do
            [ $i -eq $pos ] && ui_print "   >[$i. $mode]< " || :
            i=$((i+1))
        done
        chooseport
        input=$?
        if [ "$input" -eq 0 ]; then
            pos=$((pos % count + 1))
        elif [ "$input" -eq 2 ]; then
            pos=$(( (pos - 2 + count) % count + 1 ))
        elif [ "$input" -eq 1 ]; then
            break
        fi
    done

    case "$pos" in
        1)
            log "Selected Mode: WebUI"
            log "Initializing local server..."
            mkdir -p "$STABLE_PATH/binaries"
            chmod -R 755 "$STABLE_PATH/binaries/"
            rm -rf /cache/Template/ && mv "$MODPATH/Template" /cache/ 2>/dev/null
            cp -r "$MODPATH"/binaries/* "$STABLE_PATH/binaries/"
            cp -r "$MODPATH/webroot" "$STABLE_PATH/"
            cp "$MODPATH/monitor.sh" "$STABLE_PATH/"
            chmod -R 755 "$STABLE_PATH/webroot/"
            chmod +x "$STABLE_PATH/monitor.sh"

            if start_server; then
                log "WebUI Listening on http://127.0.0.1:$LAUNCH_PORT"
                log "Opening browser..."
                su 2000 -c "cmd activity start -a android.intent.action.VIEW -d 'http://127.0.0.1:$LAUNCH_PORT/#$LAUNCH_TOKEN'" >/dev/null 2>&1
            else
                log "WebUI failed to start! Please use CLI Mode."
                exit 1
            fi
            ;;
        2)
            log "Selected Mode: CLI - Emojis"
            log "Downloading latest font info JSON..."
            download_tools
            rm -rf /cache/Template/ && mv "$MODPATH/Template" /cache/
            run_cli_selection "Emoji" "emoji"
            modify_prop "description" "Applied $emoji font injection" "$MODPATH/module.prop"
            ;;
        3)
            log "Selected Mode: CLI - Fonts"
            log "Downloading latest font info JSON..."
            download_tools
            rm -rf /cache/Template/ && mv "$MODPATH/Template" /cache/
            run_cli_selection "Fonts" "font"
            modify_prop "description" "Applied $font font injection" "$MODPATH/module.prop"
            ;;
        4)
            log "Selected Mode: CLI - Both"
            log "Downloading latest font info JSON..."
            download_tools
            rm -rf /cache/Template/ && mv "$MODPATH/Template" /cache/

            log "Select A Font"
            run_cli_selection "Fonts" "font"
            log "Select An Emoji"
            run_cli_selection "Emoji" "emoji"

            modify_prop "description" "Injected $font font and $emoji emoji support" "$MODPATH/module.prop"
            ;;
        5)
            log "Exiting..."
            abort
            ;;
        *)
            log "Invalid Selection, Aborting."
            exit 1
            ;;
    esac
}


ui_print "####################################"
ui_print "   >[Magisk & KernelSU Compatible]<"
ui_print "####################################"
check_existing_install
setup_binaries
ui_print "#############################################"
ui_print "            Menu Navigation:                     "
ui_print "  • Touch screen: Move forward (next option)"
ui_print "  • Volume Up:    Select current option"
ui_print "  • Volume Down:  Move backward (previous option)"
ui_print "#############################################"
select_mode