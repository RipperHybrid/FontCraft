#!/sbin/sh

. "$MODPATH"/ffun.sh || { echo "Error: Failed to source ffun.sh"; exit 1; }
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
        $VKSEL
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
        ui_print "   >[Error: No item selected.]<"
        exit 1
    fi
    ui_print "   >[Selected $selected_item $selection_type...]<"
    if [ "$selection_type" = "font" ]; then
        handle_selection "Fonts" "$selected_item"
    elif [ "$selection_type" = "emoji" ]; then
        handle_selection "Emoji" "$selected_item"
    else
        ui_print "   >[Error: Invalid selection type.]<"
        exit 1
    fi
}

handle_selection() {
    category="$1"
    selected_item="$2"
    ui_print "   >[Extracting available versions for: $selected_item]<"
    
    extract_info "$JSON_PATH" "$category" "$selected_item"
    if [ $? -ne 0 ]; then
        ui_print "   >[Aborting: Could not get file list for $selected_item]<"
        exit 1
    fi

    if [ "$category" = "Fonts" ]; then
        item_list="$font_list"
    else
        item_list="$emoji_list"
    fi
    
    if [ -z "$item_list" ]; then
        ui_print "   >[Error: Item list is empty!]<"
        exit 1
    fi

    set -- $(echo "$item_list" | sed 's/,/ /g')
    count=$#
    
    if [ "$count" -eq 0 ]; then
        ui_print "   >[Error: No files found!]<"
        exit 1
    elif [ "$count" -eq 1 ]; then
        selected_version="$1"
        ui_print "   >[Auto-selecting $category: $selected_version]<"
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
            $VKSEL
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
        ui_print "   >[Error: No version selected!]<"
        exit 1
    fi
    
    ui_print "   >[Fetching download link...]<"
    download_url=$($jq -r --arg cat "$category" --arg key "$selected_item" --arg file "$selected_version" \
        '.[$cat][$key].files[] | select(.filename == $file) | .download_url' "$JSON_PATH")
        
    if [ -z "$download_url" ] || [ "$download_url" = "null" ]; then
        ui_print "   >[Error: Download URL not found in JSON!]<"
        exit 1
    fi
    
    ui_print "   >[Downloading $category: $selected_version]<"
    item_path="$TMPDIR/${selected_version}"
    download_ef "$download_url" "$item_path"
    
    if [ ! -f "$item_path" ]; then
        ui_print "   >[Error: $category download failed!]<"
        exit 1
    fi
    ui_print "   >[Installing $category: $selected_version]<"
    install_font "$category" "$item_path" "$MODPATH"
}

select_mode() {
    ui_print "###########################"
    ui_print "- Select A Mode"
    ui_print "1. Emojis"
    ui_print "2. Fonts"
    ui_print "3. Both"
    ui_print "4. Exit"
    ui_print "###########################"

    modes="Emojis Fonts Both Exit"
    set -- $modes
    pos=1
    count=4
    while :; do
        i=1
        for mode in $modes; do
            [ $i -eq $pos ] && ui_print "   >[$i. $mode]< " || :
            i=$((i+1))
        done
        $VKSEL
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
            ui_print "   >[Selected Mode: Emojis]<"
            extract_info "$JSON_PATH" Emoji
            selection_list="$emoji_list"
            selection_type="emoji"
            select_item
            updesc "📥 Applied $emoji font injection" "$MODPATH/module.prop"
            ;;
        2)
            ui_print "   >[Selected Mode: Fonts]<"
            extract_info "$JSON_PATH" Fonts
            selection_list="$font_list"
            selection_type="font"
            select_item
            updesc "📥 Applied $font font injection" "$MODPATH/module.prop"
            ;;
        3)
            ui_print "   >[Selected Mode: Both]<"
            ui_print "   >[Select A Font]<"
            extract_info "$JSON_PATH" Fonts
            selection_list="$font_list"
            selection_type="font"
            select_item
            ui_print "###########################"
            ui_print "   >[Selected Mode: Both]<"
            ui_print "   >[Select An Emoji]<"
            extract_info "$JSON_PATH" Emoji
            selection_list="$emoji_list"
            selection_type="emoji"
            select_item
            updesc "📥 Injected $font font and $emoji emoji support" "$MODPATH/module.prop"
            ;;
        4)
            ui_print "   >[Exiting...]<"
            abort
            ;;
        *)
            ui_print "   >[Invalid Selection, Aborting.]<"
            exit 1
            ;;
    esac
}

ui_print "####################################" 
ui_print "   >[Magisk & KernelSU Compatible]<"  
ui_print "####################################" 
ui_print "   >[🔄 Downloading latest font info JSON...]<" && download_tools
ui_print "#############################################"
ui_print "              Menu Navigation:                     "
ui_print "  • Touch screen: Move forward (next option)"
ui_print "  • Volume Up:    Select current option"
ui_print "  • Volume Down:  Move backward (previous option)"
ui_print "#############################################"
select_mode