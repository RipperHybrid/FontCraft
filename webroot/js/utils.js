export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconHtml = '';
    if (type === 'success') iconHtml = '✅';
    else if (type === 'error') iconHtml = '❌';
    else if (type === 'warning') iconHtml = '⚠️';
    else iconHtml = 'ℹ️';

    toast.innerHTML = `<span class="icon">${iconHtml}</span><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

let cachedToken = null;
let cachedPort = null;

async function getServerPort() {
    if (cachedPort) return cachedPort;
    cachedPort = window.location.port || '80';
    return cachedPort;
}

async function getAuthToken() {
    if (cachedToken) return cachedToken;
    cachedToken = window.location.hash.substring(1);
    if (!cachedToken) {
        cachedToken = sessionStorage.getItem('fc_token') || "";
    } else {
        sessionStorage.setItem('fc_token', cachedToken);
        window.history.replaceState(null, null, ' ');
    }
    return cachedToken;
}

export function ksuExec(command, commandHistory = []) {
    if (typeof ksu !== 'undefined' && typeof ksu.exec === 'function') {
        return new Promise((resolve, reject) => {
            const callbackName = `exec_callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            window[callbackName] = (errno, stdout, stderr) => {
                delete window[callbackName];

                if (commandHistory) {
                    commandHistory.push({
                        command,
                        output: stdout,
                        error: errno !== 0 ? (stderr || `Error ${errno}`) : null,
                        time: new Date().toLocaleString()
                    });
                }

                if (errno !== 0) reject(new Error(stderr || `Error ${errno}`));
                else resolve(stdout);
            };

            ksu.exec(command, "{}", callbackName);
        });
    }

    return new Promise(async (resolve, reject) => {
        try {
            const port = await getServerPort();
            const token = await getAuthToken();

            const response = await fetch(`http://127.0.0.1:${port}/cgi-bin/exec`, {
                method: 'POST',
                headers: {
                    'X-FontCraft-Token': token,
                    'Content-Type': 'text/plain'
                },
                body: command
            });

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();

            if (commandHistory) {
                commandHistory.push({
                    command,
                    output: data.stdout || "",
                    error: data.code !== 0 ? (data.stderr || data.stdout || "Command failed") : null,
                    time: new Date().toLocaleString()
                });
            }

            if (data.code !== 0) {
                const errorMsg = data.stderr || data.stdout || "Command failed";
                reject(new Error(errorMsg.replace(/\\n/g, '\n')));
            } else {
                resolve((data.stdout || "").replace(/\\n/g, '\n'));
            }
        } catch (error) {
            if (commandHistory) {
                commandHistory.push({
                    command,
                    output: "",
                    error: error.message,
                    time: new Date().toLocaleString()
                });
            }
            reject(error);
        }
    });
}

export function formatSize(bytes) {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
}

export async function checkInternet(ksuExecFn, rootBin, bbPath) {
    if (typeof ksu === 'undefined' && !rootBin) return navigator.onLine;
    try {
        await ksuExecFn(`${bbPath} ping -c 1 8.8.8.8`);
        return true;
    } catch (e) {
        return false;
    }
}

export async function cleanupWorkspace(ksuExecFn, workDir) {
    const cmd = `rm -rf "${workDir}"`;
    try {
        await ksuExecFn(cmd);
    } catch (e) {}
}

export function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
}

export async function downloadViaBrowserBridge(url, destPath, ksuExecFn, progressCallback) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network error");
    const reader = response.body.getReader();
    await ksuExecFn(`rm -f "${destPath}" && touch "${destPath}"`);
    let receivedLength = 0;
    const CHUNK_SIZE = 1024 * 64;
    let buffer = new Uint8Array(0);

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            if (buffer.length > 0) {
                const b64 = arrayBufferToBase64(buffer);
                await ksuExecFn(`sh -c "echo '${b64}' | base64 -d >> '${destPath}'"`);
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
            const b64 = arrayBufferToBase64(chunkToProcess);
            await ksuExecFn(`sh -c "echo '${b64}' | base64 -d >> '${destPath}'"`);
        }

        receivedLength += value.length;
        if (progressCallback) progressCallback(receivedLength);
    }
}

export async function loggedFetch(url, options = {}, commandHistory = []) {
    const method = options.method || 'GET';
    const label = `[fetch] ${method} ${url}`;
    const start = Date.now();
    try {
        const response = await fetch(url, options);
        const ms = Date.now() - start;
        commandHistory.push({
            command: label,
            output: `Status: ${response.status} ${response.statusText} (${ms}ms)`,
            error: response.ok ? null : `HTTP ${response.status}`,
            time: new Date().toLocaleString()
        });
        return response;
    } catch (e) {
        const ms = Date.now() - start;
        commandHistory.push({
            command: label,
            output: "",
            error: `${e.name}: ${e.message} (${ms}ms)`,
            time: new Date().toLocaleString()
        });
        throw e;
    }
}

export async function rootFetchText(url, ksuExecFn, bbPath) {
    const cmd = `sh -c "${bbPath} wget --no-check-certificate -q -O - '${url}'"`;
    return await ksuExecFn(cmd);
}

export async function rootCheckUrl(url, ksuExecFn, bbPath) {
    const cmd = `sh -c "${bbPath} wget --no-check-certificate --spider -q '${url}'; echo \\$?"`;
    const result = await ksuExecFn(cmd);
    return result.trim() === "0";
}

export async function resilientFetchJson(url, ksuExecFn, bbPath, commandHistory = []) {
    let browserError = null;
    try {
        const response = await loggedFetch(url, { cache: "no-store" }, commandHistory);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (e) {
        browserError = e.message;
    }

    commandHistory.push({
        command: `[root-fallback] GET ${url}`,
        output: "Browser fetch failed, retrying via root wget...",
        error: null,
        time: new Date().toLocaleString()
    });

    try {
        const text = await rootFetchText(url, ksuExecFn, bbPath);
        return JSON.parse(text);
    } catch (e2) {
        throw new Error(`Browser fetch failed (${browserError}), root fallback also failed (${e2.message})`);
    }
}

export async function resilientCheckUrl(url, ksuExecFn, bbPath, commandHistory = []) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await loggedFetch(url, { method: 'HEAD', signal: controller.signal, cache: "no-store" }, commandHistory);
        clearTimeout(timeoutId);
        if (response.ok) return true;
    } catch (e) {}

    commandHistory.push({
        command: `[root-fallback] HEAD ${url}`,
        output: "Browser HEAD check failed, retrying via root wget...",
        error: null,
        time: new Date().toLocaleString()
    });

    try {
        return await rootCheckUrl(url, ksuExecFn, bbPath);
    } catch (e2) {
        return false;
    }
}