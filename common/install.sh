#!/sbin/sh

. "$MODPATH"/ffun.sh || { echo "Error: Failed to source ffun.sh"; exit 1; }
JSON_URL="https://raw.githubusercontent.com/RipperHybrid/FontCraft/Master/fonts.json" 
JSON_PATH="$TMPDIR/fonts.json" 
both=false

select_item() { 
    logger "###########################" 
    logger "- Select An Item" 
    
    selected_item="" 
    IFS="," 
    set -- $selection_list
    unset IFS

    for item; do
        item=$(echo "$item" | sed 's/^ *//;s/ *$//')
        logger "   >[$item]< "
        if $VKSEL; then
            selected_item="$item"
            break
        fi 
    done  

    if [ -z "$selected_item" ]; then
        logger "   >[Error: No item selected.]<"
        exit 1 
    fi  

    logger "   >[Selected $selected_item $selection_type...]<"  

    if [ "$selection_type" = "font" ]; then
        handle_selection "Fonts" "$selected_item"
    elif [ "$selection_type" = "emoji" ]; then
        handle_selection "Emoji" "$selected_item"
    else
        logger "   >[Error: Invalid selection type.]<"
        exit 1 
    fi  
}

handle_selection() { 
    local category="$1" 
    local selected_item="$2"

    logger "   >[Extracting available versions for: $selected_item]<"
    extract_info "$JSON_PATH" "$category" "$selected_item"

    local item_list="" 
    if [ "$category" = "Fonts" ]; then
        item_list="$font_list" 
    else     
        item_list="$emoji_list"
    fi  

    if [ -z "$item_list" ]; then
        logger "   >[Error: No matching $category found!]<"
        exit 1 
    fi  

    item_list=$(echo "$item_list" | sed 's/,$//')
    item_count=$(echo "$item_list" | awk -F, '{print NF}')

    if [ "$item_count" -eq 1 ]; then
        selected_version=$(echo "$item_list" | sed 's/^ *//;s/ *$//')
        logger "   >[Auto-selecting $category: $selected_version]<"
    else     
        logger "###########################"
        logger "- Select $category Version"
        logger "###########################"

        selected_version=""
        IFS=","
        set -- $item_list
        unset IFS

        for item; do
            item=$(echo "$item" | sed 's/^ *//;s/ *$//')
            logger "   >[$item]< "
            if $VKSEL; then
                selected_version="$item"
                break
            fi
        done
    fi

    if [ -z "$selected_version" ]; then
        logger "   >[Error: No version selected!]<"
        exit 1 
    fi  

    logger "   >[Downloading $category: $selected_version]<"
    item_path="$TMPDIR/${selected_version}.ttf"
    download_ef "$selected_version" "$item_path"

    if [ ! -f "$item_path" ]; then
        logger "   >[Error: $category download failed!]<"
        exit 1 
    fi  

    logger "   >[Installing $category: $selected_version]<"
    install_font "$category" "$item_path"
}

select_mode() { 
    logger "###########################" 
    logger "- Select A Mode"
    logger "1. Emojis"
    logger "2. Fonts"
    logger "3. Both"
    logger "4. Exit"
    logger "###########################"  

    local selected_mode=""
    for mode in 1 2 3 4; do
        logger "   >[$mode]< "
        if $VKSEL; then
            selected_mode="$mode"
            break
        fi
    done

    if [ -n "$selected_mode" ]; then
        case "$selected_mode" in
            1)
                logger "   >[Selected Mode: Emojis]<"
                extract_info "$JSON_PATH" Emoji
                selection_list="$emoji_list"
                selection_type="emoji"
                select_item
                updesc "📌 Applied $emoji font injection" "$MODPATH/module.prop"
                ;;
            2)
                logger "   >[Selected Mode: Fonts]<"
                extract_info "$JSON_PATH" Fonts
                selection_list="$font_list"
                selection_type="font"
                select_item
                updesc "📌 Applied $font font injection" "$MODPATH/module.prop"
                ;;
            3)
                logger "   >[Selected Mode: Both]<"
                logger "   >[Select A Font]<"
                extract_info "$JSON_PATH" Fonts
                selection_list="$font_list"
                selection_type="font"
                select_item
                logger "###########################" 
                logger "   >[Selected Mode: Both]<"
                logger "   >[Select An Emoji]<"
                extract_info "$JSON_PATH" Emoji
                selection_list="$emoji_list"
                selection_type="emoji"
                select_item
                updesc "📌 Injected $font font and $emoji emoji support" "$MODPATH/module.prop"
                ;;
            4)
                logger "   >[Exiting...]<"
                exit 0
                ;;
            *)
                logger "   >[Invalid Selection, Aborting.]<"
                exit 1
                ;;
        esac
    else       
        logger "   >[No mode selected, aborting.]<"
        exit 1   
    fi  
}

if [ -f "$log_file" ]; then
rm -f "$log_file"
fi
logger "####################################" 
logger "   >[Magisk & KernelSU Compatible]<"  
logger "####################################" 
logger "   >[🔄 Downloading latest font info JSON...]<" && download_tools && select_mode