import { CONFIG, STATE } from './config.js';
import { ksuExec, wait, showToast } from './utils.js';
import { processAndFlash } from './flasher.js';
import { StylizeTextIcons } from './icons.js';

function formatSize(bytes) {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
}

class FontCraftUI {
    constructor() {
        this.data = null;
        this.activeJsonUrl = CONFIG.DEFAULT_JSON_URL;
        this.activeRepoName = "RipperHybrid (Default)";
        this.currentCategory = 'Emoji';
        this.themes = ['light', 'retro'];
        this.queue = { Emoji: null, Fonts: null };
        this.pickerMode = 'font';
        this.binarySelectionType = null;
        this.baseBrowsePath = "/storage/emulated/0";
        this.currentFilePath = this.baseBrowsePath;
        this.filePickerPromise = { resolve: null, reject: null };
        this.settingsWasOpen = false;
        this.commandHistory = [];
        this.fetchError = null;
        this.init();
    }

    processAndFlash = processAndFlash;

    showToast(message, type = 'info', duration = 3000) {
        showToast(message, type, duration);
    }

    ksuExec(command) {
        return ksuExec(command, this.commandHistory);
    }

    async init() {
        this.cleanup();
        this.fixStyles();
        window.addEventListener('unload', () => this.cleanup());
        window.addEventListener('pagehide', () => this.cleanup());
        this.loadTheme();
        this.setupListeners();
        this.injectSettingsUI();
        this.injectStaticIcons();
        await this.detectRootManager();
        await this.ksuExec(`mkdir -p "${CONFIG.TEMP_DIR}"`);
        this.fetchLibrary();
        this.updateBuildUI();
    }

    injectStaticIcons() {
        const ksuContainer = document.querySelector('.ksu-btn .preset-icon');
        if (ksuContainer) ksuContainer.innerHTML = StylizeTextIcons.getKsuIcon();

        const apatchContainer = document.querySelector('.apatch-btn .preset-icon');
        if (apatchContainer) apatchContainer.innerHTML = StylizeTextIcons.getApatchIcon();

        const magiskContainer = document.querySelector('.magisk-btn .preset-icon');
        if (magiskContainer) magiskContainer.innerHTML = StylizeTextIcons.getMagiskIcon();
    }

    injectSettingsUI() {
        const installerDisplay = document.getElementById('installerPathDisplay');
        const parent = installerDisplay ? installerDisplay.closest('.settings-group') : null;

        if (parent && !document.getElementById('installArgsInput')) {
            const container = document.createElement('div');
            container.className = 'binary-selector';
            container.style.marginTop = '15px';
            container.innerHTML = `<label>Installation Command Arguments:</label><div class="input-row"><input type="text" id="installArgsInput" class="settings-input" value="module install" placeholder="e.g. module install"></div><p style="font-size:0.75em; color:var(--text-secondary); margin-top:4px">Full command: <span style="font-family:monospace">\${STATE.ROOT_CMD} <span id="cmdPreview">module install</span> "zip"</span></p>`;
            const presetBtns = parent.querySelector('.preset-buttons');
            if (presetBtns) parent.insertBefore(container, presetBtns);
            else parent.appendChild(container);

            const input = document.getElementById('installArgsInput');
            input.addEventListener('input', (e) => {
                STATE.INSTALL_ARGS = e.target.value;
                document.getElementById('cmdPreview').innerText = STATE.INSTALL_ARGS;
            });
        }
    }

    async detectRootManager() {
        try {
            const ksuCheck = await this.ksuExec("if [ -d '/data/adb/ksu/bin' ]; then echo 'exists'; fi");
            if (ksuCheck.includes('exists')) {
                this.applyPreset('ksu');
                return;
            }
        } catch (e) {}

        try {
            const apdCheck = await this.ksuExec("if [ -d '/data/adb/apd' ]; then echo 'exists'; fi");
            if (apdCheck.includes('exists')) {
                this.applyPreset('apatch');
                return;
            }
        } catch (e) {}

        try {
            const magiskCheck = await this.ksuExec("if [ -f '/data/adb/magisk/busybox' ]; then echo 'exists'; fi");
            if (magiskCheck.includes('exists')) {
                this.applyPreset('magisk');
                return;
            }
        } catch (e) {}

        STATE.ROOT_BIN = "/data/adb/ksu/bin";
        STATE.BB = `${STATE.ROOT_BIN}/busybox`;
        STATE.ROOT_CMD = `${STATE.ROOT_BIN}/ksud`;
        this.updateSettingsUI();
    }

    updateSettingsUI() {
        const bbDisplay = document.getElementById('bbPathDisplay');
        const installerDisplay = document.getElementById('installerPathDisplay');
        const argsInput = document.getElementById('installArgsInput');
        if (bbDisplay) bbDisplay.innerText = STATE.BB || "Not Set";
        if (installerDisplay) installerDisplay.innerText = STATE.ROOT_CMD || "Not Set";
        if (argsInput) {
            argsInput.value = STATE.INSTALL_ARGS;
            const preview = document.getElementById('cmdPreview');
            if (preview) preview.innerText = STATE.INSTALL_ARGS;
        }
    }

    fixStyles() {
        const style = document.createElement('style');
        style.innerHTML = `body.modal-open { touch-action: auto !important; } .modal-overlay { pointer-events: auto !important; touch-action: auto !important; } .modal-box { pointer-events: auto !important; } body.modal-open .app { pointer-events: none !important; }`;
        document.head.appendChild(style);
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
                `[${idx + 1}] ${entry.time}\nCMD: ${entry.command}\n${entry.error ? `ERR: ${entry.error}` : `OUT: ${entry.output}`}\n`
            ).join('\n-------------------\n');
        }
        document.getElementById('debugOutput').innerText = log;
    }

    copyDebugLog() {
        const text = document.getElementById('debugOutput').innerText;
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Log copied to clipboard!', 'success');
        });
    }

    closeDebugConsole() {
        const modal = document.getElementById('debugModal');
        modal.classList.remove('active');
        this.toggleBodyLock(false);
    }

    async checkInternet() {
        if (typeof ksu === 'undefined' && !STATE.ROOT_BIN) return navigator.onLine;
        try {
            await this.ksuExec(`${STATE.BB} ping -c 1 8.8.8.8`);
            return true;
        } catch (e) {
            return false;
        }
    }

    cleanup() {
        if (typeof ksu !== 'undefined' && typeof ksu.exec === 'function') {
            ksu.exec(`rm -rf "${CONFIG.TEMP_DIR}"`, "{}", () => {});
            ksu.exec(`rm -rf "${CONFIG.BUILD_DIR}"`, "{}", () => {});
        } else if (STATE.ROOT_BIN) {
            this.ksuExec(`rm -rf "${CONFIG.TEMP_DIR}"`);
            this.ksuExec(`rm -rf "${CONFIG.BUILD_DIR}"`);
        }
    }

    loadTheme() {
        const saved = localStorage.getItem('fontcraft-theme') || 'retro';
        this.setTheme(saved);
    }

    setTheme(theme) {
        document.body.classList.remove(...this.themes.map(t => `${t}-mode`));
        document.body.classList.add(`${theme}-mode`);
        localStorage.setItem('fontcraft-theme', theme);
        const btn = document.getElementById('themeToggle');
        if (btn) {
            if (theme === 'light') btn.innerHTML = StylizeTextIcons.getLightModeIcon();
            else btn.innerHTML = StylizeTextIcons.getRetroIcon();
        }
    }

    toggleTheme() {
        const current = localStorage.getItem('fontcraft-theme') || 'retro';
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
            if (!modal.classList.contains('locked')) {
                modal.classList.remove('active');
                this.toggleBodyLock(false);
            }
        });
        document.querySelectorAll('.modal-box').forEach(box => {
            box.addEventListener('click', (e) => e.stopPropagation());
        });
        document.getElementById('installModal').addEventListener('click', (e) => {
            if (e.target.id === 'installModal' && !e.target.classList.contains('locked')) {
                e.target.classList.remove('active');
                this.toggleBodyLock(false);
            }
        });
        document.getElementById('fileSelectorModal').addEventListener('click', (e) => {
            if (e.target.id === 'fileSelectorModal') this.closeCustomFilePicker();
        });
        document.getElementById('file-selector-back').innerHTML = StylizeTextIcons.getBackIcon();
    }

    updateRepoDisplay() {
        const el = document.getElementById('repo-source');
        if (el) {
            el.innerText = `Source: ${this.activeRepoName}`;
            el.style.color = 'var(--accent)';
            setTimeout(() => el.style.color = 'var(--text-secondary)', 1000);
        }
    }

    async getWorkingMirror() {
        if (this.activeJsonUrl !== CONFIG.DEFAULT_JSON_URL) return this.activeJsonUrl;
        const loader = document.getElementById('loader');
        if (loader && loader.style.display !== 'none') {
            const p = loader.querySelector('p') || document.createElement('p');
            if (!loader.querySelector('p')) loader.appendChild(p);
            p.innerText = "Fetching mirror list...";
        }
        const repoDisplay = document.getElementById('repo-source');
        if (repoDisplay) repoDisplay.innerText = "Checking Mirrors...";
        try {
            const response = await fetch(CONFIG.MIRRORS_URL, { cache: "no-store" });
            if (!response.ok) throw new Error("Failed to fetch mirrors.json");
            const data = await response.json();
            if (!data.mirrors || !Array.isArray(data.mirrors) || data.mirrors.length === 0) {
                this.activeRepoName = "RipperHybrid (Fallback)";
                this.updateRepoDisplay();
                return CONFIG.DEFAULT_JSON_URL;
            }
            for (let i = 0; i < data.mirrors.length; i++) {
                const mirror = data.mirrors[i];
                if (loader && loader.style.display !== 'none') loader.querySelector('p').innerText = `Testing: ${mirror.repo}...`;
                if (repoDisplay) repoDisplay.innerText = `Testing: ${mirror.repo}`;
                try {
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
                } catch (err) {}
            }
        } catch (e) {
            this.showToast("Error fetching mirror list", 'error');
        }
        this.showToast("All mirrors failed, using default", 'warning');
        this.activeRepoName = "RipperHybrid (Default)";
        this.updateRepoDisplay();
        return CONFIG.DEFAULT_JSON_URL;
    }

    async fetchLibrary() {
        const loader = document.getElementById('loader');
        const grid = document.getElementById('gridContainer');
        const repoDisplay = document.getElementById('repo-source');

        try {
            this.fetchError = null;
            loader.style.display = 'flex';
            loader.innerHTML = '<div class="spinner"></div><p>Connecting...</p>';
            grid.innerHTML = '';

            if (!(await this.checkInternet())) throw new Error("No internet connection");

            if (this.activeJsonUrl === CONFIG.DEFAULT_JSON_URL) this.activeJsonUrl = await this.getWorkingMirror();

            loader.querySelector('p').innerText = "Loading Fonts...";

            const response = await fetch(this.activeJsonUrl);
            if (!response.ok) throw new Error("Failed to fetch JSON");
            this.data = await response.json();

            loader.style.display = 'none';
            this.renderGrid(this.currentCategory);

        } catch (error) {
            this.fetchError = error;
            loader.style.display = 'none';
            if (repoDisplay) {
                repoDisplay.innerText = "Connection Failed";
                repoDisplay.style.color = "var(--danger)";
            }
            this.renderGrid(this.currentCategory);
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
            const selectedItem = this.queue[category];
            let buttonText = 'Select .ttf';
            let sizeText = '';

            if (selectedItem) {
                buttonText = selectedItem.filename;
                if (selectedItem.size) {
                    sizeText = `<div class="card-size">${selectedItem.size}</div>`;
                }
            } else {
                sizeText = `<div class="card-size">Not Selected</div>`;
            }

            customCard.innerHTML = `<div class="card-preview" style="display:flex; align-items:center; justify-content:center; flex-direction:column; padding:10px; background: var(--bg-tertiary);">${StylizeTextIcons.getUploadIcon()}<span style="margin-top: 8px; font-size: 0.9em; color: var(--text-secondary);">Local File</span></div><div class="card-info"><div class="card-title">${cardTitle}</div>${sizeText}<button class="install-btn" onclick="window.fontUI.selectAndAddCustomFont('${category}')" ${selectedItem ? 'style="background: var(--success); color: #000;"' : ''}>${buttonText}</button></div>`;
            grid.appendChild(customCard);
        }

        if (this.fetchError) {
            const errorContainer = document.createElement('div');
            errorContainer.style.cssText = "grid-column: 1 / -1; width: 100%; display: flex; justify-content: center; margin-top: 20px;";
            errorContainer.innerHTML = `
                <div class="offline-message">
                    <div class="offline-icon">${StylizeTextIcons.getOfflineIcon()}</div>
                    <div class="offline-title">Connection Failed</div>
                    <div class="offline-desc">${this.fetchError.message}</div>
                    <button onclick="window.fontUI.fetchLibrary()" class="retry-btn">
                        <span>↻</span> Try Again
                    </button>
                </div>
            `;
            grid.appendChild(errorContainer);
            return;
        }

        if (!this.data || !this.data[category]) {
            if (grid.children.length === 0 || (grid.children.length === 1 && (category === 'Fonts' || category === 'Emoji'))) {
                const msg = document.createElement('p');
                msg.style.cssText = 'grid-column: 1 / -1; text-align:center; width:100%; color:var(--text-secondary); margin-top: 20px;';
                msg.innerText = 'No items found.';
                grid.appendChild(msg);
            }
            return;
        }

        const items = this.data[category];
        Object.keys(items).forEach(folderName => {
            const itemData = items[folderName];
            const card = document.createElement('div');
            card.className = 'font-card';
            const imgUrl = itemData.preview || 'placeholder.png';
            const displayImg = imgUrl.startsWith('http') ? imgUrl : 'https://placehold.co/400x200?text=No+Preview';

            const totalBytes = (itemData.files || []).reduce((sum, f) => sum + (f.size_bytes || 0), 0);
            const sizeLabel = totalBytes > 0 ? formatSize(totalBytes) : '';

            card.innerHTML = `<div class="card-preview"><img src="${displayImg}" loading="lazy" alt="${folderName}"></div><div class="card-info"><div class="card-title">${folderName}</div>${sizeLabel ? `<div class="card-size">${sizeLabel}</div>` : ''}<button class="install-btn" onclick="window.fontUI.openInstallModal('${category}', '${folderName}')">Select</button></div>`;
            grid.appendChild(card);
        });
    }

    openInstallModal(category, folderName) {
        if (this.queue[category] !== null) {
            this.showToast(`Already selected a ${category}. Clear it first!`, 'warning');
            return;
        }
        const itemData = this.data[category][folderName];
        const modal = document.getElementById('installModal');
        document.getElementById('modalTitle').innerText = folderName;
        const img = document.getElementById('modalPreview');
        if (itemData.preview) {
            img.src = itemData.preview;
            img.style.display = 'block';
        } else img.style.display = 'none';
        const list = document.getElementById('modalFileList');
        list.innerHTML = '';

        itemData.files.forEach(file => {
            const expectedSize = file.size_bytes || 0;
            const row = document.createElement('div');
            row.className = 'file-row';
            row.innerHTML = `<span>${file.filename}</span><button class="download-action-btn" onclick="window.fontUI.addToQueue('${category}', '${folderName}', '${file.download_url}', '${file.filename}', this, ${expectedSize})">Add to Queue</button>`;
            list.appendChild(row);
        });

        modal.classList.add('active');
        this.toggleBodyLock(true);
    }

    async addToQueue(category, folderName, url, filename, btnElement, expectedSize = 0) {
        const modal = document.getElementById('installModal');
        const closeBtn = modal.querySelector('.close-modal');
        modal.classList.add('locked');
        closeBtn.classList.add('locked');

        if (typeof ksu === 'undefined' && !STATE.ROOT_BIN) {
            this.showToast(`[Browser Mode] Added to queue: ${filename}`, 'info');
            this.queue[category] = { name: folderName, path: `/mock/${filename}`, filename: filename };
            this.updateBuildUI();
            this.renderGrid(this.currentCategory);
            this.unlockModal(modal, closeBtn);
            return;
        }
        if (!(await this.checkInternet())) {
            this.showToast("No internet connection", 'error');
            this.unlockModal(modal, closeBtn);
            return;
        }
        this.showToast(`Starting download process...`, 'info');
        const destPath = `${CONFIG.TEMP_DIR}/${category}_${filename}`;
        const originalText = btnElement.innerText;
        btnElement.disabled = true;
        btnElement.innerText = "Checking size...";
        let pollInterval = null;
        let expectedBytes = expectedSize;

        try {
            if (!expectedBytes) {
                await this.ksuExec(`echo "[Size Tracker] Fallback triggered. Fetching size via wget --spider..."`);
                const sizeCmd = `sh -c "${STATE.BB} wget --spider --server-response '${url}' 2>&1 | ${STATE.BB} grep -i 'Content-Length' | tail -n 1 | awk '{print \\$2}' | tr -d '\\r'"`;
                const sizeOutput = await this.ksuExec(sizeCmd);
                expectedBytes = parseInt(sizeOutput.trim()) || 0;
            } else {
                await this.ksuExec(`echo "[Size Tracker] Target size pre-loaded from JSON: ${expectedBytes} bytes"`);
            }

            this.showToast(`Downloading ${filename}...`, 'info');
            await this.ksuExec(`rm -f "${destPath}"`);

            const bgCmd = `sh -c "${STATE.BB} wget --no-check-certificate -O '${destPath}' '${url}' > /dev/null 2>&1 & echo \\$!"`;
            const pidOutput = await this.ksuExec(bgCmd);
            const pid = pidOutput.trim();

            if (!pid) throw new Error("Wget failed to start");

            await wait(2000);
            const checkImmediate = await this.ksuExec(`if [ -d "/proc/${pid}" ]; then echo "running"; else echo "stopped"; fi`);

            if (checkImmediate.includes("stopped")) {
                const quickSizeCmd = `sh -c "${STATE.BB} wc -c '${destPath}' | awk '{print \\$1}'"`;
                const quickSize = await this.ksuExec(quickSizeCmd);
                if (!quickSize || parseInt(quickSize) < 100) {
                    throw new Error("Wget failed (likely HTTPS)");
                }
            }

            pollInterval = setInterval(async () => {
                try {
                    const sizeCmd = `sh -c "${STATE.BB} du -h '${destPath}' | awk '{print \\$1}'"`;
                    const size = await this.ksuExec(sizeCmd);
                    if (size && size.trim() !== "" && !size.includes("No such")) btnElement.innerText = `DL: ${size.trim()}`;
                    const checkRunning = await this.ksuExec(`if [ -d "/proc/${pid}" ]; then echo "running"; else echo "stopped"; fi`);
                    if (checkRunning.includes("stopped")) {
                        clearInterval(pollInterval);
                        this.finalizeDownload(category, folderName, destPath, filename, btnElement, originalText, modal, closeBtn, expectedBytes);
                    }
                } catch (err) {}
            }, 1000);

        } catch (e) {
            if (pollInterval) clearInterval(pollInterval);
            this.showToast("Wget failed, trying fallback...", 'warning');

            try {
                btnElement.innerText = "Streaming...";
                await this.downloadViaBrowserBridge(url, destPath, (bytes) => {
                    btnElement.innerText = `DL: ${(bytes / 1024 / 1024).toFixed(2)} MB`;
                });
                this.finalizeDownload(category, folderName, destPath, filename, btnElement, originalText, modal, closeBtn, expectedBytes);
            } catch (err2) {
                this.handleDownloadError(btnElement, originalText, err2.message);
                this.unlockModal(modal, closeBtn);
            }
        }
    }

    async downloadViaBrowserBridge(url, destPath, progressCallback) {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Network error");
        const reader = response.body.getReader();
        await this.ksuExec(`rm -f "${destPath}" && touch "${destPath}"`);
        let receivedLength = 0;

        const CHUNK_SIZE = 1024 * 64;
        let buffer = new Uint8Array(0);

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                if (buffer.length > 0) {
                    const b64 = this.arrayBufferToBase64(buffer);
                    await this.ksuExec(`sh -c "echo '${b64}' | base64 -d >> '${destPath}'"`);
                }
                break;
            }

            const newBuffer = new Uint8Array(buffer.length + value.length);
            newBuffer.set(buffer);
            newBuffer.set(value, buffer.length);
            buffer = newBuffer;

            while (buffer.length >= CHUNK_SIZE) {
                const chunkToProcess = buffer.slice(0, CHUNK_SIZE);
                buffer = buffer.slice(CHUNK_SIZE);
                const b64 = this.arrayBufferToBase64(chunkToProcess);
                await this.ksuExec(`sh -c "echo '${b64}' | base64 -d >> '${destPath}'"`);
            }

            receivedLength += value.length;
            if (progressCallback) progressCallback(receivedLength);
        }
    }

    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    async finalizeDownload(category, folderName, destPath, filename, btnElement, originalText, modal, closeBtn, expectedBytes) {
        try {
            const check = await this.ksuExec(`if [ -f "${destPath}" ]; then echo "exists"; fi`);
            if (check.includes("exists")) {
                if (expectedBytes > 0) {
                    const localSizeCmd = `sh -c "${STATE.BB} wc -c '${destPath}' | awk '{print \\$1}'"`;
                    const localResult = await this.ksuExec(localSizeCmd);
                    const localBytes = parseInt(localResult.trim());

                    if (localBytes !== expectedBytes) {
                        await this.ksuExec(`rm -f "${destPath}"`);
                        const expMB = (expectedBytes / 1048576).toFixed(2);
                        const gotMB = (localBytes / 1048576).toFixed(2);
                        throw new Error(`Size mismatch! Expected ${expMB} MB but got ${gotMB} MB. File is corrupted or incomplete.`);
                    }
                }
                const finalSizeCmd = `sh -c "${STATE.BB} du -h '${destPath}' | awk '{print \\$1}'"`;
                const finalSize = await this.ksuExec(finalSizeCmd);
                btnElement.innerText = `Done (${finalSize.trim()})`;
                this.queue[category] = { name: folderName, path: destPath, filename: filename };
                this.showToast(`Verified: ${folderName}`, 'success');
                this.updateBuildUI();
                this.renderGrid(this.currentCategory);
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
        this.showToast(`Error: ${msg}`, 'error');
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
        if (hasEmoji && hasFont) {
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
        this.renderGrid(this.currentCategory);
        this.closeClearModal();
    }

    async deleteFile(category) {
        if (!this.queue[category]) return;
        const path = this.queue[category].path;
        if ((typeof ksu !== 'undefined' || STATE.ROOT_BIN) && !path.startsWith('/storage/emulated/0') && !path.startsWith('/mnt/media_rw/')) {
            await this.ksuExec(`rm -f "${path}"`);
            this.showToast(`Cleared ${category}`, 'info');
        } else {
            this.showToast(`Cleared ${category}`, 'info');
        }
    }

    updateBuildUI() {
        const emojiStatus = document.getElementById('emojiStatus');
        const fontStatus = document.getElementById('fontStatus');
        const flashBtn = document.getElementById('flashBtn');
        const clearContainer = document.getElementById('clearContainer');
        const hasEmoji = this.queue.Emoji !== null;
        const hasFont = this.queue.Fonts !== null;

        if (hasEmoji) {
            emojiStatus.innerText = `Emoji: ${this.queue.Emoji.filename}`;
            emojiStatus.classList.add('active');
            emojiStatus.classList.remove('empty');
        } else {
            emojiStatus.innerText = `Emoji: None`;
            emojiStatus.classList.remove('active');
            emojiStatus.classList.add('empty');
        }

        if (hasFont) {
            fontStatus.innerText = `Font: ${this.queue.Fonts.filename}`;
            fontStatus.classList.add('active');
            fontStatus.classList.remove('empty');
        } else {
            fontStatus.innerText = `Font: None`;
            fontStatus.classList.remove('active');
            fontStatus.classList.add('empty');
        }

        if (hasEmoji || hasFont) {
            clearContainer.innerHTML = `<button class="clear-btn" onclick="window.fontUI.handleClearClick()" title="Clear Selection">${StylizeTextIcons.getClearIcon()}</button>`;
        } else {
            clearContainer.innerHTML = '';
        }

        const hasItems = hasEmoji || hasFont;
        flashBtn.disabled = !hasItems;

        if (hasItems) {
            flashBtn.classList.add('ready');
            const count = (hasEmoji ? 1 : 0) + (hasFont ? 1 : 0);
            flashBtn.innerText = `Flash Module (${count} item${count > 1 ? 's' : ''})`;
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
        this.renderGrid(this.currentCategory);
        this.cleanup();
    }

    async selectAndAddCustomFont(category) {
        if (this.queue[category] !== null) {
            this.showToast(`Already selected a ${category}. Clear it first!`, 'warning');
            return;
        }

        try {
            this.pickerMode = 'font';
            this.baseBrowsePath = "/storage/emulated/0";
            const { path, name } = await this.openCustomFilePicker(category);

            let fileSize = '';
            if (typeof ksu !== 'undefined' || STATE.ROOT_BIN) {
                try {
                    const sizeCmd = `sh -c "${STATE.BB} wc -c '${path}' | awk '{print \\$1}'"`;
                    const sizeOutput = await this.ksuExec(sizeCmd);
                    const bytes = parseInt(sizeOutput.trim());
                    if (bytes > 0) {
                        fileSize = formatSize(bytes);
                    }
                } catch (e) {}
            }

            this.queue[category] = {
                name: name,
                path: path,
                filename: name,
                size: fileSize
            };
            this.showToast(`Added ${name} to Queue`, 'success');
            this.updateBuildUI();
            this.renderGrid(this.currentCategory);
        } catch (error) {
            if (error.message !== "File selection cancelled.") this.showToast(error.message, 'info');
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
            this.showToast("Enter a valid URL", 'warning');
            return;
        }
        try {
            input.disabled = true;
            if (!(await this.checkInternet())) throw new Error("No internet connection");
            const response = await fetch(url);
            const jsonStr = await response.text();
            let data;
            try { data = JSON.parse(jsonStr); } catch (e) { throw new Error("Invalid JSON structure"); }
            if (!data.Fonts && !data.Emoji) throw new Error("JSON missing Fonts or Emoji keys");
            this.activeJsonUrl = url;
            this.activeRepoName = "Custom Source";
            this.updateRepoDisplay();
            this.fetchLibrary();
            this.showToast("Source Updated", 'success');
            this.closeSettings();
        } catch (e) {
            this.showToast(`Error: ${e.message}`, 'error');
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
        let targetVal = (type === 'busybox') ? STATE.BB : STATE.ROOT_CMD;
        this.currentFilePath = "/data/adb";
        if (targetVal && targetVal.startsWith("/data/adb") && targetVal.includes("/")) {
            let dir = targetVal.substring(0, targetVal.lastIndexOf('/'));
            if (dir.startsWith("/data/adb")) this.currentFilePath = dir;
        }
        this.openCustomFilePicker(null);
    }

    applyPreset(preset) {
        if (preset === 'ksu') {
            STATE.ROOT_BIN = "/data/adb/ksu/bin";
            STATE.BB = `${STATE.ROOT_BIN}/busybox`;
            STATE.ROOT_CMD = `${STATE.ROOT_BIN}/ksud`;
            STATE.ROOT_MANAGER = "ksud";
            STATE.INSTALL_ARGS = "module install";
        } else if (preset === 'apatch') {
            STATE.ROOT_BIN = "/data/adb/apd";
            STATE.BB = `${STATE.ROOT_BIN}/busybox`;
            STATE.ROOT_CMD = `${STATE.ROOT_BIN}/apd`;
            STATE.ROOT_MANAGER = "apd";
            STATE.INSTALL_ARGS = "module install";
        } else if (preset === 'magisk') {
            STATE.ROOT_BIN = "/data/adb/magisk";
            STATE.BB = `${STATE.ROOT_BIN}/busybox`;
            STATE.ROOT_CMD = `${STATE.ROOT_BIN}/magisk`;
            STATE.ROOT_MANAGER = "magisk";
            STATE.INSTALL_ARGS = "--install-module";
        }
        this.updateSettingsUI();
        this.showToast(`Applied ${preset.toUpperCase()} preset`, 'success');
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
        if (this.pickerMode === 'font' && this.queue[category] !== null) {
            const msg = `Already selected a ${category}. Clear it first!`;
            this.showToast(msg, 'warning');
            return Promise.reject(new Error(msg));
        }
        const modal = document.getElementById('fileSelectorModal');
        modal.classList.add('active');
        this.toggleBodyLock(true);
        if (this.pickerMode === 'font') {
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
        if (this.currentFilePath === CONFIG.STORAGE_ROOT) {
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
            this.currentFilePath = CONFIG.STORAGE_ROOT;
            this.updateFileBrowserPath();
            this.listFilesInPath(CONFIG.STORAGE_ROOT);
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
        let icon;
        if (type === 'volume') {
            icon = (name === "Internal Storage")
                ? StylizeTextIcons.getInternalStorageIcon()
                : StylizeTextIcons.getSdCardIcon();
        } else if (type === 'dir') {
            icon = StylizeTextIcons.getFolderIcon();
        } else {
            icon = StylizeTextIcons.getFileIcon();
        }
        const text = (name === '..') ? '.. (Up)' : name;
        itemEl.innerHTML = `${icon}<span>${text}</span>`;
        itemEl.style.animationDelay = `${delay}s`;
        return itemEl;
    }

    async listFilesInPath(path) {
        const listEl = document.getElementById('file-selector-list');
        listEl.innerHTML = `<div class="loading-files">Loading...</div>`;
        if (path === CONFIG.STORAGE_ROOT) {
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
        if (this.pickerMode === 'binary') command = `sh -c "cd '${path}' && ls -1p | sort"`;
        else command = `sh -c "cd '${path}' && ls -1p | grep -E '/$|\\.ttf$' | sort"`;
        try {
            const stdout = await this.ksuExec(command);
            listEl.innerHTML = "";
            const items = stdout.split('\n').filter(Boolean);
            let delay = 0;
            const isVolumeRoot = (path === "/storage/emulated/0" || (path.startsWith("/mnt/media_rw/") && path.split('/').length === 4));
            if (path !== "/data/adb") {
                const upEl = this.createFileItemElement("..", "dir", delay);
                if (isVolumeRoot && this.pickerMode !== 'binary') upEl.dataset.target = CONFIG.STORAGE_ROOT;
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
                if (item.dataset.target === CONFIG.STORAGE_ROOT) {
                    this.currentFilePath = CONFIG.STORAGE_ROOT;
                    this.updateFileBrowserPath();
                    this.listFilesInPath(CONFIG.STORAGE_ROOT);
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
                if (this.binarySelectionType === 'busybox') STATE.BB = filePath;
                else if (this.binarySelectionType === 'installer') STATE.ROOT_CMD = filePath;
                this.updateSettingsUI();
                this.closeCustomFilePicker("Binary selected");
                this.showToast(`Updated ${this.binarySelectionType}`, 'success');
            } else {
                if (this.filePickerPromise.resolve) this.filePickerPromise.resolve({ path: filePath, name: name });
                this.closeCustomFilePicker("File selected");
            }
        }
    }

    async handleFilePathClick(e) {
        const segment = e.target.closest(".path-segment");
        if (!segment) return;
        if (segment.innerText === "Storage Devices") {
            this.currentFilePath = CONFIG.STORAGE_ROOT;
            this.updateFileBrowserPath();
            await this.listFilesInPath(CONFIG.STORAGE_ROOT);
            return;
        }
        if (segment.dataset.path) {
            this.currentFilePath = segment.dataset.path;
            this.updateFileBrowserPath();
            await this.listFilesInPath(this.currentFilePath);
        }
    }

    async handleFileBrowserBack() {
        if (this.currentFilePath === CONFIG.STORAGE_ROOT) {
            this.closeCustomFilePicker();
            return;
        }
        const isVolumeRoot = (this.currentFilePath === "/storage/emulated/0" || (this.currentFilePath.startsWith("/mnt/media_rw/") && this.currentFilePath.split('/').length === 4));
        if (isVolumeRoot && this.pickerMode !== 'binary') {
            this.currentFilePath = CONFIG.STORAGE_ROOT;
            this.updateFileBrowserPath();
            await this.listFilesInPath(CONFIG.STORAGE_ROOT);
            return;
        }
        let limit = (this.pickerMode === 'binary') ? "/data/adb" : "/mnt";
        if (this.currentFilePath !== limit && this.currentFilePath.length > limit.length) {
            let newPath = this.currentFilePath.substring(0, this.currentFilePath.lastIndexOf('/'));
            this.currentFilePath = newPath;
            this.updateFileBrowserPath();
            await this.listFilesInPath(this.currentFilePath);
        } else {
            this.closeCustomFilePicker();
        }
    }
}

window.switchTab = (cat) => window.fontUI.renderGrid(cat);
window.fontUI = new FontCraftUI();