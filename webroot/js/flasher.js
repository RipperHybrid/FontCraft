import { CONFIG, STATE } from './config.js';
import { wait, showToast } from './utils.js';

export async function processAndFlash() {
    const hasNativeRoot = typeof ksu !== 'undefined';
    const hasBridgeRoot = STATE.ROOT_BIN && STATE.ROOT_CMD;

    if (!hasNativeRoot && !hasBridgeRoot) {
        showToast("Root manager not detected! Please restart the app or check settings.", 'error');
        return;
    }

    const btn = document.getElementById('flashBtn');
    const originalText = btn.innerText;
    let isMetamoduleMode = false;

    btn.disabled = true;
    btn.innerText = "Checking Environment...";

    try {
        const metaResult = await this.ksuExec(`grep -r "metamodule=1" /data/adb/modules/*/module.prop`);

        if (metaResult && metaResult.trim().length > 0) {
            const userConfirmed = await new Promise((resolve) => {
                const modal = document.getElementById('confirmationModal');
                const title = document.getElementById('confTitle');
                const desc = document.getElementById('confDescription');
                const yesBtn = document.getElementById('confYesBtn');
                const noBtn = document.getElementById('confNoBtn');

                title.innerText = "Metamodule Detected";

                desc.innerHTML = `We detected a Metamodule configuration (<b>metamodule=1</b>).<br><br>
                This installation may involve <b>live patching</b>. While usually seamless, modifying font directories live can sometimes cause text to disappear or the System UI to freeze immediately after flashing.<br><br>
                <b>If this happens, do not panic.</b><br>
                It is temporary. Simply <b>reboot your device</b> manually via the Power Menu. If the UI is completely unresponsive, force a restart by holding <b>Power + Volume Up</b> until the device reboots.<br><br>
                Do you want to proceed?`;

                modal.classList.add('active');
                this.toggleBodyLock(true);

                const cleanup = () => {
                    modal.classList.remove('active');
                    this.toggleBodyLock(false);
                    yesBtn.onclick = null;
                    noBtn.onclick = null;
                };

                yesBtn.onclick = () => {
                    cleanup();
                    resolve(true);
                };

                noBtn.onclick = () => {
                    cleanup();
                    resolve(false);
                };
            });

            if (!userConfirmed) {
                btn.innerText = originalText;
                btn.disabled = false;
                showToast("Operation Cancelled", 'info');
                return;
            }
            isMetamoduleMode = true;
            const targetMetaPath = "/data/adb/metamodule/mnt/StylizeText/system/";
            await this.ksuExec(`if [ -d "${targetMetaPath}" ]; then rm -rf "${targetMetaPath}"; fi`);
        }
    } catch (err) {}

    btn.innerText = "Processing...";
    this.showTerminal();
    this.updateTerminal("Starting Build Process...");
    await wait(100);

    try {
        const isLocalEmoji = this.queue.Emoji && (this.queue.Emoji.path.startsWith('/storage/') || this.queue.Emoji.path.startsWith('/mnt/'));
        const isLocalFont = this.queue.Fonts && (this.queue.Fonts.path.startsWith('/storage/') || this.queue.Fonts.path.startsWith('/mnt/'));

        const templatePath = `${CONFIG.TEMP_DIR}/template.zip`;
        let useLocalTemplate = false;

        try {
            const checkTemplate = await this.ksuExec(`if [ -f "${CONFIG.LOCAL_TEMPLATE}" ]; then echo "exists"; fi`);
            if (checkTemplate.includes("exists")) useLocalTemplate = true;
        } catch(e) {}

        if ((!isLocalEmoji || !isLocalFont) && !useLocalTemplate) {
            if (!(await this.checkInternet())) throw new Error("No internet connection");
        }

        this.updateTerminal("Cleaning workspace...");
        await this.ksuExec(`rm -rf "${CONFIG.BUILD_DIR}" && mkdir -p "${CONFIG.BUILD_DIR}"`);

        if (useLocalTemplate) {
            this.updateTerminal("Using Local Template...");
            await this.ksuExec(`cp "${CONFIG.LOCAL_TEMPLATE}" "${templatePath}"`);
        } else {
            this.updateTerminal("Downloading Template...");
            if (!(await this.checkInternet())) throw new Error("No internet connection to download template");
            await this.ksuExec(`${STATE.BB} wget --no-check-certificate -O "${templatePath}" "${CONFIG.TEMPLATE_URL}"`);
        }

        this.updateTerminal("Extracting Template...");
        await this.ksuExec(`sh -c "${STATE.BB} unzip -o '${templatePath}' -d '${CONFIG.BUILD_DIR}'"`);
        await this.ksuExec(`mkdir -p "${CONFIG.BUILD_DIR}/system/fonts"`);

        let fontName = "";
        let emojiName = "";

        if (this.queue.Emoji) {
            this.updateTerminal(`Copying Emoji: ${this.queue.Emoji.filename}`);
            await this.ksuExec(`cp "${this.queue.Emoji.path}" "${CONFIG.BUILD_DIR}/system/fonts/NotoColorEmoji.ttf"`);
            emojiName = this.queue.Emoji.filename.replace(/\.[^/.]+$/, "");
        }
        if (this.queue.Fonts) {
            this.updateTerminal(`Copying Font: ${this.queue.Fonts.filename}`);
            const fontPath = this.queue.Fonts.path;
            fontName = this.queue.Fonts.filename.replace(/\.[^/.]+$/, "");
            let copyCmd = "";
            CONFIG.SYSTEM_FONTS.forEach(sysFont => {
                copyCmd += `cp "${fontPath}" "${CONFIG.BUILD_DIR}/system/fonts/${sysFont}"; `;
            });
            await this.ksuExec(copyCmd);
        }

        this.updateTerminal("Generating Config Scripts...");

        let uiPrintMsg = "";
        let descMsg = "";

        if (fontName && emojiName) {
            uiPrintMsg = `Flashing ${fontName} & ${emojiName}`;
            descMsg = `description=📥 Injected ${fontName} font and ${emojiName} emoji support.`;
        } else if (fontName) {
            uiPrintMsg = `Flashing ${fontName}`;
            descMsg = `description=📥 Applied ${fontName} font injection.`;
        } else if (emojiName) {
            uiPrintMsg = `Flashing ${emojiName}`;
            descMsg = `description=📥 Applied ${emojiName} emoji support.`;
        }

        const customizeScript = `#!/sbin/sh\nui_print "◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆"\nui_print "   FontCraft Module Builder       "\nui_print "◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆"\nui_print " "\nui_print "- ${uiPrintMsg}"\nsleep 2\nui_print " "\nif [ -d "$MODPATH/binaries" ]; then\n    chmod +x "$MODPATH"/binaries/*\n    ui_print "- ✅ Set execute permissions for all binaries."\n    ui_print " "\nfi\nui_print "◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆"\nui_print " "`;

        await this.ksuExec(`echo '${customizeScript}' > "${CONFIG.BUILD_DIR}/customize.sh"`);
        await this.ksuExec(`printf "\\n" >> "${CONFIG.BUILD_DIR}/module.prop"`);
        await this.ksuExec(`echo "${descMsg}" >> "${CONFIG.BUILD_DIR}/module.prop"`);

        this.updateTerminal("Zipping Module...");
        await wait(50);

        const finalZip = `${CONFIG.TEMP_DIR}/FontCraft_Install.zip`;
        const zipBinary = STATE.ZIP_BIN || `${CONFIG.MOD_BIN}/zip`;

        await this.ksuExec(`cd "${CONFIG.BUILD_DIR}" && ${zipBinary} -r "${finalZip}" .`);

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
        await this.cleanup();

        if (isMetamoduleMode) {
            this.updateTerminal("\n⚠️ Metamodule Active");
            this.updateTerminal(">>> Changes applied live.");
            this.updateTerminal(">>> If UI/Fonts glitch, please reboot manually.");
        }

        document.getElementById('termCloseBtn').style.display = 'block';

        btn.innerText = originalText;
        btn.disabled = false;

        showToast("Operation Complete", 'success');

    } catch (e) {
        showToast(`Flash Failed`, 'error');

        this.updateTerminal("\n>>> Status: Failed (Non-zero Exit Code)");
        this.updateTerminal(`Error Info: ${e.message}`);

        document.getElementById('termCloseBtn').style.display = 'block';

        btn.innerText = originalText;
        btn.disabled = false;
        this.cleanup();
    }
}