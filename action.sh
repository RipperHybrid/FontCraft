#!/system/bin/sh

MODPATH="${0%/*}"
. "$MODPATH"/ffun.sh || { echo "Error: Failed to source ffun.sh"; exit 1; }
UPDIR="/data/adb/modules_update/StylizeText" 
JSON_URL="https://raw.githubusercontent.com/RipperHybrid/FontCraft/Master/fonts.json" 
JQ_URL="https://github.com/RipperHybrid/FontCraft/raw/refs/heads/Master/common/addon/jq/tool/jq"
JSON_PATH="$TMPDIR/fonts.json" 
jq="$TMPDIR/jq" 
both=false

select_item() {
    logger "###########################"
    logger "- Select An Item"
    items=$(echo "$selection_list" | sed 's/,/ /g')
    set -- $items
    count=$#
    pos=1
    while :; do
        i=1
        for item; do
            [ $i -eq $pos ] && logger "   >[$item]<"
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
    category="$1"
    selected_item="$2"
    logger "   >[Extracting available versions for: $selected_item]<"
    extract_info "$JSON_PATH" "$category" "$selected_item"
    if [ "$category" = "Fonts" ]; then
        item_list="$font_list"
    else
        item_list="$emoji_list"
    fi
    item_list=$(echo "$item_list" | sed 's/,$//')
    items=$(echo "$item_list" | sed 's/,/ /g')
    set -- $items
    count=$#
    if [ "$count" -eq 1 ]; then
        selected_version="$1"
        logger "   >[Auto-selecting $category: $selected_version]<"
    else
        logger "###########################"
        logger "- Select $category Version"
        logger "###########################"
        pos=1
        while :; do
            i=1
            for item; do
                [ $i -eq $pos ] && logger "   >[$item]<"
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
    install_font "$category" "$item_path" "$UPDIR"
}

select_mode() {
    logger "###########################"
    logger "- Select A Mode"
    logger "1. Emojis"
    logger "2. Fonts"
    logger "3. Both"
    logger "4. Exit"
    logger "###########################"
    modes="Emojis Fonts Both Exit"
    set -- $modes
    count=4
    pos=1
    while :; do
        i=1
        for mode in $modes; do
            [ $i -eq $pos ] && logger "   >[$i. $mode]<"
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
            logger "   >[Selected Mode: Emojis]<"
            extract_info "$JSON_PATH" Emoji
            selection_list="$emoji_list"
            selection_type="emoji"
            select_item
            updesc "📥 Applied $emoji font injection" "$UPDIR/module.prop"
            touch "$MODPATH/update"
            ;;
        2)
            logger "   >[Selected Mode: Fonts]<"
 "$JSON_PATH" Fonts
            selection_list="$font_list"
            selection_type="font"
            select_item
            updesc "📥 Applied $font font injection" "$UPDIR/module.prop"
            touch "$MODPATH/update"
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
            updesc "📥 Injected $font font and $emoji emoji support" "$UPDIR/module.prop"
            touch "$MODPATH/update"
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
}

if [ -f "$log_file" ]; then
rm -f "$log_file"
fi
logger "####################################" 
logger "   >[Magisk & KernelSU Compatible]<"  
logger "####################################" 
logger "   >[🔄 Downloading latest font info JSON...]<"
rsync -a --exclude='update' --exclude='remove' "$MODPATH" "$UPDIR"
download_tools
logger "#############################################"
logger "             Menu Navigation:                     "
logger "  • Touch screen: Move forward (next option)"
logger "  • Volume Up:    Select current option"
logger "  • Volume Down:  Move backward (previous option)"
logger "#############################################"
select_mode
