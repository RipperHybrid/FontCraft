#!/system/bin/sh

MODPATH="${0%/*}"
. "$MODPATH"/ffun.sh
JSON_URL="https://raw.githubusercontent.com/RipperHybrid/FontCraft/Master/fonts.json" 
JQ_URL="https://github.com/RipperHybrid/FontCraft/raw/refs/heads/Master/common/addon/jq/tool/jq"
JSON_PATH="$TMPDIR/fonts.json" 
jq="$TMPDIR/jq" 
both=false

select_item() { 
    echo "###########################" 
    echo "- Select An Item" 
    selected_item="" 
    IFS="," 
    set -- $selection_list
    unset IFS
    for item; do
        item=$(echo "$item" | sed 's/^ *//;s/ *$//')
        echo "   >[$item]< "
        if $VKSEL; then
            selected_item="$item"
            break
        fi 
    done  
    if [ -z "$selected_item" ]; then
        echo "   >[Error: No item selected.]<"
        exit 1 
    fi  
    echo "   >[Selected $selected_item $selection_type...]<"  
    if [ "$selection_type" = "font" ]; then
        handle_selection "Fonts" "$selected_item"
    elif [ "$selection_type" = "emoji" ]; then
        handle_selection "Emoji" "$selected_item"
    else
        echo "   >[Error: Invalid selection type.]<"
        exit 1 
    fi  
}

handle_selection() { 
    local category="$1" 
    local selected_item="$2"
    echo "   >[Extracting available versions for: $selected_item]<"
    extract_info "$JSON_PATH" "$category" "$selected_item"
    local item_list="" 
    if [ "$category" = "Fonts" ]; then
        item_list="$font_list" 
    else     
        item_list="$emoji_list"
    fi  
    if [ -z "$item_list" ]; then
        echo "   >[Error: No matching $category found!]<"
        exit 1 
    fi  
    item_list=$(echo "$item_list" | sed 's/,$//')
    item_count=$(echo "$item_list" | awk -F, '{print NF}')
    if [ "$item_count" -eq 1 ]; then
        selected_version=$(echo "$item_list" | sed 's/^ *//;s/ *$//')
        echo "   >[Auto-selecting $category: $selected_version]<"
    else     
        echo "###########################"
        echo "- Select $category Version"
        echo "###########################"
        selected_version=""
        IFS=","
        set -- $item_list
        unset IFS
        for item; do
            item=$(echo "$item" | sed 's/^ *//;s/ *$//')
            echo "   >[$item]< "
            if $VKSEL; then
                selected_version="$item"
                break
            fi
        done
    fi
    if [ -z "$selected_version" ]; then
        echo "   >[Error: No version selected!]<"
        exit 1 
    fi  
    echo "   >[Downloading $category: $selected_version]<"
    item_path="$TMPDIR/${selected_version}.ttf"
    download_ef "$selected_version" "$item_path"
    if [ ! -f "$item_path" ]; then
        echo "   >[Error: $category download failed!]<"
        exit 1 
    fi  
    echo "   >[Installing $category: $selected_version]<"
    install_font "$category" "$item_path"
}

select_mode() { 
    echo "###########################" 
    echo "- Select A Mode"
    echo "1. Emojis"
    echo "2. Fonts"
    echo "3. Both"
    echo "4. Exit"
    echo "###########################"  
    local selected_mode=""
    for mode in 1 2 3 4; do
        echo "   >[$mode]< "
        if $VKSEL; then
            selected_mode="$mode"
            break
        fi
    done
    if [ -n "$selected_mode" ]; then
        case "$selected_mode" in
            1)
                echo "   >[Selected Mode: Emojis]<"
                extract_info "$JSON_PATH" Emoji
                selection_list="$emoji_list"
                selection_type="emoji"
                select_item
                ;;
            2)
                echo "   >[Selected Mode: Fonts]<"
                extract_info "$JSON_PATH" Fonts
                selection_list="$font_list"
                selection_type="font"
                select_item
                ;;
            3)
                echo "   >[Selected Mode: Both]<"
                echo "   >[Select A Font]<"
                extract_info "$JSON_PATH" Fonts
                selection_list="$font_list"
                selection_type="font"
                select_item
                echo "###########################" 
                echo "   >[Selected Mode: Both]<"
                echo "   >[Select An Emoji]<"
                extract_info "$JSON_PATH" Emoji
                selection_list="$emoji_list"
                selection_type="emoji"
                select_item
                ;;
            4)
                echo "   >[Exiting...]<"
                exit 0
                ;;
            *)
                echo "   >[Invalid Selection, Aborting.]<"
                exit 1
                ;;
        esac
    else       
        echo "   >[No mode selected, aborting.]<"
        exit 1   
    fi  
}

echo "####################################" 
echo "   >[Magisk & KernelSU Compatible]<"  
echo "####################################" 
echo "   >[🔄 Downloading latest font info JSON...]<" && download_tools && select_mode
