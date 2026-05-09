import { CONFIG, STATE } from './config.js';
import { ksuExec, wait, showToast, formatSize, checkInternet, cleanupWorkspace, downloadViaBrowserBridge } from './utils.js';
import { processAndFlash } from './flasher.js';
import { StylizeTextIcons } from './icons.js';
import { detectStorageVolumes, openCustomFilePicker, closeCustomFilePicker, updateFileBrowserPath, createFileItemElement, listFilesInPath, handleFileBrowserClick, handleFilePathClick, handleFileBrowserBack } from './files.js';

class FontCraftUI {
    constructor() {
        this.data = null;
        this.activeJsonUrl = CONFIG.DEFAULT_JSON_URL;
        this.activeRepoName = "RipperHybrid (Default)";
        this.currentCategory = 'Emoji';
        this.themes = ['retro'];
        this.queue = { Emoji: null, Fonts: null };
        this.pickerMode = 'font';
        this.binarySelectionType = null;
        this.baseBrowsePath = "/storage/emulated/0";
        this.currentFilePath = this.baseBrowsePath;
        this.filePickerPromise = { resolve: null, reject: null };
        this.settingsWasOpen = false;
        this.commandHistory = [];
        this.fetchError = null;

        this.selectedMirrorValue = 'default';
        this.selectedMirrorName = 'Auto-Detect (Default)';

        this.detectStorageVolumes = detectStorageVolumes.bind(this);
        this.openCustomFilePicker = openCustomFilePicker.bind(this);
        this.closeCustomFilePicker = closeCustomFilePicker.bind(this);
        this.updateFileBrowserPath = updateFileBrowserPath.bind(this);
        this.createFileItemElement = createFileItemElement.bind(this);
        this.listFilesInPath = listFilesInPath.bind(this);
        this.handleFileBrowserClick = handleFileBrowserClick.bind(this);
        this.handleFilePathClick = handleFilePathClick.bind(this);
        this.handleFileBrowserBack = handleFileBrowserBack.bind(this);

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
        this.fixStyles();
        window.addEventListener('unload', () => cleanupWorkspace(this.ksuExec.bind(this), CONFIG.WORK_DIR));
        window.addEventListener('pagehide', () => cleanupWorkspace(this.ksuExec.bind(this), CONFIG.WORK_DIR));
        this.loadTheme();
        this.setupListeners();
        this.injectSettingsUI();
        this.injectStaticIcons();

        try {
            await this.detectRootManager();
            await cleanupWorkspace(this.ksuExec.bind(this), CONFIG.WORK_DIR);
        } catch (e) {}

        this.populateMirrorsDropdown();
        this.fetchLibrary();
        this.updateBuildUI();
    }

    async populateMirrorsDropdown() {
        const wrapper = document.getElementById('mirrorSelectWrapper');
        if (!wrapper || wrapper.dataset.loaded === 'true') return;
        try {
            const response = await fetch(CONFIG.MIRRORS_URL, { cache: "no-store" });
            const data = await response.json();
            if (data.mirrors && Array.isArray(data.mirrors)) {
                const optionsContainer = document.getElementById('mirrorSelectOptions');
                const customOpt = optionsContainer.querySelector('[data-value="custom"]');
                data.mirrors.forEach((m) => {
                    const opt = document.createElement('div');
                    opt.className = 'custom-option';
                    opt.dataset.value = m.url;
                    opt.textContent = m.repo;
                    optionsContainer.insertBefore(opt, customOpt);
                });
                wrapper.dataset.loaded = 'true';
                this.bindCustomSelectOptions();
                this.updateSettingsUI();
            }
        } catch (e) {
            console.error("Failed to load mirrors for dropdown", e);
        }
    }

    bindCustomSelectOptions() {
        const options = document.querySelectorAll('.custom-option');
        const triggerSpan = document.querySelector('#mirrorSelectTrigger span');
        const customRow = document.getElementById('customUrlRow');

        options.forEach(opt => {
            opt.onclick = () => {
                options.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                triggerSpan.textContent = opt.textContent;
                this.selectedMirrorValue = opt.dataset.value;
                this.selectedMirrorName = opt.textContent;

                if (this.selectedMirrorValue === 'custom') {
                    customRow.style.display = 'flex';
                } else {
                    customRow.style.display = 'none';
                }

                document.getElementById('mirrorSelectOptions').classList.remove('open');
                document.getElementById('mirrorSelectTrigger').classList.remove('open');

                setTimeout(() => {
                    const group = triggerSpan.closest('.settings-group');
                    if (group) group.style.zIndex = '';
                }, 200);
            };
        });
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
            container.style.marginTop = '10px';
            container.innerHTML = `<label>Installation Command Arguments</label><div class="input-row"><input type="text" id="installArgsInput" class="settings-input" value="module install" placeholder="e.g. module install"></div><p style="font-size:0.65em; color:var(--text2); margin-top:4px">Full command: <span style="font-family:monospace">\${STATE.ROOT_CMD} <span id="cmdPreview">module install</span> "zip"</span></p>`;
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
            if (ksuCheck.includes('exists')) { this.applyPreset('ksu'); return; }
        } catch (e) {}

        try {
            const apdCheck = await this.ksuExec("if [ -d '/data/adb/apd' ]; then echo 'exists'; fi");
            if (apdCheck.includes('exists')) { this.applyPreset('apatch'); return; }
        } catch (e) {}

        try {
            const magiskCheck = await this.ksuExec("if [ -f '/data/adb/magisk/busybox' ]; then echo 'exists'; fi");
            if (magiskCheck.includes('exists')) { this.applyPreset('magisk'); return; }
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

        const triggerSpan = document.querySelector('#mirrorSelectTrigger span');
        const customRow = document.getElementById('customUrlRow');
        const customInput = document.getElementById('sourceInput');
        const options = document.querySelectorAll('.custom-option');

        if (triggerSpan && options.length > 0) {
            options.forEach(o => o.classList.remove('selected'));

            if (this.activeJsonUrl === CONFIG.DEFAULT_JSON_URL) {
                this.selectedMirrorValue = 'default';
                this.selectedMirrorName = 'Auto-Detect (Default)';
                triggerSpan.textContent = this.selectedMirrorName;
                document.querySelector('.custom-option[data-value="default"]').classList.add('selected');
                customRow.style.display = 'none';
            } else {
                let found = false;
                options.forEach(opt => {
                    if(opt.dataset.value === this.activeJsonUrl && this.activeJsonUrl !== 'custom') {
                        opt.classList.add('selected');
                        triggerSpan.textContent = opt.textContent;
                        this.selectedMirrorValue = opt.dataset.value;
                        this.selectedMirrorName = opt.textContent;
                        found = true;
                    }
                });
                if(!found) {
                    this.selectedMirrorValue = 'custom';
                    this.selectedMirrorName = 'Custom URL...';
                    triggerSpan.textContent = this.selectedMirrorName;
                    document.querySelector('.custom-option[data-value="custom"]').classList.add('selected');
                    customRow.style.display = 'flex';
                    customInput.value = this.activeJsonUrl;
                } else {
                    customRow.style.display = 'none';
                }
            }
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

    loadTheme() {
        document.body.classList.add('retro-mode');
    }

    toggleBodyLock(isLocked) {
        if (isLocked) document.body.classList.add('modal-open');
        else {
            const activeModals = document.querySelectorAll('.modal-overlay.active');
            if (activeModals.length <= 1) document.body.classList.remove('modal-open');
        }
    }

    setupListeners() {
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('settingsBtn').innerHTML = StylizeTextIcons.getSettingsIcon();

        const rebootFabIcon = document.getElementById('rebootFabIcon');
        if(rebootFabIcon) rebootFabIcon.innerHTML = StylizeTextIcons.getRebootIcon();

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

        this.bindCustomSelectOptions();

        const trigger = document.getElementById('mirrorSelectTrigger');
        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const options = document.getElementById('mirrorSelectOptions');
                const isOpening = !options.classList.contains('open');

                if (isOpening) {
                    options.classList.add('open');
                    trigger.classList.add('open');
                    trigger.closest('.settings-group').style.zIndex = '999';
                } else {
                    options.classList.remove('open');
                    trigger.classList.remove('open');
                    setTimeout(() => trigger.closest('.settings-group').style.zIndex = '', 200);
                }
            });
        }

        document.addEventListener('click', (e) => {
            const wrapper = document.getElementById('mirrorSelectWrapper');
            if (wrapper && !wrapper.contains(e.target)) {
                const options = document.getElementById('mirrorSelectOptions');
                const triggerEl = document.getElementById('mirrorSelectTrigger');
                if (options && options.classList.contains('open')) {
                    options.classList.remove('open');
                    triggerEl.classList.remove('open');
                    setTimeout(() => triggerEl.closest('.settings-group').style.zIndex = '', 200);
                }
            }
        });
    }

    updateRepoDisplay() {
        const el = document.getElementById('repo-source');
        if (el) {
            el.innerText = `Source: ${this.activeRepoName}`;
            el.style.color = 'var(--cyan)';
            setTimeout(() => el.style.color = '', 1000);
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
                    const testResp = await fetch(mirror.url, { method: 'HEAD', signal: controller.signal, cache: "no-store" });
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
        const repoDisplay = document.getElementById('repo-source');

        try {
            this.fetchError = null;
            loader.style.display = 'flex';
            loader.innerHTML = '<div class="spinner"></div><p>Connecting...</p>';

            this.renderGrid(this.currentCategory);

            if (!(await checkInternet(this.ksuExec.bind(this), STATE.ROOT_BIN, STATE.BB))) throw new Error("No internet connection");

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
                repoDisplay.style.color = "var(--red)";
            }
            this.renderGrid(this.currentCategory);
        }
    }

    renderGrid(category) {
        this.currentCategory = category;
        const grid = document.getElementById('gridContainer');
        grid.innerHTML = '';
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === category));

        if (category === 'Fonts' || category === 'Emoji') {
            const customCard = document.createElement('div');
            customCard.className = 'font-card';
            const cardTitle = category === 'Fonts' ? 'Custom Font' : 'Custom Emoji';

            const selectedItem = this.queue[category];
            const isLocalItem = selectedItem && selectedItem.isLocal;

            let buttonText = 'Select .ttf';
            let sizeText = '<div class="card-size">Not Selected</div>';
            let btnStyle = '';
            let btnAction = `window.fontUI.selectAndAddCustomFont('${category}')`;
            let actionHtml = '';

            if (selectedItem) {
                if (isLocalItem) {
                    buttonText = selectedItem.filename.replace(/\.[^/.]+$/, "");
                    if (selectedItem.size) sizeText = `<div class="card-size">${selectedItem.size}</div>`;
                    btnStyle = 'background: rgba(52,211,153,0.08); border-color: rgba(52,211,153,0.3); color: var(--green);';
                } else {
                    buttonText = 'Clear Download First';
                    sizeText = `<div class="card-size">Using Online Item</div>`;
                    btnStyle = 'opacity: 0.5; cursor: not-allowed; border-color: transparent;';
                    btnAction = `window.fontUI.showToast('Clear the downloaded item from the queue first!', 'warning')`;
                }
                actionHtml = `<button class="install-btn" onclick="${btnAction}" style="${btnStyle}">${buttonText}</button>`;
            } else {
                actionHtml = `<div style="display:flex; gap:6px; width:100%;">
                    <button class="install-btn" onclick="${btnAction}" style="${btnStyle}; flex:1;">Storage</button>
                    <button class="install-btn" onclick="window.fontUI.selectCurrentItem('${category}')" style="flex:1; background:var(--bg2);">Current</button>
                </div>`;
            }

            customCard.innerHTML = `<div class="card-preview" style="display:flex; align-items:center; justify-content:center; flex-direction:column; gap:8px; padding:10px; background: var(--bg2);">${StylizeTextIcons.getUploadIcon()}<span style="font-size: 0.6rem; color: var(--text2); letter-spacing:1px; text-transform:uppercase;">Local File</span></div><div class="card-info"><div class="card-title">${cardTitle}</div>${sizeText}${actionHtml}</div>`;
            grid.appendChild(customCard);
        }

        const loader = document.getElementById('loader');
        if (loader && loader.style.display !== 'none') {
            return;
        }

        if (this.fetchError) {
            const errorContainer = document.createElement('div');
            errorContainer.style.cssText = "grid-column: 1 / -1; width: 100%; display: flex; justify-content: center; margin-top: 20px;";
            errorContainer.innerHTML = `<div class="offline-message"><div class="offline-icon">${StylizeTextIcons.getOfflineIcon()}</div><div class="offline-title">Connection Failed</div><div class="offline-desc">${this.fetchError.message}</div><button onclick="window.fontUI.fetchLibrary()" class="retry-btn"><span>&#8635;</span> Try Again</button></div>`;
            grid.appendChild(errorContainer);
            return;
        }

        if (!this.data || !this.data[category]) {
            const msg = document.createElement('p');
            msg.style.cssText = 'grid-column: 1 / -1; text-align:center; width:100%; color:var(--text2); margin-top: 20px; font-size:0.8rem;';
            msg.innerText = 'No items found.';
            grid.appendChild(msg);
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
        if (!(await checkInternet(this.ksuExec.bind(this), STATE.ROOT_BIN, STATE.BB))) {
            this.showToast("No internet connection", 'error');
            this.unlockModal(modal, closeBtn);
            return;
        }

        this.showToast(`Starting download process...`, 'info');

        try { await this.ksuExec(`mkdir -p "${CONFIG.WORK_DIR}"`); } catch(e) {}

        const destPath = `${CONFIG.WORK_DIR}/${category}_${filename}`;
        const originalText = btnElement.innerText;
        btnElement.disabled = true;
        btnElement.innerText = "Checking size...";
        let pollInterval = null;
        let expectedBytes = expectedSize;

        try {
            if (!expectedBytes) {
                const sizeCmd = `sh -c "${STATE.BB} wget --spider --server-response '${url}' 2>&1 | ${STATE.BB} grep -i 'Content-Length' | tail -n 1 | awk '{print \\$2}' | tr -d '\\r'"`;
                const sizeOutput = await this.ksuExec(sizeCmd);
                expectedBytes = parseInt(sizeOutput.trim()) || 0;
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
                if (!quickSize || parseInt(quickSize) < 100) throw new Error("Wget failed (likely HTTPS)");
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
                await downloadViaBrowserBridge(url, destPath, this.ksuExec.bind(this), (bytes) => {
                    btnElement.innerText = `DL: ${(bytes / 1024 / 1024).toFixed(2)} MB`;
                });
                this.finalizeDownload(category, folderName, destPath, filename, btnElement, originalText, modal, closeBtn, expectedBytes);
            } catch (err2) {
                this.handleDownloadError(btnElement, originalText, err2.message);
                this.unlockModal(modal, closeBtn);
            }
        }
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
        const isProtectedPath = path.includes('/data/adb/modules/') || path.includes('/data/adb/modules_update/');

        if ((typeof ksu !== 'undefined' || STATE.ROOT_BIN) && !path.startsWith('/storage/emulated/0') && !path.startsWith('/mnt/media_rw/') && !isProtectedPath) {
            await this.ksuExec(`rm -f "${path}"`);
            this.showToast(`Cleared ${category}`, 'info');
        } else {
            this.showToast(`Cleared ${category}`, 'info');
        }
    }

    updateBuildUI() {
        const emojiStatus    = document.getElementById('emojiStatus');
        const fontStatus     = document.getElementById('fontStatus');
        const emojiSlot      = document.getElementById('emojiSlot');
        const fontSlot       = document.getElementById('fontSlot');
        const flashBtn       = document.getElementById('flashBtn');
        const clearContainer = document.getElementById('clearContainer');

        const hasEmoji = this.queue.Emoji !== null;
        const hasFont  = this.queue.Fonts  !== null;

        if (hasEmoji) {
            emojiStatus.innerText = this.queue.Emoji.filename.replace(/\.[^/.]+$/, "");
            emojiSlot.classList.add('active');
        } else {
            emojiStatus.innerText = 'None';
            emojiSlot.classList.remove('active');
        }

        if (hasFont) {
            fontStatus.innerText = this.queue.Fonts.filename.replace(/\.[^/.]+$/, "");
            fontSlot.classList.add('active');
        } else {
            fontStatus.innerText = 'None';
            fontSlot.classList.remove('active');
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
            flashBtn.innerHTML = `&#9889; Flash Module (${count} item${count > 1 ? 's' : ''})`;
        } else {
            flashBtn.classList.remove('ready');
            flashBtn.innerHTML = '&#9889; Select to Flash';
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
        cleanupWorkspace(this.ksuExec.bind(this), CONFIG.WORK_DIR);
    }

    async selectAndAddCustomFont(category) {
        if (this.queue[category] !== null) {
            this.showToast(`Already selected a ${category}. Clear it first!`, 'warning');
            return;
        }
        try {
            this.showToast("Loading storage...", "info", 1500);
            this.pickerMode = 'font';
            const { path, name } = await this.openCustomFilePicker(category);

            let fileSize = '';
            if (typeof ksu !== 'undefined' || STATE.ROOT_BIN) {
                try {
                    const sizeCmd = `sh -c "${STATE.BB} wc -c '${path}' | awk '{print \\$1}'"`;
                    const sizeOutput = await this.ksuExec(sizeCmd);
                    const bytes = parseInt(sizeOutput.trim());
                    if (bytes > 0) fileSize = formatSize(bytes);
                } catch (e) {}
            }

            this.queue[category] = { name: name, path: path, filename: name, size: fileSize, isLocal: true };
            this.showToast(`Added ${name.replace(/\.[^/.]+$/, "")} to Queue`, 'success');
            this.updateBuildUI();
            this.renderGrid(this.currentCategory);
        } catch (error) {
            if (error.message !== "File selection cancelled.") this.showToast(error.message, 'info');
        }
    }

    async selectCurrentItem(category) {
        if (this.queue[category] !== null) {
            this.showToast(`Already selected a ${category}. Clear it first!`, 'warning');
            return;
        }

        let modPath = `/data/adb/modules/StylizeText`;

        try {
            const checkUpdate = await this.ksuExec(`if [ -f "${modPath}/update" ]; then echo "yes"; fi`);
            if (checkUpdate.includes("yes")) {
                modPath = `/data/adb/modules_update/StylizeText`;
            }
        } catch(e) {}

        let targetPath = "";

        if (category === 'Fonts') {
            const findCmd = `find "${modPath}/system/fonts" -type f -name '*.ttf' ! -name '*Emoji*' | head -n 1`;
            try {
                const result = await this.ksuExec(findCmd);
                targetPath = result.trim();
            } catch (e) {}
        } else {
            const emojiTest = `${modPath}/system/fonts/NotoColorEmoji.ttf`;
            try {
                const checkCmd = `if [ -f "${emojiTest}" ]; then echo "${emojiTest}"; fi`;
                const checkResult = await this.ksuExec(checkCmd);
                targetPath = checkResult.trim();
            } catch (e) {}
        }

        if (!targetPath) {
            this.showToast(`No current ${category} found in module!`, 'warning');
            return;
        }

        let itemName = `Current ${category}`;
        try {
            const propDesc = await this.ksuExec(`cat "${modPath}/module.prop" | grep "description="`);
            const descStr = propDesc.trim();

            if (category === 'Fonts') {
                const match = descStr.match(/(?:Injected|Applied) (.*?) font/);
                if (match && match[1]) itemName = match[1];
            } else if (category === 'Emoji') {
                const match = descStr.match(/(?:and|Applied) (.*?) emoji/);
                if (match && match[1]) itemName = match[1];
            }
        } catch (e) {}

        let fileSize = '';
        if (typeof ksu !== 'undefined' || STATE.ROOT_BIN) {
            try {
                const sizeCmd = `sh -c "${STATE.BB} wc -c '${targetPath}' | awk '{print \\$1}'"`;
                const sizeOutput = await this.ksuExec(sizeCmd);
                const bytes = parseInt(sizeOutput.trim());
                if (bytes > 0) fileSize = formatSize(bytes);
            } catch (e) {}
        }

        itemName = itemName.replace(/\.[^/.]+$/, "");

        this.queue[category] = { name: itemName, path: targetPath, filename: `${itemName}.ttf`, size: fileSize, isLocal: true };
        this.showToast(`Selected Current: ${itemName}`, 'success');
        this.updateBuildUI();
        this.renderGrid(this.currentCategory);
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

    async applySelectedMirror() {
        const customInput = document.getElementById('sourceInput');
        let targetUrl = '';
        let targetName = '';

        if (this.selectedMirrorValue === 'default') {
            this.activeJsonUrl = CONFIG.DEFAULT_JSON_URL;
            this.activeRepoName = "RipperHybrid (Default)";
            this.fetchLibrary();
            this.showToast("Source set to Auto-Detect", 'success');
            this.closeSettings();
            return;
        } else if (this.selectedMirrorValue === 'custom') {
            targetUrl = customInput.value.trim();
            targetName = "Custom Source";
            if (!targetUrl) { this.showToast("Enter a valid URL", 'warning'); return; }
        } else {
            targetUrl = this.selectedMirrorValue;
            targetName = this.selectedMirrorName;
        }

        try {
            document.getElementById('mirrorSelectTrigger').style.pointerEvents = 'none';
            customInput.disabled = true;

            if (!(await checkInternet(this.ksuExec.bind(this), STATE.ROOT_BIN, STATE.BB))) throw new Error("No internet connection");

            const response = await fetch(targetUrl);
            const jsonStr = await response.text();
            let data;
            try { data = JSON.parse(jsonStr); } catch (e) { throw new Error("Invalid JSON structure"); }
            if (!data.Fonts && !data.Emoji) throw new Error("JSON missing Fonts or Emoji keys");

            this.activeJsonUrl = targetUrl;
            this.activeRepoName = targetName;
            this.updateRepoDisplay();
            this.fetchLibrary();
            this.showToast("Source Updated", 'success');
            this.closeSettings();
        } catch (e) {
            this.showToast(`Error: ${e.message}`, 'error');
        } finally {
            document.getElementById('mirrorSelectTrigger').style.pointerEvents = 'auto';
            customInput.disabled = false;
        }
    }

    openBinaryPicker(type) {
        const modal = document.getElementById('settingsModal');
        if (modal.classList.contains('active')) {
            modal.classList.remove('active');
            this.settingsWasOpen = true;
        }
        this.showToast("Loading storage...", "info", 1500);
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

    async promptReboot() {
        const userConfirmed = await new Promise((resolve) => {
            const modal = document.getElementById('confirmationModal');
            const title = document.getElementById('confTitle');
            const desc = document.getElementById('confDescription');
            const yesBtn = document.getElementById('confYesBtn');
            const noBtn = document.getElementById('confNoBtn');

            title.innerText = "Reboot Device";
            desc.innerHTML = `Flash applied successfully. Do you want to reboot your device now to apply changes?`;

            modal.classList.add('active');
            this.toggleBodyLock(true);

            const cleanup = () => {
                modal.classList.remove('active');
                this.toggleBodyLock(false);
                yesBtn.onclick = null;
                noBtn.onclick = null;
            };

            yesBtn.onclick = () => { cleanup(); resolve(true); };
            noBtn.onclick = () => { cleanup(); resolve(false); };
        });

        if (userConfirmed) {
            this.showToast("Rebooting device...", 'info');
            try {
                await this.ksuExec(`reboot`);
            } catch (e) {
                this.showToast("Failed to reboot. Please reboot manually.", 'error');
            }
        }
    }
}

window.switchTab = (cat) => window.fontUI.renderGrid(cat);
window.fontUI = new FontCraftUI();