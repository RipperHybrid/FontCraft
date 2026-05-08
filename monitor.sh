#!/system/bin/sh
MODPATH="${0%/*}"
FC_ROOT="/cache/fontcraft"
STATE_FILE="$FC_ROOT/.session_state"

find_busybox() {
    for candidate in /data/adb/ksu/bin/busybox /data/adb/magisk/busybox /data/adb/ap/bin/busybox /system/bin/busybox; do
        if [ -f "$candidate" ] && [ -x "$candidate" ]; then
            if "$candidate" true >/dev/null 2>&1; then
                echo "$candidate"
                return 0
            fi
        fi
    done
    return 1
}

BB=$(find_busybox)
[ -z "$BB" ] && exit 1

while [ -f "$STATE_FILE" ]; do
    sleep 5

    read PORT DEADLINE < "$STATE_FILE"
    PORT=$(echo "$PORT" | tr -d '\r' | tr -d ' ')
    DEADLINE=$(echo "$DEADLINE" | tr -d '\r' | tr -d ' ')

    [ -z "$PORT" ] || [ -z "$DEADLINE" ] && continue

    if ! "$BB" ps | grep -v grep | grep -q "httpd -p 127.0.0.1:$PORT"; then
         break
    fi

    CURRENT=$("$BB" date +%s)

    if [ "$CURRENT" -ge "$DEADLINE" ]; then
        "$BB" pkill -f "httpd -p 127.0.0.1:$PORT"
        for i in 1 2 3; do
            su 2000 -c "cmd notification post -t 'FontCraft' 'WebUI Stopped' 'Session timed out'" >/dev/null 2>&1 && break
            sleep 1
        done
        break
    fi
done

rm -rf "$FC_ROOT"
exit 0