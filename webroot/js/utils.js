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
    const response = await fetch('/nexus/server_port');
    cachedPort = (await response.text()).trim();
    return cachedPort;
}

async function getAuthToken() {
    if (cachedToken) return cachedToken;
    const response = await fetch('/nexus/uplink_key');
    cachedToken = (await response.text()).trim();
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