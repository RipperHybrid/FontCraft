import { CONFIG, STATE } from './config.js';
import { StylizeTextIcons } from './icons.js';

export async function detectStorageVolumes() {
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

export async function openCustomFilePicker(category) {
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

export function closeCustomFilePicker(reason = "File selection cancelled.") {
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

export function updateFileBrowserPath() {
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

export function createFileItemElement(name, type, delay) {
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

export async function listFilesInPath(path) {
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

export async function handleFileBrowserClick(e) {
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
            if(typeof ksu !== 'undefined') ksu.toast(`Updated ${this.binarySelectionType}`);
        } else {
            if (this.filePickerPromise.resolve) this.filePickerPromise.resolve({path: filePath, name: name});
            this.closeCustomFilePicker("File selected");
        }
    }
}

export async function handleFilePathClick(e) {
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

export async function handleFileBrowserBack() {
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
    } else this.closeCustomFilePicker();
}