const MODULE_ID = "StylizeText";
const MODULE_PATH = `/data/adb/modules/${MODULE_ID}`;

export const CONFIG = {
    MIRRORS_URL: "https://fontcraft.pages.dev/mirrors.json",
    DEFAULT_JSON_URL: "https://raw.githubusercontent.com/RipperHybrid/FontCraft/Master/fonts.json",
    TEMPLATE_URL: "https://fontcraft.pages.dev/template.zip",

    TEMP_DIR: "/data/local/tmp/fontcraft_cache",
    BUILD_DIR: "/data/local/tmp/fontcraft_build",
    STORAGE_ROOT: "Start_At_Volume_List",

    MOD_BIN: `${MODULE_PATH}/binaries`,
    LOCAL_TEMPLATE: "/cache/Template/template.zip",

    SYSTEM_FONTS: [
        "Roboto-Regular.ttf",
        "RobotoStatic-Regular.ttf",
        "RobotoFlex-Regular.ttf",
        "DroidSansMono.ttf",
        "CutiveMono.ttf",
        "NotoSerif-Regular.ttf",
        "NotoSerif-Bold.ttf",
        "NotoSerif-Italic.ttf",
        "NotoSerif-BoldItalic.ttf",
        "SourceSansPro-Regular.ttf",
        "SourceSansPro-Italic.ttf",
        "SourceSansPro-SemiBold.ttf",
        "SourceSansPro-SemiBoldItalic.ttf",
        "SourceSansPro-Bold.ttf",
        "SourceSansPro-BoldItalic.ttf",
        "ComingSoon.ttf",
        "DancingScript-Regular.ttf",
        "CarroisGothicSC-Regular.ttf"
    ]
};

export const STATE = {
    ROOT_BIN: null,
    ROOT_MANAGER: null,
    BB: null,
    ROOT_CMD: null,
    ZIP_BIN: null,
    INSTALL_ARGS: null
};