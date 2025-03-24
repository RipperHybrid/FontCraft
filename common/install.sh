#!/sbin/sh

JSON_URL="https://raw.githubusercontent.com/RipperHybrid/FontCraft/Master/fonts.json" 
JSON_PATH="$TMPDIR/fonts.json" 
show_emoji=true 
show_font=true

prompt_next_install() { 
    ui_print "####################################" 
    ui_print "- Do you want to install $( [ "$selection_type" = "font" ] && echo "an emoji pack" || echo "a font" )?" 
    ui_print "1. Yes" 
    ui_print "2. No" 
    ui_print "####################################"

    local selected_option="" 
    for choice in 1 2; do
        ui_print "   >[$choice]< "
        if $VKSEL; then
            selected_option="$choice"
            break
        fi 
    done

    if [ "$selected_option" = "1" ]; then     
        if ! $show_emoji && ! $show_font; then
            ui_print "   >[Both font and emoji are already installed.]<"
            exit 0
        fi

        if [ "$selection_type" = "font" ]; then
            show_font=false
            selection_type="emoji"
        else         
            show_emoji=false
            selection_type="font"
        fi

        ui_print "   >[Switching to $selection_type selection...]<"
        select_mode 
    else     
        ui_print "   >[Installation complete.]<"
    fi  
}

select_item() { 
    ui_print "###########################" 
    ui_print "- Select An Item" 
    
    selected_item="" 
    IFS="," 
    set -- $selection_list
    unset IFS

    for item; do
        item=$(echo "$item" | sed 's/^ *//;s/ *$//')
        ui_print "   >[$item]< "
        if $VKSEL; then
            selected_item="$item"
            break
        fi 
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
    local category="$1" 
    local selected_item="$2"

    ui_print "   >[Extracting available versions for: $selected_item]<"
    extract_info "$JSON_PATH" "$category" "$selected_item"

    local item_list="" 
    if [ "$category" = "Fonts" ]; then
        item_list="$font_list" 
    else     
        item_list="$emoji_list"
    fi  

    if [ -z "$item_list" ]; then
        ui_print "   >[Error: No matching $category found!]<"
        exit 1 
    fi  

    item_list=$(echo "$item_list" | sed 's/,$//')
    item_count=$(echo "$item_list" | awk -F, '{print NF}')

    if [ "$item_count" -eq 1 ]; then
        selected_version=$(echo "$item_list" | sed 's/^ *//;s/ *$//')
        ui_print "   >[Auto-selecting $category: $selected_version]<"
    else     
        ui_print "###########################"
        ui_print "- Select $category Version"
        ui_print "###########################"

        selected_version=""
        IFS=","
        set -- $item_list
        unset IFS

        for item; do
            item=$(echo "$item" | sed 's/^ *//;s/ *$//')
            ui_print "   >[$item]< "
            if $VKSEL; then
                selected_version="$item"
                break
            fi
        done
    fi

    if [ -z "$selected_version" ]; then
        ui_print "   >[Error: No version selected!]<"
        exit 1 
    fi  

    ui_print "   >[Downloading $category: $selected_version]<"
    item_path="$TMPDIR/${selected_version}.ttf"
    download_ef "$selected_version" "$item_path"

    if [ ! -f "$item_path" ]; then
        ui_print "   >[Error: $category download failed!]<"
        exit 1 
    fi  

    ui_print "   >[Installing $category: $selected_version]<"
    install_font "$category" "$item_path"

    { $show_emoji || $show_font; } && prompt_next_install  
}

select_mode() { 
    ui_print "###########################" 
    ui_print "- Select A Mode"

    if $show_emoji; then
        ui_print "1. Emojis"
    fi
    if $show_font; then
        ui_print "2. Fonts"
    fi 
    ui_print "3. Exit"

    ui_print "###########################"  

    local selected_mode=""
    for mode in 1 2 3; do
        if { [ "$mode" = "1" ] && $show_emoji; } || { [ "$mode" = "2" ] && $show_font; } || [ "$mode" = "3" ]; then         
            ui_print "   >[$mode]< "
            if $VKSEL; then
                selected_mode="$mode"
                break
            fi
        fi
    done

    if [ -n "$selected_mode" ]; then
        if [ "$selected_mode" = "1" ] && $show_emoji; then
            ui_print "   >[Selected Mode: Emojis]<"
            show_emoji=false
            export show_emoji
            extract_info "$JSON_PATH" Emoji
            selection_list="$emoji_list"
            selection_type="emoji"
            select_item
        elif [ "$selected_mode" = "2" ] && $show_font; then
            ui_print "   >[Selected Mode: Fonts]<"
            show_font=false
            export show_font
            extract_info "$JSON_PATH" Fonts
            selection_list="$font_list"
            selection_type="font"
            select_item
        else
            ui_print "   >[Exiting...]<"
            exit 0
        fi   
    else       
        ui_print "   >[No mode selected, aborting.]<"
        exit 1   
    fi  
}

ui_print "####################################" 
ui_print "   >[Magisk & KernelSU Compatible]<"  
ui_print "####################################" 
ui_print "   >[🔄 Downloading latest font info JSON...]<" && download_json && select_mode

