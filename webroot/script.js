const MIRRORS_URL = "https://fontcraft.pages.dev/mirrors.json";
const DEFAULT_JSON_URL = "https://raw.githubusercontent.com/RipperHybrid/FontCraft/Master/fonts.json";
const TEMPLATE_URL = "https://fontcraft.pages.dev/template.zip";
const TEMP_DIR = "/data/local/tmp/fontcraft_cache";
const BUILD_DIR = "/data/local/tmp/fontcraft_build";
const STORAGE_ROOT = "Start_At_Volume_List";
let ROOT_BIN = null;
let ROOT_MANAGER = null;
let BB = null;
let ROOT_CMD = null;
let ZIP_BIN = null;
let INSTALL_ARGS = "module install";
const MOD_BIN = "/data/adb/modules/StylizeText/binaries";
const SYSTEM_FONTS = ["Roboto-Regular.ttf", "RobotoStatic-Regular.ttf", "RobotoFlex-Regular.ttf", "DroidSansMono.ttf", "CutiveMono.ttf", "NotoSerif-Regular.ttf", "NotoSerif-Bold.ttf", "NotoSerif-Italic.ttf", "NotoSerif-BoldItalic.ttf", "SourceSansPro-Regular.ttf", "SourceSansPro-Italic.ttf", "SourceSansPro-SemiBold.ttf", "SourceSansPro-SemiBoldItalic.ttf", "SourceSansPro-Bold.ttf", "SourceSansPro-BoldItalic.ttf", "ComingSoon.ttf", "DancingScript-Regular.ttf", "CarroisGothicSC-Regular.ttf"];

class FontCraftUI {
    constructor() {
        this.data = null;
        this.activeJsonUrl = DEFAULT_JSON_URL;
        this.activeRepoName = "RipperHybrid (Default)";
        this.currentCategory = 'Emoji';
        this.themes = ['dark', 'light', 'retro'];
        this.queue = { Emoji: null, Fonts: null };
        this.pickerMode = 'font';
        this.binarySelectionType = null;
        this.baseBrowsePath = "/storage/emulated/0";
        this.currentFilePath = this.baseBrowsePath;
        this.filePickerPromise = { resolve: null, reject: null };
        this.settingsWasOpen = false;
        this.commandHistory = [];
        this.init();
    }
    async init() {
        this.cleanup();
        this.fixStyles();
        window.addEventListener('unload', () => this.cleanup());
        window.addEventListener('pagehide', () => this.cleanup());
        this.loadTheme();
        this.setupListeners();
        this.injectSettingsUI();
        await this.detectRootManager();
        this.fetchLibrary();
        this.updateBuildUI();
    }
        injectSettingsUI() {
        const installerDisplay = document.getElementById('installerPathDisplay');
        const parent = installerDisplay ? installerDisplay.closest('.settings-group') : null;

        if (parent && !document.getElementById('installArgsInput')) {
            const container = document.createElement('div');
            container.className = 'binary-selector';
            container.style.marginTop = '15px';
            container.innerHTML = `<label>Installation Command Arguments:</label><div class="input-row"><input type="text" id="installArgsInput" class="settings-input" value="module install" placeholder="e.g. module install"></div><p style="font-size:0.75em; color:var(--text-secondary); margin-top:4px">Full command: <span style="font-family:monospace">\${ROOT_CMD} <span id="cmdPreview">module install</span> "zip"</span></p>`;
            const presetBtns = parent.querySelector('.preset-buttons');
            if (presetBtns) parent.insertBefore(container, presetBtns);
            else parent.appendChild(container);
            
            const input = document.getElementById('installArgsInput');
            input.addEventListener('input', (e) => {
                INSTALL_ARGS = e.target.value;
                document.getElementById('cmdPreview').innerText = INSTALL_ARGS;
            });
        }
    }
    async detectRootManager() {
        if (typeof ksu === 'undefined') return;
        try {
            const ksuCheck = await this.ksuExec("if [ -d '/data/adb/ksu/bin' ]; then echo 'exists'; fi");
            if (ksuCheck.includes('exists')) {
                ROOT_BIN = "/data/adb/ksu/bin";
                ROOT_MANAGER = "ksud";
                BB = `${ROOT_BIN}/busybox`;
                ROOT_CMD = `${ROOT_BIN}/ksud`;
                ZIP_BIN = `${MOD_BIN}/zip`;
                this.updateSettingsUI();
                ksu.toast("✓ Detected: KernelSU");
                return;
            }
        } catch (e) {}
        try {
            const apdCheck = await this.ksuExec("if [ -d '/data/adb/apd' ]; then echo 'exists'; fi");
            if (apdCheck.includes('exists')) {
                ROOT_BIN = "/data/adb/apd";
                ROOT_MANAGER = "apd";
                BB = `${ROOT_BIN}/busybox`;
                ROOT_CMD = `${ROOT_BIN}/apd`;
                ZIP_BIN = `${MOD_BIN}/zip`;
                this.updateSettingsUI();
                ksu.toast("✓ Detected: APatch");
                return;
            }
        } catch (e) {}
        ROOT_BIN = "/data/adb/ksu/bin";
        BB = `${ROOT_BIN}/busybox`;
        ROOT_CMD = `${ROOT_BIN}/ksud`;
        this.updateSettingsUI();
    }
    updateSettingsUI() {
        const bbDisplay = document.getElementById('bbPathDisplay');
        const installerDisplay = document.getElementById('installerPathDisplay');
        const argsInput = document.getElementById('installArgsInput');
        if (bbDisplay) bbDisplay.innerText = BB;
        if (installerDisplay) installerDisplay.innerText = ROOT_CMD;
        if (argsInput) {
            argsInput.value = INSTALL_ARGS;
            const preview = document.getElementById('cmdPreview');
            if(preview) preview.innerText = INSTALL_ARGS;
        }
    }
    fixStyles() {
        const style = document.createElement('style');
        style.innerHTML = `body.modal-open { touch-action: auto !important; } .modal-overlay { pointer-events: auto !important; touch-action: auto !important; } .modal-box { pointer-events: auto !important; } body.modal-open .app { pointer-events: none !important; }`;
        document.head.appendChild(style);
    }
    ksuExec(command) {
        return new Promise((resolve, reject) => {
            if (typeof ksu === 'undefined' || typeof ksu.exec !== 'function') {
                this.commandHistory.push({
                    command,
                    output: "Success (Mock)",
                    error: null,
                    time: new Date().toLocaleString()
                });
                resolve("Success (Mock)");
                return;
            }
            const callbackName = `exec_callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            window[callbackName] = (errno, stdout, stderr) => {
                delete window[callbackName];
                this.commandHistory.push({
                    command,
                    output: stdout,
                    error: errno !== 0 ? (stderr || `Error ${errno}`) : null,
                    time: new Date().toLocaleString()
                });
                if (errno !== 0) reject(new Error(stderr || `Error ${errno}`));
                else resolve(stdout);
            };
            ksu.exec(command, "{}", callbackName);
        });
    }
    openDebugConsole() {
        const modal = document.getElementById('debugModal');
        modal.classList.add('active');
        this.toggleBodyLock(true);
        let log = '';
        if (this.commandHistory.length === 0) {
            log = 'No commands executed yet.';
        } else {
            log = this.commandHistory.map((entry, idx) =>
                `[${idx+1}] ${entry.time}\nCMD: ${entry.command}\n${entry.error ? `ERR: ${entry.error}` : `OUT: ${entry.output}`}\n`
            ).join('\n-------------------\n');
        }
        document.getElementById('debugOutput').innerText = log;
    }
    copyDebugLog() {
        const text = document.getElementById('debugOutput').innerText;
        navigator.clipboard.writeText(text).then(() => {
            if(typeof ksu !== 'undefined') ksu.toast('Log copied to clipboard!');
            else alert('Copied to clipboard!');
        });
    }
    closeDebugConsole() {
        const modal = document.getElementById('debugModal');
        modal.classList.remove('active');
        this.toggleBodyLock(false);
    }
    async checkInternet() {
        if (typeof ksu === 'undefined') return navigator.onLine;
        try {
            await this.ksuExec(`${BB} ping -c 1 8.8.8.8`);
            return true;
        } catch (e) {
            return false;
        }
    }
    cleanup() {
        if (typeof ksu !== 'undefined' && typeof ksu.exec === 'function') {
             ksu.exec(`rm -rf "${TEMP_DIR}"`, "{}", () => {});
             ksu.exec(`rm -rf "${BUILD_DIR}"`, "{}", () => {});
        }
    }
    loadTheme() {
        const saved = localStorage.getItem('fontcraft-theme') || 'dark';
        this.setTheme(saved);
    }
    setTheme(theme) {
        document.body.classList.remove(...this.themes.map(t => `${t}-mode`));
        document.body.classList.add(`${theme}-mode`);
        localStorage.setItem('fontcraft-theme', theme);
        const btn = document.getElementById('themeToggle');
        if(btn) {
            if (theme === 'light') btn.innerHTML = StylizeTextIcons.getLightModeIcon();
            else if (theme === 'retro') btn.innerHTML = StylizeTextIcons.getRetroIcon();
            else btn.innerHTML = StylizeTextIcons.getNightModeIcon();
        }
    }
    toggleTheme() {
        const current = localStorage.getItem('fontcraft-theme') || 'dark';
        const next = this.themes[(this.themes.indexOf(current) + 1) % this.themes.length];
        this.setTheme(next);
    }
    toggleBodyLock(isLocked) {
        if (isLocked) document.body.classList.add('modal-open');
        else {
            const activeModals = document.querySelectorAll('.modal-overlay.active');
            if (activeModals.length <= 1) document.body.classList.remove('modal-open');
        }
    }
    setupListeners() {
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('settingsBtn').innerHTML = StylizeTextIcons.getSettingsIcon();
        document.querySelector('#installModal .close-modal').addEventListener('click', () => {
            const modal = document.getElementById('installModal');
            if(!modal.classList.contains('locked')) {
                modal.classList.remove('active');
                this.toggleBodyLock(false);
            }
        });
        document.querySelectorAll('.modal-box').forEach(box => {
            box.addEventListener('click', (e) => e.stopPropagation());
        });
        document.getElementById('installModal').addEventListener('click', (e) => {
            if(e.target.id === 'installModal' && !e.target.classList.contains('locked')) {
                e.target.classList.remove('active');
                this.toggleBodyLock(false);
            }
        });
        document.getElementById('fileSelectorModal').addEventListener('click', (e) => {
            if(e.target.id === 'fileSelectorModal') this.closeCustomFilePicker();
        });
        document.getElementById('file-selector-back').innerHTML = StylizeTextIcons.getBackIcon();
    }
    updateRepoDisplay() {
        const el = document.getElementById('repo-source');
        if(el) {
            el.innerText = `Source: ${this.activeRepoName}`;
            el.style.color = 'var(--accent)';
            setTimeout(() => el.style.color = 'var(--text-secondary)', 1000);
        }
    }
    async getWorkingMirror() {
        if (this.activeJsonUrl !== DEFAULT_JSON_URL) return this.activeJsonUrl;
        const loader = document.getElementById('loader');
        if(loader && loader.style.display !== 'none') {
             const p = loader.querySelector('p') || document.createElement('p');
             if(!loader.querySelector('p')) loader.appendChild(p);
             p.innerText = "Fetching mirror list...";
        }
        const repoDisplay = document.getElementById('repo-source');
        if(repoDisplay) repoDisplay.innerText = "Checking Mirrors...";
        try {
            const response = await fetch(MIRRORS_URL, { cache: "no-store" });
            if (!response.ok) throw new Error("Failed to fetch mirrors.json");
            const data = await response.json();
            if (!data.mirrors || !Array.isArray(data.mirrors) || data.mirrors.length === 0) {
                this.activeRepoName = "RipperHybrid (Fallback)";
                this.updateRepoDisplay();
                return DEFAULT_JSON_URL;
            }
            for (let i = 0; i < data.mirrors.length; i++) {
                const mirror = data.mirrors[i];
                if(loader && loader.style.display !== 'none') loader.querySelector('p').innerText = `Testing: ${mirror.repo}...`;
                if(repoDisplay) repoDisplay.innerText = `Testing: ${mirror.repo}`;
                try {
                    if (typeof ksu !== 'undefined') {
                        await this.ksuExec(`${BB} wget -q --spider --no-check-certificate --timeout=5 "${mirror.url}"`);
                        this.activeRepoName = mirror.repo;
                        this.updateRepoDisplay();
                        ksu.toast(`✅ Connected: ${mirror.repo}`);
                        return mirror.url;
                    } else {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 10000);
                        const testResp = await fetch(mirror.url, { 
                            method: 'HEAD', 
                            signal: controller.signal,
                            cache: "no-store"
                        });
                        clearTimeout(timeoutId);
                        if (testResp.ok) {
                            this.activeRepoName = mirror.repo;
                            this.updateRepoDisplay();
                            return mirror.url;
                        } else throw new Error("Fetch failed");
                    }
                } catch (err) {}
            }
        } catch (e) {
            if(typeof ksu !== 'undefined') ksu.toast("❌ Error fetching mirror list");
        }
        if(typeof ksu !== 'undefined') ksu.toast("⚠️ All mirrors failed, using default");
        this.activeRepoName = "RipperHybrid (Default)";
        this.updateRepoDisplay();
        return DEFAULT_JSON_URL;
    }
    async fetchLibrary() {
        const loader = document.getElementById('loader');
        const grid = document.getElementById('gridContainer');
        try {
            loader.style.display = 'flex';
            loader.innerHTML = '<div class="spinner"></div><p>Connecting...</p>';
            grid.innerHTML = '';
            if (!(await this.checkInternet())) throw new Error("No internet connection");
            await this.ksuExec(`mkdir -p "${TEMP_DIR}"`);
            if (this.activeJsonUrl === DEFAULT_JSON_URL) this.activeJsonUrl = await this.getWorkingMirror();
            loader.querySelector('p').innerText = "Loading Fonts...";
            if (typeof ksu !== 'undefined') {
                const jsonStr = await this.ksuExec(`${BB} wget -q --no-check-certificate -O - "${this.activeJsonUrl}"`);
                try { this.data = JSON.parse(jsonStr); } catch(e) { throw new Error("Invalid JSON data received via shell"); }
            } else {
                const response = await fetch(this.activeJsonUrl);
                if(!response.ok) throw new Error("Failed to fetch JSON");
                this.data = await response.json();
            }
            loader.style.display = 'none';
            this.renderGrid(this.currentCategory);
        } catch (error) {
            loader.innerHTML = `<p style="color:var(--error)">Error: ${error.message}</p><button onclick="window.fontUI.fetchLibrary()" class="install-btn">Retry</button>`;
        }
    }
    renderGrid(category) {
        this.currentCategory = category;
        const grid = document.getElementById('gridContainer');
        grid.innerHTML = '';
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.innerText.includes(category)));
        if (category === 'Fonts' || category === 'Emoji') {
            const customCard = document.createElement('div');
            customCard.className = 'font-card';
            const cardTitle = category === 'Fonts' ? 'Custom Font' : 'Custom Emoji';
            customCard.innerHTML = `<div class="card-preview" style="display:flex; align-items:center; justify-content:center; flex-direction:column; padding:10px; background: var(--bg-tertiary);">${StylizeTextIcons.getUploadIcon()}<span style="margin-top: 8px; font-size: 0.9em; color: var(--text-secondary);">Local File</span></div><div class="card-info"><div class="card-title">${cardTitle}</div><button class="install-btn" onclick="window.fontUI.selectAndAddCustomFont('${category}')">Select .ttf</button></div>`;
            grid.appendChild(customCard);
        }
        if (!this.data || !this.data[category]) {
            grid.innerHTML = '<p>No items found.</p>';
            return;
        }
        const items = this.data[category];
        Object.keys(items).forEach(folderName => {
            const itemData = items[folderName];
            const card = document.createElement('div');
            card.className = 'font-card';
            const imgUrl = itemData.preview || 'placeholder.png';
            const displayImg = imgUrl.startsWith('http') ? imgUrl : 'https://placehold.co/400x200?text=No+Preview';
            card.innerHTML = `<div class="card-preview"><img src="${displayImg}" loading="lazy" alt="${folderName}"></div><div class="card-info"><div class="card-title">${folderName}</div><button class="install-btn" onclick="window.fontUI.openInstallModal('${category}', '${folderName}')">Select</button></div>`;
            grid.appendChild(card);
        });
    }
    openInstallModal(category, folderName) {
        if(this.queue[category] !== null) {
            const msg = `Already selected a ${category}. Clear it first!`;
            if(typeof ksu !== 'undefined') ksu.toast(msg);
            else alert(msg);
            return;
        }
        const itemData = this.data[category][folderName];
        const modal = document.getElementById('installModal');
        document.getElementById('modalTitle').innerText = folderName;
        const img = document.getElementById('modalPreview');
        if(itemData.preview) {
            img.src = itemData.preview;
            img.style.display = 'block';
        } else img.style.display = 'none';
        const list = document.getElementById('modalFileList');
        list.innerHTML = '';
        itemData.files.forEach(file => {
            const row = document.createElement('div');
            row.className = 'file-row';
            row.innerHTML = `<span>${file.filename}</span><button class="download-action-btn" onclick="window.fontUI.addToQueue('${category}', '${folderName}', '${file.download_url}', '${file.filename}', this)">Add to Queue</button>`;
            list.appendChild(row);
        });
        modal.classList.add('active');
        this.toggleBodyLock(true);
    }
    async addToQueue(category, folderName, url, filename, btnElement) {
        const modal = document.getElementById('installModal');
        const closeBtn = modal.querySelector('.close-modal');
        modal.classList.add('locked');
        closeBtn.classList.add('locked');
        if(typeof ksu === 'undefined') {
            alert(`[Browser Mode] Added to queue: ${filename}`);
            this.queue[category] = { name: folderName, path: `/mock/${filename}`, filename: filename };
            this.updateBuildUI();
            this.unlockModal(modal, closeBtn);
            return;
        }
        if (!(await this.checkInternet())) {
            ksu.toast("❌ No internet connection");
            this.unlockModal(modal, closeBtn);
            return;
        }
        const destPath = `${TEMP_DIR}/${category}_${filename}`;
        const originalText = btnElement.innerText;
        btnElement.disabled = true;
        btnElement.innerText = "Checking size...";
        let pollInterval = null;
        let expectedBytes = 0;
        try {
            const sizeCmd = `${BB} wget --spider --server-response "${url}" 2>&1 | grep -i "Content-Length" | tail -n 1 | awk '{print $2}' | tr -d '\\r'`;
            const sizeOutput = await this.ksuExec(sizeCmd);
            expectedBytes = parseInt(sizeOutput.trim());
            ksu.toast(`Downloading ${filename}...`);
            await this.ksuExec(`rm -f "${destPath}"`);
            const bgCmd = `${BB} wget --no-check-certificate -O "${destPath}" "${url}" > /dev/null 2>&1 & echo $!`;
            const pidOutput = await this.ksuExec(bgCmd);
            const pid = pidOutput.trim();
            if(!pid) throw new Error("Failed to start download process");
            pollInterval = setInterval(async () => {
                try {
                    const size = await this.ksuExec(`${BB} du -h "${destPath}" | awk '{print $1}'`);
                    if(size && size.trim() !== "" && !size.includes("No such")) btnElement.innerText = `DL: ${size.trim()}`;
                    const checkRunning = await this.ksuExec(`if [ -d "/proc/${pid}" ]; then echo "running"; else echo "stopped"; fi`);
                    if(checkRunning.includes("stopped")) {
                        clearInterval(pollInterval);
                        this.finalizeDownload(category, folderName, destPath, filename, btnElement, originalText, modal, closeBtn, expectedBytes);
                    }
                } catch(err) {}
            }, 1000);
        } catch (e) {
            if(pollInterval) clearInterval(pollInterval);
            this.handleDownloadError(btnElement, originalText, e.message);
            this.unlockModal(modal, closeBtn);
        }
    }
    async finalizeDownload(category, folderName, destPath, filename, btnElement, originalText, modal, closeBtn, expectedBytes) {
        try {
            const check = await this.ksuExec(`if [ -f "${destPath}" ]; then echo "exists"; fi`);
            if(check.includes("exists")) {
                const localSizeCmd = `${BB} wc -c "${destPath}" | awk '{print $1}'`;
                const localResult = await this.ksuExec(localSizeCmd);
                const localBytes = parseInt(localResult.trim());
                if (expectedBytes > 0 && localBytes !== expectedBytes) {
                    await this.ksuExec(`rm -f "${destPath}"`);
                    throw new Error(`Incomplete download. (Got ${localBytes} of ${expectedBytes} bytes)`);
                }
                const finalSize = await this.ksuExec(`${BB} du -h "${destPath}" | awk '{print $1}'`);
                btnElement.innerText = `Done (${finalSize.trim()})`;
                this.queue[category] = { name: folderName, path: destPath, filename: filename };
                ksu.toast(`✅ Verified: ${folderName}`);
                this.updateBuildUI();
                setTimeout(() => this.unlockModal(modal, closeBtn), 500);
            } else throw new Error("Download failed or file empty");
        } catch (e) {
            this.handleDownloadError(btnElement, originalText, e.message);
            this.unlockModal(modal, closeBtn);
        }
    }
    handleDownloadError(btn, originalText, msg) {
        btn.innerText = "Failed";
        btn.disabled = false;
        if(typeof ksu !== 'undefined') ksu.toast(`❌ Error: ${msg}`);
        setTimeout(() => { btn.innerText = originalText; }, 3000);
    }
    unlockModal(modal, closeBtn) {
        modal.classList.remove('locked');
        closeBtn.classList.remove('locked');
        modal.classList.remove('active');
        this.toggleBodyLock(false);
    }
    handleClearClick() {
        const hasEmoji = this.queue.Emoji !== null;
        const hasFont = this.queue.Fonts !== null;
        if(hasEmoji && hasFont) {
            document.getElementById('clearSelectionModal').classList.add('active');
            this.toggleBodyLock(true);
        } else if (hasEmoji) this.clearQueueItem('Emoji');
        else if (hasFont) this.clearQueueItem('Fonts');
    }
    closeClearModal() {
        document.getElementById('clearSelectionModal').classList.remove('active');
        this.toggleBodyLock(false);
    }
    async clearQueueItem(type) {
        if (type === 'Both') {
            await this.deleteFile('Emoji');
            await this.deleteFile('Fonts');
            this.queue.Emoji = null;
            this.queue.Fonts = null;
        } else {
            await this.deleteFile(type);
            this.queue[type] = null;
        }
        this.updateBuildUI();
        this.closeClearModal();
    }
    async deleteFile(category) {
        if(!this.queue[category]) return;
        const path = this.queue[category].path;
        if(typeof ksu !== 'undefined' && !path.startsWith('/storage/emulated/0') && !path.startsWith('/mnt/media_rw/')) {
            await this.ksuExec(`rm -f "${path}"`);
            ksu.toast(`Cleared ${category}`);
        } else if (typeof ksu !== 'undefined') ksu.toast(`Cleared ${category}`);
    }
    updateBuildUI() {
        const emojiStatus = document.getElementById('emojiStatus');
        const fontStatus = document.getElementById('fontStatus');
        const flashBtn = document.getElementById('flashBtn');
        const clearContainer = document.getElementById('clearContainer');
        const hasEmoji = this.queue.Emoji !== null;
        const hasFont = this.queue.Fonts !== null;
        if(hasEmoji) {
            emojiStatus.innerText = `Emoji: ${this.queue.Emoji.name}`;
            emojiStatus.classList.add('active');
            emojiStatus.classList.remove('empty');
        } else {
            emojiStatus.innerText = `Emoji: None`;
            emojiStatus.classList.remove('active');
            emojiStatus.classList.add('empty');
        }
        if(hasFont) {
            fontStatus.innerText = `Font: ${this.queue.Fonts.name}`;
            fontStatus.classList.add('active');
            fontStatus.classList.remove('empty');
        } else {
            fontStatus.innerText = `Font: None`;
            fontStatus.classList.remove('active');
            fontStatus.classList.add('empty');
        }
        if(hasEmoji || hasFont) clearContainer.innerHTML = `<button class="clear-btn" onclick="window.fontUI.handleClearClick()" title="Clear Selection">${StylizeTextIcons.getClearIcon()}</button>`;
        else clearContainer.innerHTML = '';
        const hasItems = hasEmoji || hasFont;
        flashBtn.disabled = !hasItems;
        if(hasItems) {
            flashBtn.classList.add('ready');
            const count = (hasEmoji ? 1 : 0) + (hasFont ? 1 : 0);
            flashBtn.innerText = `Flash Module (${count} items)`;
        } else {
            flashBtn.classList.remove('ready');
            flashBtn.innerText = "Select items to Flash";
        }
    }
    showTerminal() {
        document.getElementById('terminalModal').classList.add('active');
        this.toggleBodyLock(true);
        document.getElementById('terminalOutput').innerText = "Initializing Environment...\n";
        document.getElementById('termCloseBtn').style.display = 'none';
    }
    updateTerminal(text) {
        const term = document.getElementById('terminalOutput');
        term.innerText += text + "\n";
        term.scrollTop = term.scrollHeight;
    }
    closeTerminal() {
        document.getElementById('terminalModal').classList.remove('active');
        this.toggleBodyLock(false);
        this.queue = { Emoji: null, Fonts: null };
        this.updateBuildUI();
        this.cleanup();
    }
    async processAndFlash() {
        if (typeof ksu === 'undefined') return alert("Root Manager Required");
        if (!ROOT_BIN || !ROOT_CMD) {
            alert("Root manager not detected! Please restart the app.");
            return;
        }

        const toMono = (text) => {
            const normal = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const mono = [..."𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉"];
            return text.split('').map(char => {
                const index = normal.indexOf(char);
                return index > -1 ? mono[index] : char;
            }).join('');
        };

        const btn = document.getElementById('flashBtn');
        const originalText = btn.innerText;
        try {
            btn.disabled = true;
            btn.innerText = "Downloading Template...";
            const isLocalEmoji = this.queue.Emoji && (this.queue.Emoji.path.startsWith('/storage/') || this.queue.Emoji.path.startsWith('/mnt/'));
            const isLocalFont = this.queue.Fonts && (this.queue.Fonts.path.startsWith('/storage/') || this.queue.Fonts.path.startsWith('/mnt/'));
            if (!isLocalEmoji || !isLocalFont) {
                if (!(await this.checkInternet())) throw new Error("No internet connection");
            }
            await this.ksuExec(`rm -rf "${BUILD_DIR}" && mkdir -p "${BUILD_DIR}"`);
            const templatePath = `${TEMP_DIR}/template.zip`;
            if (!templatePath.startsWith('/storage/emulated/0') && !templatePath.startsWith('/mnt/')) {
                if (!(await this.checkInternet())) throw new Error("No internet connection to download template");
                await this.ksuExec(`${BB} wget --no-check-certificate -O "${templatePath}" "${TEMPLATE_URL}"`);
            }
            await this.ksuExec(`${BB} unzip -o "${templatePath}" -d "${BUILD_DIR}"`);
            await this.ksuExec(`mkdir -p "${BUILD_DIR}/system/fonts"`);
            
            let fontName = "";
            let emojiName = "";
            
            if (this.queue.Emoji) {
                await this.ksuExec(`cp "${this.queue.Emoji.path}" "${BUILD_DIR}/system/fonts/NotoColorEmoji.ttf"`);
                emojiName = this.queue.Emoji.filename.replace(/\.[^/.]+$/, "");
            }
            if (this.queue.Fonts) {
                const fontPath = this.queue.Fonts.path;
                fontName = this.queue.Fonts.filename.replace(/\.[^/.]+$/, "");
                let copyCmd = "";
                SYSTEM_FONTS.forEach(sysFont => {
                    copyCmd += `cp "${fontPath}" "${BUILD_DIR}/system/fonts/${sysFont}"; `;
                });
                await this.ksuExec(copyCmd);
            }

            btn.innerText = "Creating customize.sh...";
            
            let uiPrintMsg = "";
            let descMsg = "";
            
            if (fontName && emojiName) {
                uiPrintMsg = `𝙵𝚕𝚊𝚜𝚑𝚒𝚗𝚐 ${toMono(fontName)} & ${toMono(emojiName)}`;
                descMsg = `description=📥 Injected ${fontName} font and ${emojiName} emoji support.`;
            } else if (fontName) {
                uiPrintMsg = `𝙵𝚕𝚊𝚜𝚑𝚒𝚗𝚐 ${toMono(fontName)}`;
                descMsg = `description=📥 Applied ${fontName} font injection.`;
            } else if (emojiName) {
                uiPrintMsg = `𝙵𝚕𝚊𝚜𝚑𝚒𝚗𝚐 ${toMono(emojiName)}`;
                descMsg = `description=📥 Applied ${emojiName} emoji support.`;
            }

            const customizeScript = `#!/sbin/sh\nui_print "◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆"\nui_print "   𝙵𝚘𝚗𝚝𝙲𝚛𝚊𝚏𝚝 𝙼𝚘𝚍𝚞𝚕𝚎 𝙱𝚞𝚒𝚕𝚍𝚎𝚛      "\nui_print "◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆"\nui_print " "\nui_print "- ${uiPrintMsg}"\nui_print " "\nif [ -d "$MODPATH/binaries" ]; then\n    chmod +x "$MODPATH"/binaries/*\n    ui_print "- ✅ 𝚂𝚎𝚝 𝚎𝚡𝚎𝚌𝚞𝚝𝚎 𝚙𝚎𝚛𝚖𝚒𝚜𝚜𝚒𝚘𝚗𝚜 𝚏𝚘𝚛 𝚊𝚕𝚕 𝚋𝚒𝚗𝚊𝚛𝚒𝚎𝚜."\n    ui_print " "\nfi\nui_print "- 𝚁𝚎𝚋𝚘𝚘𝚝 𝚒𝚖𝚖𝚎𝚍𝚒𝚊𝚝𝚎𝚕𝚢 𝚒𝚏 𝚞𝚜𝚒𝚗𝚐 𝙼𝚎𝚝𝚊𝚖𝚘𝚍𝚞𝚕𝚎"\nui_print "◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆"\nui_print " "`;
            await this.ksuExec(`echo '${customizeScript}' > "${BUILD_DIR}/customize.sh"`);
            await this.ksuExec(`printf "\\n" >> "${BUILD_DIR}/module.prop"`);
            await this.ksuExec(`echo "${descMsg}" >> "${BUILD_DIR}/module.prop"`);

            btn.innerText = "Flashing...";
            this.showTerminal();

            const finalZip = `${TEMP_DIR}/FontCraft_Install.zip`;
            const zipBinary = ZIP_BIN || `${MOD_BIN}/zip`;

            this.updateTerminal("Zipping module...");
            await this.ksuExec(`cd "${BUILD_DIR}" && ${zipBinary} -r "${finalZip}" .`);

            const installCmd = `${ROOT_CMD} ${INSTALL_ARGS} "${finalZip}"`;
            this.updateTerminal(`Executing: ${installCmd}`);

            const result = await this.ksuExec(installCmd);
            this.updateTerminal(result);
            this.updateTerminal("\n[PROCESS COMPLETED]");
            if (ROOT_MANAGER) this.updateTerminal(`Root Manager: ${ROOT_MANAGER.toUpperCase()}`);
            await this.cleanup();
            document.getElementById('termCloseBtn').style.display = 'block';
            ksu.toast("✅ Operation Complete");
        } catch (e) {
            ksu.toast(`❌ Flash Failed: ${e.message}`);
            if (document.getElementById('terminalModal').classList.contains('active')) {
                this.updateTerminal(`\n[ERROR] ${e.message}`);
                document.getElementById('termCloseBtn').style.display = 'block';
            } else alert(`Error: ${e.message}`);
            btn.innerText = originalText;
            btn.disabled = false;
            this.cleanup();
        }
    }
    async selectAndAddCustomFont(category) {
        try {
            this.pickerMode = 'font';
            this.baseBrowsePath = "/storage/emulated/0";
            const { path, name } = await this.openCustomFilePicker(category);
            this.queue[category] = { name: `${name}`, path: path, filename: name };
            if(typeof ksu !== 'undefined') ksu.toast(`✅ Added ${name} to Queue`);
            this.updateBuildUI();
        } catch (error) {
            if(typeof ksu !== 'undefined' && error.message !== "File selection cancelled.") ksu.toast(`ℹ️ ${error.message}`);
        }
    }
    openSettings() {
        document.getElementById('settingsModal').classList.add('active');
        this.toggleBodyLock(true);
        this.updateSettingsUI();
    }
    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
        this.toggleBodyLock(false);
    }
    async validateAndSetSource() {
        const input = document.getElementById('sourceInput');
        const url = input.value.trim();
        if (!url) {
            if(typeof ksu !== 'undefined') ksu.toast("Enter a valid URL");
            return;
        }
        try {
            input.disabled = true;
            if (!(await this.checkInternet())) throw new Error("No internet connection");
            let jsonStr;
            if (typeof ksu !== 'undefined') jsonStr = await this.ksuExec(`${BB} wget -q --no-check-certificate -O - "${url}"`);
            else {
                const response = await fetch(url);
                jsonStr = await response.text();
            }
            let data;
            try { data = JSON.parse(jsonStr); } catch(e) { throw new Error("Invalid JSON structure"); }
            if (!data.Fonts && !data.Emoji) throw new Error("JSON missing Fonts or Emoji keys");
            this.activeJsonUrl = url;
            this.activeRepoName = "Custom Source";
            this.updateRepoDisplay();
            this.fetchLibrary();
            if(typeof ksu !== 'undefined') ksu.toast("✅ Source Updated");
            this.closeSettings();
        } catch (e) {
            if(typeof ksu !== 'undefined') ksu.toast(`❌ Error: ${e.message}`);
            else alert(e.message);
        } finally {
            input.disabled = false;
        }
    }
    openBinaryPicker(type) {
        const modal = document.getElementById('settingsModal');
        if (modal.classList.contains('active')) {
            modal.classList.remove('active');
            this.settingsWasOpen = true;
        }
        this.pickerMode = 'binary';
        this.binarySelectionType = type;
        this.baseBrowsePath = "/data/adb";
        let targetVal = (type === 'busybox') ? BB : ROOT_CMD;
        this.currentFilePath = "/data/adb";
        if (targetVal && targetVal.startsWith("/data/adb") && targetVal.includes("/")) {
            let dir = targetVal.substring(0, targetVal.lastIndexOf('/'));
            if(dir.startsWith("/data/adb")) this.currentFilePath = dir;
        }
        this.openCustomFilePicker(null);
    }
    applyPreset(preset) {
        if (preset === 'ksu') {
            ROOT_BIN = "/data/adb/ksu/bin";
            BB = `${ROOT_BIN}/busybox`;
            ROOT_CMD = `${ROOT_BIN}/ksud`;
            ROOT_MANAGER = "ksud";
            INSTALL_ARGS = "module install";
        } else if (preset === 'apatch') {
            ROOT_BIN = "/data/adb/apd";
            BB = `${ROOT_BIN}/busybox`;
            ROOT_CMD = `${ROOT_BIN}/apd`;
            ROOT_MANAGER = "apd";
            INSTALL_ARGS = "module install";
        }
        this.updateSettingsUI();
        if(typeof ksu !== 'undefined') ksu.toast(`Applied ${preset.toUpperCase()} preset`);
    }
    async detectStorageVolumes() {
        const volumes = [];
        volumes.push({
            name: "Internal Storage",
            path: "/storage/emulated/0",
            type: "internal"
        });
        try {
            const output = await this.ksuExec(`sm list-volumes public`);
            const lines = output.split('\n');
            lines.forEach(line => {
                if (line.includes('mounted')) {
                    const parts = line.trim().split(/\s+/);
                    const uuid = parts[parts.length - 1];
                    if (uuid) {
                        volumes.push({
                            name: `External (${uuid})`,
                            path: `/mnt/media_rw/${uuid}`,
                            type: "external"
                        });
                    }
                }
            });
        } catch (e) {}
        return volumes;
    }
    async openCustomFilePicker(category) {
        if(this.pickerMode === 'font' && this.queue[category] !== null) {
            const msg = `Already selected a ${category}. Clear it first!`;
            if(typeof ksu !== 'undefined') ksu.toast(msg);
            else alert(msg);
            return Promise.reject(new Error(msg));
        }
        const modal = document.getElementById('fileSelectorModal');
        modal.classList.add('active');
        this.toggleBodyLock(true);
        if(this.pickerMode === 'font') {
            this.currentFilePath = "/storage/emulated/0";
        }
        this.updateFileBrowserPath();
        await this.listFilesInPath(this.currentFilePath);
        document.getElementById('file-selector-list').onclick = (e) => this.handleFileBrowserClick(e);
        document.getElementById('file-selector-path').onclick = (e) => this.handleFilePathClick(e);
        document.getElementById('file-selector-back').onclick = () => this.handleFileBrowserBack();
        return new Promise((resolve, reject) => { this.filePickerPromise = { resolve, reject }; });
    }
    closeCustomFilePicker(reason = "File selection cancelled.") {
        const modal = document.getElementById('fileSelectorModal');
        modal.classList.remove('active');
        this.toggleBodyLock(false);
        if (this.settingsWasOpen) {
            document.getElementById('settingsModal').classList.add('active');
            this.toggleBodyLock(true);
            this.settingsWasOpen = false;
        }
        document.getElementById('file-selector-list').onclick = null;
        document.getElementById('file-selector-path').onclick = null;
        document.getElementById('file-selector-back').onclick = null;
        if (this.filePickerPromise.reject) this.filePickerPromise.reject(new Error(reason));
        this.filePickerPromise = { resolve: null, reject: null };
    }
    updateFileBrowserPath() {
        const pathEl = document.getElementById('file-selector-path');
        pathEl.innerHTML = "";
        if (this.currentFilePath === STORAGE_ROOT) {
            const rootSpan = document.createElement('span');
            rootSpan.className = "path-segment";
            rootSpan.innerText = "Storage Devices";
            pathEl.appendChild(rootSpan);
            return;
        }
        let displayBase = "";
        let rootName = "Storage";
        if (this.pickerMode === 'binary') {
            displayBase = "/data/adb/";
            pathEl.innerText = this.currentFilePath;
            return;
        }
        if (this.currentFilePath.startsWith("/storage/emulated/0")) {
            rootName = "Internal Storage";
            displayBase = "/storage/emulated/0";
        } else if (this.currentFilePath.startsWith("/mnt/media_rw/")) {
            const parts = this.currentFilePath.split('/');
            if (parts.length >= 4) {
                displayBase = `/${parts[1]}/${parts[2]}/${parts[3]}`;
                rootName = parts[3];
            }
        }
        const rootSegment = document.createElement('span');
        rootSegment.className = "path-segment";
        rootSegment.innerText = rootName;
        rootSegment.style.fontWeight = "bold";
        rootSegment.onclick = () => {
             this.currentFilePath = STORAGE_ROOT;
             this.updateFileBrowserPath();
             this.listFilesInPath(STORAGE_ROOT);
        };
        pathEl.appendChild(rootSegment);
        if (this.currentFilePath.length > displayBase.length) {
            const subPath = this.currentFilePath.substring(displayBase.length);
            const parts = subPath.split('/').filter(Boolean);
            let pathSoFar = displayBase;
            parts.forEach(part => {
                pathSoFar += `/${part}`;
                const separator = document.createElement('span');
                separator.className = "separator";
                separator.innerText = " › ";
                pathEl.appendChild(separator);
                const segment = document.createElement('span');
                segment.className = "path-segment";
                segment.innerText = part;
                segment.dataset.path = pathSoFar;
                pathEl.appendChild(segment);
            });
        }
        pathEl.scrollTo({ left: pathEl.scrollWidth, behavior: "smooth" });
    }
    createFileItemElement(name, type, delay) {
        const itemEl = document.createElement('div');
        itemEl.className = 'file-item';
        itemEl.dataset.type = type;
        itemEl.dataset.name = name;
        let icon = (type === 'dir') ? StylizeTextIcons.getFolderIcon() : StylizeTextIcons.getFileIcon();
        if(type === 'volume') {
             if (name === "Internal Storage") icon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 18h4"/><path d="M12 2v20"/><rect x="5" y="2" width="14" height="20" rx="2"/></svg>`;
             else icon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M10 2v4h4"/></svg>`;
        }
        const text = (name === '..') ? '.. (Up)' : name;
        itemEl.innerHTML = `${icon}<span>${text}</span>`;
        itemEl.style.animationDelay = `${delay}s`;
        return itemEl;
    }
    async listFilesInPath(path) {
        const listEl = document.getElementById('file-selector-list');
        listEl.innerHTML = `<div class="loading-files">Loading...</div>`;
        if (path === STORAGE_ROOT) {
            const volumes = await this.detectStorageVolumes();
            listEl.innerHTML = "";
            if (volumes.length === 0) {
                listEl.innerHTML = `<div class="error-files">No storage found.</div>`;
                return;
            }
            let delay = 0;
            volumes.forEach(vol => {
                const itemEl = this.createFileItemElement(vol.name, "volume", delay);
                itemEl.dataset.path = vol.path;
                listEl.appendChild(itemEl);
                delay += 0.05;
            });
            return;
        }
        let command;
        if (this.pickerMode === 'binary') command = `cd "${path}" && ls -1p | sort`;
        else command = `cd "${path}" && ls -1p | grep -E '/$|\\.ttf$' | sort`;
        try {
            const stdout = await this.ksuExec(command);
            listEl.innerHTML = "";
            const items = stdout.split('\n').filter(Boolean);
            let delay = 0;
            const isVolumeRoot = (path === "/storage/emulated/0" || (path.startsWith("/mnt/media_rw/") && path.split('/').length === 4));
            if (path !== "/data/adb") {
                const upEl = this.createFileItemElement("..", "dir", delay);
                if (isVolumeRoot && this.pickerMode !== 'binary') upEl.dataset.target = STORAGE_ROOT;
                listEl.appendChild(upEl);
                delay += 0.03;
            }
            items.forEach(item => {
                const isDirectory = item.endsWith('/');
                const name = isDirectory ? item.slice(0, -1) : item;
                if (name === "" || name === "." || name === "..") return;
                const itemEl = this.createFileItemElement(name, isDirectory ? 'dir' : 'file', delay);
                listEl.appendChild(itemEl);
                delay += 0.03;
            });
            if (items.length === 0) listEl.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-secondary)">Empty Folder</div>`;
        } catch (stderr) {
            listEl.innerHTML = `<div class="error-files">Error: ${stderr}</div>`;
        }
    }
    async handleFileBrowserClick(e) {
        const item = e.target.closest(".file-item");
        if (!item) return;
        const type = item.dataset.type;
        if (type === "volume") {
            this.currentFilePath = item.dataset.path;
            this.updateFileBrowserPath();
            await this.listFilesInPath(this.currentFilePath);
            return;
        }
        const name = item.dataset.name;
        if (type === "dir") {
            if (name === "..") {
                if (item.dataset.target === STORAGE_ROOT) {
                    this.currentFilePath = STORAGE_ROOT;
                    this.updateFileBrowserPath();
                    this.listFilesInPath(STORAGE_ROOT);
                    return;
                }
                if (this.currentFilePath === this.baseBrowsePath && this.pickerMode === 'binary') return;
                let newPath = this.currentFilePath.substring(0, this.currentFilePath.lastIndexOf('/'));
                if (this.pickerMode === 'binary' && newPath.length < "/data/adb".length) newPath = "/data/adb";
                this.currentFilePath = newPath;
            } else this.currentFilePath = this.currentFilePath.replace(/\/$/, '') + "/" + name;
            this.updateFileBrowserPath();
            await this.listFilesInPath(this.currentFilePath);
        } else if (type === "file") {
            const filePath = this.currentFilePath.replace(/\/$/, '') + "/" + name;
            if (this.pickerMode === 'binary') {
                if (this.binarySelectionType === 'busybox') BB = filePath;
                else if (this.binarySelectionType === 'installer') ROOT_CMD = filePath;
                this.updateSettingsUI();
                this.closeCustomFilePicker("Binary selected");
                if(typeof ksu !== 'undefined') ksu.toast(`Updated ${this.binarySelectionType}`);
            } else {
                if (this.filePickerPromise.resolve) this.filePickerPromise.resolve({path: filePath, name: name});
                this.closeCustomFilePicker("File selected");
            }
        }
    }
    async handleFilePathClick(e) {
        const segment = e.target.closest(".path-segment");
        if (!segment) return;
        if (segment.innerText === "Storage Devices") {
             this.currentFilePath = STORAGE_ROOT;
             this.updateFileBrowserPath();
             await this.listFilesInPath(STORAGE_ROOT);
             return;
        }
        if (segment.dataset.path) {
            this.currentFilePath = segment.dataset.path;
            this.updateFileBrowserPath();
            await this.listFilesInPath(this.currentFilePath);
        }
    }
    async handleFileBrowserBack() {
        if (this.currentFilePath === STORAGE_ROOT) {
            this.closeCustomFilePicker();
            return;
        }
        const isVolumeRoot = (this.currentFilePath === "/storage/emulated/0" || (this.currentFilePath.startsWith("/mnt/media_rw/") && this.currentFilePath.split('/').length === 4));
        if (isVolumeRoot && this.pickerMode !== 'binary') {
            this.currentFilePath = STORAGE_ROOT;
            this.updateFileBrowserPath();
            await this.listFilesInPath(STORAGE_ROOT);
            return;
        }
        let limit = (this.pickerMode === 'binary') ? "/data/adb" : "/mnt"; 
        if (this.currentFilePath !== limit && this.currentFilePath.length > limit.length) {
            let newPath = this.currentFilePath.substring(0, this.currentFilePath.lastIndexOf('/'));
            this.currentFilePath = newPath;
            this.updateFileBrowserPath();
            await this.listFilesInPath(this.currentFilePath);
        } else this.closeCustomFilePicker();
    }
}
window.switchTab = (cat) => window.fontUI.renderGrid(cat);
document.addEventListener('DOMContentLoaded', () => { window.fontUI = new FontCraftUI(); });