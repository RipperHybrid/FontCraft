const JSON_URL = "https://raw.githubusercontent.com/RipperHybrid/FontCraft/Master/fonts.json";
const TEMPLATE_URL = "https://raw.githubusercontent.com/RipperHybrid/FontCraft/Master/template/Template.zip";
const TEMP_DIR = "/data/local/tmp/fontcraft_cache";
const BUILD_DIR = "/data/local/tmp/fontcraft_build";

const SYSTEM_FONTS = [
    "Roboto-Regular.ttf", "RobotoStatic-Regular.ttf", "RobotoFlex-Regular.ttf", 
    "DroidSansMono.ttf", "CutiveMono.ttf", 
    "NotoSerif-Regular.ttf", "NotoSerif-Bold.ttf", "NotoSerif-Italic.ttf", "NotoSerif-BoldItalic.ttf",
    "SourceSansPro-Regular.ttf", "SourceSansPro-Italic.ttf", "SourceSansPro-SemiBold.ttf",
    "SourceSansPro-SemiBoldItalic.ttf", "SourceSansPro-Bold.ttf", "SourceSansPro-BoldItalic.ttf",
    "ComingSoon.ttf", "DancingScript-Regular.ttf", "CarroisGothicSC-Regular.ttf"
];

class FontCraftUI {
    constructor() {
        this.data = null;
        this.currentCategory = 'Emoji'; 
        this.themes = ['dark', 'light', 'retro'];
        this.queue = {
            Emoji: null, 
            Fonts: null  
        };
        
        this.baseBrowsePath = "/storage/emulated/0";
        this.currentFilePath = this.baseBrowsePath;
        this.filePickerPromise = { resolve: null, reject: null };
        
        this.init();
    }

    init() {
        this.cleanup();
        window.addEventListener('unload', () => this.cleanup());
        window.addEventListener('pagehide', () => this.cleanup());
        this.loadTheme();
        this.setupListeners();
        this.fetchLibrary();
        this.updateBuildUI(); 
    }

    toggleScrollLock(isLocked) {
        if (isLocked) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }
    }

    ksuExec(command) {
        return new Promise((resolve, reject) => {
            if (typeof ksu === 'undefined' || typeof ksu.exec !== 'function') {
                console.log(`[Mock] Exec: ${command}`);
                resolve("Success (Mock)");
                return;
            }

            const callbackName = `exec_callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            window[callbackName] = (errno, stdout, stderr) => {
                delete window[callbackName];
                if (errno !== 0) {
                    reject(new Error(stderr || `Error ${errno}`));
                } else {
                    resolve(stdout);
                }
            };
            ksu.exec(command, "{}", callbackName);
        });
    }

    async checkInternet() {
        if (typeof ksu === 'undefined') {
            return navigator.onLine;
        }
        try {
            await this.ksuExec('/data/adb/ksu/bin/busybox ping -c 1 8.8.8.8');
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

    setupListeners() {
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        document.querySelector('#installModal .close-modal').addEventListener('click', () => {
            document.getElementById('installModal').classList.remove('active');
            this.toggleScrollLock(false);
        });
        document.getElementById('installModal').addEventListener('click', (e) => {
            if(e.target.id === 'installModal' && !e.target.classList.contains('locked')) {
                e.target.classList.remove('active');
                this.toggleScrollLock(false);
            }
        });
        
        document.getElementById('fileSelectorModal').addEventListener('click', (e) => {
            if(e.target.id === 'fileSelectorModal') {
                this.closeCustomFilePicker();
            }
        });
        
        document.getElementById('file-selector-back').innerHTML = StylizeTextIcons.getBackIcon();
    }

    async fetchLibrary() {
        const loader = document.getElementById('loader');
        const grid = document.getElementById('gridContainer');
        
        try {
            loader.style.display = 'flex';
            grid.innerHTML = '';
            
            if (!(await this.checkInternet())) {
                throw new Error("No internet connection");
            }

            await this.ksuExec(`mkdir -p "${TEMP_DIR}"`);
            
            const response = await fetch(JSON_URL);
            if(!response.ok) throw new Error("Failed to fetch JSON");
            
            this.data = await response.json();
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

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.innerText.includes(category));
        });

        if (category === 'Fonts' || category === 'Emoji') {
            const customCard = document.createElement('div');
            customCard.className = 'font-card';
            const cardTitle = category === 'Fonts' ? 'Custom Font' : 'Custom Emoji';
            
            customCard.innerHTML = `
                <div class="card-preview" style="display:flex; align-items:center; justify-content:center; flex-direction:column; padding:10px; background: var(--bg-tertiary);">
                    ${StylizeTextIcons.getUploadIcon()}
                    <span style="margin-top: 8px; font-size: 0.9em; color: var(--text-secondary);">Local File</span>
                </div>
                <div class="card-info">
                    <div class="card-title">${cardTitle}</div>
                    <button class="install-btn" onclick="window.fontUI.selectAndAddCustomFont('${category}')">
                        Select .ttf
                    </button>
                </div>
            `;
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

            card.innerHTML = `
                <div class="card-preview">
                    <img src="${displayImg}" loading="lazy" alt="${folderName}">
                </div>
                <div class.card-info">
                    <div class="card-title">${folderName}</div>
                    <button class="install-btn" onclick="window.fontUI.openInstallModal('${category}', '${folderName}')">
                        Select
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    openInstallModal(category, folderName) {
        if(this.queue[category] !== null) {
            if(typeof ksu !== 'undefined') ksu.toast(`Already selected a ${category}. Clear it first!`);
            else alert(`Already selected a ${category}. Clear it first!`);
            return;
        }

        const itemData = this.data[category][folderName];
        const modal = document.getElementById('installModal');
        
        document.getElementById('modalTitle').innerText = folderName;
        
        const img = document.getElementById('modalPreview');
        if(itemData.preview) {
            img.src = itemData.preview;
            img.style.display = 'block';
        } else {
            img.style.display = 'none';
        }

        const list = document.getElementById('modalFileList');
        list.innerHTML = '';

        itemData.files.forEach(file => {
            const row = document.createElement('div');
            row.className = 'file-row';
            row.innerHTML = `
                <span>${file.filename}</span>
                <button class="download-action-btn" onclick="window.fontUI.addToQueue('${category}', '${folderName}', '${file.download_url}', '${file.filename}', this)">
                    Add to Queue
                </button>
            `;
            list.appendChild(row);
        });

        modal.classList.add('active');
        this.toggleScrollLock(true);
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
        btnElement.innerText = "Initializing...";
        
        let pollInterval = null;

        try {
            ksu.toast(`Downloading ${filename}...`);
            
            const bgCmd = `/data/adb/ksu/bin/busybox wget --no-check-certificate -O "${destPath}" "${url}" > /dev/null 2>&1 & echo $!`;
            const pidOutput = await this.ksuExec(bgCmd);
            const pid = pidOutput.trim();

            if(!pid) throw new Error("Failed to start download process");

            pollInterval = setInterval(async () => {
                try {
                    const size = await this.ksuExec(`/data/adb/ksu/bin/busybox du -h "${destPath}" | awk '{print $1}'`);
                    if(size && size.trim() !== "" && !size.includes("No such")) {
                        btnElement.innerText = `DL: ${size.trim()}`;
                    }
                    
                    const checkRunning = await this.ksuExec(`if [ -d "/proc/${pid}" ]; then echo "running"; else echo "stopped"; fi`);
                    if(checkRunning.includes("stopped")) {
                        clearInterval(pollInterval);
                        this.finalizeDownload(category, folderName, destPath, filename, btnElement, originalText, modal, closeBtn);
                    }
                } catch(err) {
                    console.error(err);
                }
            }, 1000);

        } catch (e) {
            if(pollInterval) clearInterval(pollInterval);
            this.handleDownloadError(btnElement, originalText, e.message, modal, closeBtn);
        }
    }

    async finalizeDownload(category, folderName, destPath, filename, btnElement, originalText, modal, closeBtn) {
        try {
            const check = await this.ksuExec(`if [ -f "${destPath}" ]; then echo "exists"; fi`);
            
            if(check.includes("exists")) {
                const finalSize = await this.ksuExec(`/data/adb/ksu/bin/busybox du -h "${destPath}" | awk '{print $1}'`);
                btnElement.innerText = `Done (${finalSize.trim()})`;
                
                this.queue[category] = {
                    name: folderName,
                    path: destPath,
                    filename: filename
                };
                
                ksu.toast(`✅ Added ${folderName} to Queue`);
                this.updateBuildUI();
                
                setTimeout(() => {
                    this.unlockModal(modal, closeBtn);
                }, 500);
            } else {
                throw new Error("Download failed or file empty");
            }
        } catch (e) {
            this.handleDownloadError(btnElement, originalText, e.message, modal, closeBtn);
        }
    }

    handleDownloadError(btn, originalText, msg, modal, closeBtn) {
        btn.innerText = "Failed";
        btn.disabled = false;
        if(typeof ksu !== 'undefined') ksu.toast(`❌ Error: ${msg}`);
        
        modal.classList.remove('locked');
        closeBtn.classList.remove('locked');
        
        setTimeout(() => { btn.innerText = originalText; }, 2000);
    }

    unlockModal(modal, closeBtn) {
        modal.classList.remove('locked');
        closeBtn.classList.remove('locked');
        modal.classList.remove('active');
        this.toggleScrollLock(false);
    }

    handleClearClick() {
        const hasEmoji = this.queue.Emoji !== null;
        const hasFont = this.queue.Fonts !== null;

        if(hasEmoji && hasFont) {
            document.getElementById('clearSelectionModal').classList.add('active');
            this.toggleScrollLock(true);
        } else if (hasEmoji) {
            this.clearQueueItem('Emoji');
        } else if (hasFont) {
            this.clearQueueItem('Fonts');
        }
    }

    closeClearModal() {
        document.getElementById('clearSelectionModal').classList.remove('active');
        this.toggleScrollLock(false);
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
        if(typeof ksu !== 'undefined' && !path.startsWith('/storage/emulated/0')) {
            await this.ksuExec(`rm -f "${path}"`);
            ksu.toast(`Cleared ${category}`);
        } else if (typeof ksu !== 'undefined') {
             ksu.toast(`Cleared ${category}`);
        }
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

        if(hasEmoji || hasFont) {
            clearContainer.innerHTML = `<button class="clear-btn" onclick="window.fontUI.handleClearClick()" title="Clear Selection">${StylizeTextIcons.getClearIcon()}</button>`;
        } else {
            clearContainer.innerHTML = '';
        }

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
        this.toggleScrollLock(true);
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
        this.toggleScrollLock(false);
        this.queue = { Emoji: null, Fonts: null };
        this.updateBuildUI();
        this.cleanup();
    }

    async processAndFlash() {
        if(typeof ksu === 'undefined') return alert("KSU Required");
        
        const btn = document.getElementById('flashBtn');
        const originalText = btn.innerText;
        
        try {
            btn.innerText = "Preparing Files...";
            btn.disabled = true;

            if (this.queue.Emoji && !this.queue.Emoji.path.startsWith('/storage/emulated/0') &&
                this.queue.Fonts && !this.queue.Fonts.path.startsWith('/storage/emulated/0')) {
                if (!(await this.checkInternet())) {
                    throw new Error("No internet connection");
                }
            }

            await this.ksuExec(`rm -rf "${BUILD_DIR}" && mkdir -p "${BUILD_DIR}"`);

            const templatePath = `${TEMP_DIR}/template.zip`;
            if (!templatePath.startsWith('/storage/emulated/0')) {
                 if (!(await this.checkInternet())) {
                    throw new Error("No internet connection to download template");
                 }
                 await this.ksuExec(`/data/adb/ksu/bin/busybox wget --no-check-certificate -O "${templatePath}" "${TEMPLATE_URL}"`);
            }
            
            await this.ksuExec(`/data/adb/ksu/bin/busybox unzip -o "${templatePath}" -d "${BUILD_DIR}"`);
            
            await this.ksuExec(`mkdir -p "${BUILD_DIR}/system/fonts"`);

            let fontName = "";
            let emojiName = "";

            if(this.queue.Emoji) {
                await this.ksuExec(`cp "${this.queue.Emoji.path}" "${BUILD_DIR}/system/fonts/NotoColorEmoji.ttf"`);
                emojiName = this.queue.Emoji.filename.replace(/\.[^/.]+$/, "");
            }

            if(this.queue.Fonts) {
                const fontPath = this.queue.Fonts.path;
                fontName = this.queue.Fonts.filename.replace(/\.[^/.]+$/, "");
                
                let copyCmd = "";
                SYSTEM_FONTS.forEach(sysFont => {
                    copyCmd += `cp "${fontPath}" "${BUILD_DIR}/system/fonts/${sysFont}"; `;
                });
                await this.ksuExec(copyCmd);
            }

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

            const customizeScript = `#!/sbin/sh

ui_print "************************************"
ui_print "   FontCraft Module Builder      "
ui_print "************************************"
ui_print " "
ui_print "- ${uiPrintMsg}"
ui_print " "

if [ -d "$MODPATH/binaries" ]; then
    chmod +x "$MODPATH"/binaries/*
    ui_print "- ✅ Set execute permissions for all binaries."
    ui_print " "
fi

ui_print "************************************"
ui_print " "`;

            
            await this.ksuExec(`echo '${customizeScript}' > "${BUILD_DIR}/customize.sh"`);

            await this.ksuExec(`printf "\\n" >> "${BUILD_DIR}/module.prop"`);
            await this.ksuExec(`echo "${descMsg}" >> "${BUILD_DIR}/module.prop"`);

            btn.innerText = "Creating Module...";
            const finalZip = `${TEMP_DIR}/FontCraft_Install.zip`;
            await this.ksuExec(`cd "${BUILD_DIR}" && /data/adb/modules/StylizeText/binaries/zip -r "${finalZip}" .`);

            this.showTerminal();
            
            const installCmd = `/data/adb/ksu/bin/ksud module install "${finalZip}"`;
            const result = await this.ksuExec(installCmd);
            
            this.updateTerminal(result);
            this.updateTerminal("\n[PROCESS COMPLETED]");
            
            document.getElementById('termCloseBtn').style.display = 'block';
            
            ksu.toast("✅ Operation Complete");

        } catch (e) {
            ksu.toast(`❌ Flash Failed: ${e.message}`);
            if(document.getElementById('terminalModal').classList.contains('active')) {
                this.updateTerminal(`\n[ERROR] ${e.message}`);
                document.getElementById('termCloseBtn').style.display = 'block';
            } else {
                alert(`Error: ${e.message}`);
            }
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
    
    async selectAndAddCustomFont(category) {
        try {
            const { path, name } = await this.openCustomFilePicker(category);
            
            this.queue[category] = {
                name: `Local: ${name}`,
                path: path,
                filename: name
            };
            
            if(typeof ksu !== 'undefined') ksu.toast(`✅ Added ${name} to Queue`);
            this.updateBuildUI();

        } catch (error) {
            if(typeof ksu !== 'undefined' && error.message !== "File selection cancelled.") {
                ksu.toast(`ℹ️ ${error.message}`);
            }
            console.log(error.message);
        }
    }

    openCustomFilePicker(category) {
        if(this.queue[category] !== null) {
            const msg = `Already selected a ${category}. Clear it first!`;
            if(typeof ksu !== 'undefined') ksu.toast(msg);
            else alert(msg);
            return Promise.reject(new Error(msg));
        }
        
        const modal = document.getElementById('fileSelectorModal');
        modal.classList.add('active');
        this.toggleScrollLock(true);
        
        this.currentFilePath = this.baseBrowsePath;
        this.updateFileBrowserPath();
        this.listFilesInPath(this.currentFilePath);
        
        document.getElementById('file-selector-list').onclick = (e) => this.handleFileBrowserClick(e);
        document.getElementById('file-selector-path').onclick = (e) => this.handleFilePathClick(e);
        document.getElementById('file-selector-back').onclick = () => this.handleFileBrowserBack();

        return new Promise((resolve, reject) => {
            this.filePickerPromise = { resolve, reject };
        });
    }
    
    closeCustomFilePicker(reason = "File selection cancelled.") {
        const modal = document.getElementById('fileSelectorModal');
        modal.classList.remove('active');
        this.toggleScrollLock(false);
        
        document.getElementById('file-selector-list').onclick = null;
        document.getElementById('file-selector-path').onclick = null;
        document.getElementById('file-selector-back').onclick = null;
        
        if (this.filePickerPromise.reject) {
            this.filePickerPromise.reject(new Error(reason));
        }
        this.filePickerPromise = { resolve: null, reject: null };
    }
    
    updateFileBrowserPath() {
        const pathEl = document.getElementById('file-selector-path');
        const parts = this.currentFilePath.replace(this.baseBrowsePath, "").split('/').filter(Boolean);
        pathEl.innerHTML = "";

        const baseSegment = document.createElement('span');
        baseSegment.className = "path-segment";
        baseSegment.innerText = "Internal Storage";
        baseSegment.dataset.path = this.baseBrowsePath;
        pathEl.appendChild(baseSegment);

        let pathSoFar = this.baseBrowsePath;
        parts.forEach(part => {
            pathSoFar += `/${part}`;
            
            const separator = document.createElement('span');
            separator.className = "separator";
            separator.innerText = "›";
            pathEl.appendChild(separator);

            const segment = document.createElement('span');
            segment.className = "path-segment";
            segment.innerText = part;
            segment.dataset.path = pathSoFar;
            pathEl.appendChild(segment);
        });
        pathEl.scrollTo({ left: pathEl.scrollWidth, behavior: "smooth" });
    }

    createFileItemElement(name, type, delay) {
        const itemEl = document.createElement('div');
        itemEl.className = 'file-item';
        itemEl.dataset.type = type;
        itemEl.dataset.name = name;
        
        const icon = (type === 'dir') ? StylizeTextIcons.getFolderIcon() : StylizeTextIcons.getFileIcon();
        const text = (name === '..') ? '.. (Up)' : name;
        
        itemEl.innerHTML = `
            ${icon}
            <span>${text}</span>
        `;
        
        itemEl.style.animationDelay = `${delay}s`;
        return itemEl;
    }

    async listFilesInPath(path) {
        const listEl = document.getElementById('file-selector-list');
        listEl.innerHTML = `<div class="loading-files">Loading...</div>`;
        
        const command = `
            cd "${path}" && 
            find . -maxdepth 1 \\( -type d ! -name ".*" \\) -o \\( -type f -name "*.ttf" \\) | sort
        `;
        
        try {
            const stdout = await this.ksuExec(command);
            listEl.innerHTML = "";
            const items = stdout.split('\n').filter(Boolean);
            
            let delay = 0;

            if (path !== this.baseBrowsePath) {
                const upEl = this.createFileItemElement("..", "dir", delay);
                listEl.appendChild(upEl);
                delay += 0.03;
            }

            items.forEach(item => {
                const name = item.replace("./", "");
                if (name === ".") return;

                const isDirectory = !name.endsWith(".ttf");
                
                const itemEl = this.createFileItemElement(name, isDirectory ? 'dir' : 'file', delay);
                listEl.appendChild(itemEl);
                delay += 0.03;
            });
        } catch (stderr) {
            listEl.innerHTML = `<div class="error-files">Error: ${stderr}</div>`;
        }
    }
    
    async handleFileBrowserClick(e) {
        const item = e.target.closest(".file-item");
        if (!item) return;

        const type = item.dataset.type;
        const name = item.dataset.name;

        if (type === "dir") {
            if (name === "..") {
                if (this.currentFilePath === this.baseBrowsePath) return;
                let newPath = this.currentFilePath.substring(0, this.currentFilePath.lastIndexOf('/'));
                if (newPath.length < this.baseBrowsePath.length) {
                    newPath = this.baseBrowsePath;
                }
                this.currentFilePath = newPath;
            } else {
                this.currentFilePath = this.currentFilePath + "/" + name;
            }
            this.updateFileBrowserPath();
            await this.listFilesInPath(this.currentFilePath);

        } else if (type === "file") {
            const filePath = this.currentFilePath + "/" + name;
            
            if (this.filePickerPromise.resolve) {
                this.filePickerPromise.resolve({path: filePath, name: name});
            }
            this.closeCustomFilePicker("File selected");
        }
    }

    async handleFilePathClick(e) {
        const segment = e.target.closest(".path-segment");
        if (!segment) return;
        
        const path = segment.dataset.path;
        this.currentFilePath = path;
        this.updateFileBrowserPath();
        await this.listFilesInPath(this.currentFilePath);
    }

    async handleFileBrowserBack() {
        if (this.currentFilePath === this.baseBrowsePath) return;
        let newPath = this.currentFilePath.substring(0, this.currentFilePath.lastIndexOf('/'));
        if (newPath.length < this.baseBrowsePath.length) {
            newPath = this.baseBrowsePath;
        }
        this.currentFilePath = newPath;
        this.updateFileBrowserPath();
        await this.listFilesInPath(this.currentFilePath);
    }

}

window.switchTab = (cat) => window.fontUI.renderGrid(cat);

document.addEventListener('DOMContentLoaded', () => {
    window.fontUI = new FontCraftUI();
});
