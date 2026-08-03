import { CONFIG, STATE, MODULE_PATH } from './config.js';
import { wait, showToast, checkInternet, cleanupWorkspace } from './utils.js';

export async function processAndFlash() {
    const hasNativeRoot = typeof ksu !== 'undefined';
    const hasBridgeRoot = STATE.ROOT_BIN && STATE.ROOT_CMD;

    if (!hasNativeRoot && !hasBridgeRoot) {
        showToast("Root manager not detected! Please restart the app or check settings.", 'error');
        return;
    }

    const btn = document.getElementById('flashBtn');
    const originalText = btn.innerText;

    btn.disabled = true;
    btn.innerText = "Processing...";
    this.showTerminal();
    this.updateTerminal(">>> Starting Build Process...");
    await wait(100);

    try {
        const isLocalEmoji = this.queue.Emoji && (this.queue.Emoji.path.startsWith('/storage/') || this.queue.Emoji.path.startsWith('/mnt/'));
        const isLocalFont = this.queue.Fonts && (this.queue.Fonts.path.startsWith('/storage/') || this.queue.Fonts.path.startsWith('/mnt/'));

        const templatePath = `${CONFIG.WORK_DIR}/template.zip`;
        const moduleDir = `${CONFIG.WORK_DIR}/module`;
        let useLocalTemplate = false;

        try {
            const checkTemplate = await this.ksuExec(`if [ -f "${CONFIG.LOCAL_TEMPLATE}" ]; then echo "exists"; else echo "not found"; fi`);
            if (checkTemplate.includes("exists")) useLocalTemplate = true;
        } catch(e) {}

        if ((!isLocalEmoji || !isLocalFont) && !useLocalTemplate) {
            if (!(await checkInternet(this.ksuExec.bind(this), STATE.ROOT_BIN, STATE.BB))) throw new Error("No internet connection");
        }

        this.updateTerminal(">>> Cleaning workspace...");
        await this.ksuExec(`mkdir -p "${moduleDir}" && rm -rf "${moduleDir}"/*`);

        if (useLocalTemplate) {
            this.updateTerminal("[1/6] Using cached template (found at LOCAL_TEMPLATE)");
            await this.ksuExec(`cp "${CONFIG.LOCAL_TEMPLATE}" "${templatePath}"`);
        } else {
            this.updateTerminal("[1/6] No cached template found, downloading fresh copy...");
            if (!(await checkInternet(this.ksuExec.bind(this), STATE.ROOT_BIN, STATE.BB))) throw new Error("No internet connection to download template");
            await this.ksuExec(`${STATE.BB} wget --no-check-certificate -O "${templatePath}" "${CONFIG.TEMPLATE_URL}"`);

            this.updateTerminal(">>> Caching template for future use...");
            const localTemplateDir = CONFIG.LOCAL_TEMPLATE.substring(0, CONFIG.LOCAL_TEMPLATE.lastIndexOf('/'));
            try {
                await this.ksuExec(`mkdir -p "${localTemplateDir}" && cp "${templatePath}" "${CONFIG.LOCAL_TEMPLATE}"`);
                this.updateTerminal(`>>> Template cached at ${CONFIG.LOCAL_TEMPLATE}`);
            } catch (e) {
                this.updateTerminal(">>> Warning: Failed to cache template locally (non-fatal)");
            }
        }

        this.updateTerminal("[2/6] Extracting template...");
        await this.ksuExec(`sh -c "${STATE.BB} unzip -o '${templatePath}' -d '${moduleDir}'"`);
        await this.ksuExec(`mkdir -p "${moduleDir}/system/fonts"`);

        let fontName = "";
        let emojiName = "";

        if (this.queue.Emoji) {
            this.updateTerminal(`[3/6] Scanning and replacing native emoji fonts...`);

            const emojiPath = this.queue.Emoji.path;

            const checkCmd = `for f in NotoColorEmoji.ttf SamsungColorEmoji.ttf LGColorEmoji.ttf HTCColorEmoji.ttf; do if [ -f "/system/fonts/$f" ]; then echo "$f"; fi; done`;
            const found = await this.ksuExec(checkCmd);
            const targets = found.split('\n').map(t => t.trim()).filter(Boolean);

            let injected = false;

            for (const target of targets) {
                await this.ksuExec(`cp "${emojiPath}" "${moduleDir}/system/fonts/${target}"`);
                this.updateTerminal(`>>> Replaced: ${target}`);
                injected = true;
            }

            if (!injected) {
                this.updateTerminal(">>> Warning: No known native emojis found. Forcing default.");
                await this.ksuExec(`cp "${emojiPath}" "${moduleDir}/system/fonts/NotoColorEmoji.ttf"`);
                this.updateTerminal(">>> Force installed as NotoColorEmoji.ttf");
            }

            const rawEmojiName = this.queue.Emoji.filename.replace(/\.[^/.]+$/, "");
            emojiName = rawEmojiName.replace(/[^a-zA-Z0-9-]/g, "_");
        }

        if (this.queue.Fonts) {
            this.updateTerminal(`[4/6] Copying Font: ${this.queue.Fonts.filename}`);
            const fontPath = this.queue.Fonts.path;

            const rawFontName = this.queue.Fonts.filename.replace(/\.[^/.]+$/, "");
            fontName = rawFontName.replace(/[^a-zA-Z0-9-]/g, "_");

            this.updateTerminal(">>> Targeting default AOSP Roboto...");
            await this.ksuExec(`cp "${fontPath}" "${moduleDir}/system/fonts/Roboto-Regular.ttf"`);
            this.updateTerminal(">>> Note: Set device font to 'Default' in OS settings to see changes.");
        }

        this.updateTerminal("[5/6] Generating Config Scripts...");

        let uiPrintMsg = "";
        let descMsg = "";

        if (fontName && emojiName) {
            uiPrintMsg = `Flashing ${fontName} & ${emojiName}`;
            descMsg = `description=🎨 [Font: ${fontName} | Emoji: ${emojiName}] Stylish fonts & emojis for a personalized experience`;
        } else if (fontName) {
            uiPrintMsg = `Flashing ${fontName}`;
            descMsg = `description=🎨 [Font: ${fontName}] Stylish fonts & emojis for a personalized experience`;
        } else if (emojiName) {
            uiPrintMsg = `Flashing ${emojiName}`;
            descMsg = `description=🎨 [Emoji: ${emojiName}] Stylish fonts & emojis for a personalized experience`;
        }

        const customizeScript = `#!/sbin/sh\nui_print "**************************"\nui_print "- FontCraft Module Builder       "\nui_print "**************************"\nui_print " "\nui_print "- ${uiPrintMsg}"\nsleep 2\nui_print " "\nif [ -d "$MODPATH/binaries" ]; then\n    chmod +x "$MODPATH"/binaries/*\n    ui_print "- Set execute permissions for all binaries."\n    ui_print " "\nfi\nui_print "**************************"\nui_print " "`;

        await this.ksuExec(`cat << 'EOF' > "${moduleDir}/customize.sh"\n${customizeScript}\nEOF`);

        await this.ksuExec(`sed -i '/^description=/d' "${moduleDir}/module.prop"`);

        if (descMsg) {
            const descB64 = btoa(unescape(encodeURIComponent(descMsg)));
            await this.ksuExec(`sh -c "echo '${descB64}' | ${STATE.BB} base64 -d >> '${moduleDir}/module.prop'"`);
            await this.ksuExec(`printf "\\n" >> "${moduleDir}/module.prop"`);
        }

        this.updateTerminal(">>> Zipping Module...");
        await wait(50);

        const finalZip = `${CONFIG.WORK_DIR}/FontCraft_Install.zip`;
        const zipBinary = STATE.ZIP_BIN || `${CONFIG.MOD_BIN}/zip`;

        await this.ksuExec(`cd "${moduleDir}" && ${zipBinary} -r "${finalZip}" .`);

        const installCmd = `${STATE.ROOT_CMD} ${STATE.INSTALL_ARGS} "${finalZip}"`;
        this.updateTerminal("\n>>> [6/6] Executing Installer");
        this.updateTerminal(`>>> CMD: ${installCmd}\n`);
        await wait(50);

        const results = await this.ksuExec(installCmd);
        await wait(10);

        const output = (typeof results === 'object' && results !== null)
            ? (results.stdout + (results.stderr ? "\n" + results.stderr : ""))
            : results;

        const exitCode = (typeof results === 'object' && results.errno !== undefined)
            ? results.errno
            : 0;

        if (output && output.toString().trim() !== "") {
            this.updateTerminal(`${output}`);
        }

        if (exitCode !== 0) {
            throw new Error(`Installer exited with non-zero code: ${exitCode}`);
        }

        this.updateTerminal("\n>>> Status: Success (Exit Code 0)");
        this.updateTerminal("\n[PROCESS COMPLETED]");

        if (STATE.ROOT_MANAGER) this.updateTerminal(`Root Manager: ${STATE.ROOT_MANAGER.toUpperCase()}`);

        this.updateTerminal("\n>>> Wiping physical workspace...");
        await cleanupWorkspace(this.ksuExec.bind(this), CONFIG.WORK_DIR);
        this.updateTerminal(">>> Workspace cleared.");

        document.getElementById('termCloseBtn').style.display = 'block';
        document.getElementById('termRebootBtn').style.display = 'inline-flex';
        document.getElementById('rebootFab').classList.remove('hidden');

        btn.innerText = originalText;
        btn.disabled = false;

        this.queue = { Emoji: null, Fonts: null };
        await this.checkUpdatePending();
        this.updateBuildUI();
        this.renderGrid(this.currentCategory);

        showToast("Operation Complete", 'success');

    } catch (e) {
        showToast(`Flash Failed`, 'error');

        this.updateTerminal("\n>>> Status: Failed (Non-zero Exit Code)");
        this.updateTerminal(`Error Info: ${e.message}`);

        this.updateTerminal("\n>>> Wiping physical workspace...");
        await cleanupWorkspace(this.ksuExec.bind(this), CONFIG.WORK_DIR);
        this.updateTerminal(">>> Workspace cleared.");

        document.getElementById('termCloseBtn').style.display = 'block';

        btn.innerText = originalText;
        btn.disabled = false;

        this.queue = { Emoji: null, Fonts: null };
        this.updateBuildUI();
        this.renderGrid(this.currentCategory);
    }
}