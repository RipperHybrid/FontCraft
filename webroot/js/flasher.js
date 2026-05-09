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
    this.updateTerminal("Starting Build Process...");
    await wait(100);

    try {
        const isLocalEmoji = this.queue.Emoji && (this.queue.Emoji.path.startsWith('/storage/') || this.queue.Emoji.path.startsWith('/mnt/'));
        const isLocalFont = this.queue.Fonts && (this.queue.Fonts.path.startsWith('/storage/') || this.queue.Fonts.path.startsWith('/mnt/'));

        const templatePath = `${CONFIG.WORK_DIR}/template.zip`;
        const moduleDir = `${CONFIG.WORK_DIR}/module`;
        let useLocalTemplate = false;

        try {
            const checkTemplate = await this.ksuExec(`if [ -f "${CONFIG.LOCAL_TEMPLATE}" ]; then echo "exists"; fi`);
            if (checkTemplate.includes("exists")) useLocalTemplate = true;
        } catch(e) {}

        if ((!isLocalEmoji || !isLocalFont) && !useLocalTemplate) {
            if (!(await checkInternet(this.ksuExec.bind(this), STATE.ROOT_BIN, STATE.BB))) throw new Error("No internet connection");
        }

        this.updateTerminal("Cleaning workspace...");
        await this.ksuExec(`mkdir -p "${moduleDir}" && rm -rf "${moduleDir}"/*`);

        if (useLocalTemplate) {
            this.updateTerminal("Using Local Template...");
            await this.ksuExec(`cp "${CONFIG.LOCAL_TEMPLATE}" "${templatePath}"`);
        } else {
            this.updateTerminal("Downloading Template...");
            if (!(await checkInternet(this.ksuExec.bind(this), STATE.ROOT_BIN, STATE.BB))) throw new Error("No internet connection to download template");
            await this.ksuExec(`${STATE.BB} wget --no-check-certificate -O "${templatePath}" "${CONFIG.TEMPLATE_URL}"`);
        }

        this.updateTerminal("Extracting Template...");
        await this.ksuExec(`sh -c "${STATE.BB} unzip -o '${templatePath}' -d '${moduleDir}'"`);
        await this.ksuExec(`mkdir -p "${moduleDir}/system/fonts"`);

        let fontName = "";
        let emojiName = "";

        if (this.queue.Emoji) {
            this.updateTerminal(`Copying Emoji: ${this.queue.Emoji.filename}`);
            await this.ksuExec(`cp "${this.queue.Emoji.path}" "${moduleDir}/system/fonts/NotoColorEmoji.ttf"`);
            emojiName = this.queue.Emoji.filename.replace(/\.[^/.]+$/, "");
        }

        if (this.queue.Fonts) {
            this.updateTerminal(`Copying Font: ${this.queue.Fonts.filename}`);
            const fontPath = this.queue.Fonts.path;

            const rawFontName = this.queue.Fonts.filename.replace(/\.[^/.]+$/, "");
            fontName = rawFontName.replace(/[^a-zA-Z0-9-]/g, "_");

            this.updateTerminal("\n--- Running Dynamic Injection ---");

            const injectCmd = `sh -c ". '${moduleDir}/utils.sh' && dynamic_replace_default_family '${fontPath}' '${moduleDir}'"`;
            const injectOutput = await this.ksuExec(injectCmd);

            if (injectOutput && injectOutput.trim() !== "") {
                this.updateTerminal(injectOutput.trim());
            }
            this.updateTerminal("--- Injection Complete ---\n");
        }

        this.updateTerminal("Generating Config Scripts...");

        let uiPrintMsg = "";
        let descMsg = "";

        if (fontName && emojiName) {
            uiPrintMsg = `Flashing ${fontName} & ${emojiName}`;
            descMsg = `description=🔥 Injected ${fontName} font and ${emojiName} emoji support.`;
        } else if (fontName) {
            uiPrintMsg = `Flashing ${fontName}`;
            descMsg = `description=🔥 Applied ${fontName} font injection.`;
        } else if (emojiName) {
            uiPrintMsg = `Flashing ${emojiName}`;
            descMsg = `description=🔥 Applied ${emojiName} emoji support.`;
        }

        const customizeScript = `#!/sbin/sh\nui_print "◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆"\nui_print "   FontCraft Module Builder       "\nui_print "◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆"\nui_print " "\nui_print "- ${uiPrintMsg}"\nsleep 2\nui_print " "\nif [ -d "$MODPATH/binaries" ]; then\n    chmod +x "$MODPATH"/binaries/*\n    ui_print "- ✅ Set execute permissions for all binaries."\n    ui_print " "\nfi\nui_print "◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆"\nui_print " "`;

        await this.ksuExec(`echo '${customizeScript}' > "${moduleDir}/customize.sh"`);
        await this.ksuExec(`printf "\\n" >> "${moduleDir}/module.prop"`);
        await this.ksuExec(`echo "${descMsg}" >> "${moduleDir}/module.prop"`);

        this.updateTerminal("Zipping Module...");
        await wait(50);

        const finalZip = `${CONFIG.WORK_DIR}/FontCraft_Install.zip`;
        const zipBinary = STATE.ZIP_BIN || `${CONFIG.MOD_BIN}/zip`;

        await this.ksuExec(`cd "${moduleDir}" && ${zipBinary} -r "${finalZip}" .`);

        const installCmd = `${STATE.ROOT_CMD} ${STATE.INSTALL_ARGS} "${finalZip}"`;
        this.updateTerminal("\n>>> Executing Installer");
        this.updateTerminal(`CMD: ${installCmd}\n`);
        this.updateTerminal(`${uiPrintMsg}...`);
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
        document.getElementById('rebootFab').classList.remove('hidden');

        btn.innerText = originalText;
        btn.disabled = false;

        this.queue = { Emoji: null, Fonts: null };
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