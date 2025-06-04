## FontCraft Pro Module - Version 4.0 Changelog

- 🛠 Fixed issue where **emoji fonts weren’t applying system-wide** by adding a `mount --bind` to force-load `NotoColorEmoji.ttf` for all apps.
- 🚫 Added **DenyList enforcement detection**: If Zygisk Next DenyList is enforced, emoji mounting is skipped and a warning is shown.
- ✍️ Introduced the `updesc` function for improved and dynamic updating of the module description, ensuring clean formatting with square brackets only when needed.
- 🧹 General improvements to installation logic and structure for better compatibility and stability.
- 🆕 **Added Google Sans font** for a modern and clean system appearance.