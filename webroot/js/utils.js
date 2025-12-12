export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const toMono = (text) => {
    const normal = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const mono = [..."𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉"];
    return text.split('').map(char => {
        const index = normal.indexOf(char);
        return index > -1 ? mono[index] : char;
    }).join('');
};

export function ksuExec(command, commandHistory = []) {
    return new Promise((resolve, reject) => {
        if (typeof ksu === 'undefined' || typeof ksu.exec !== 'function') {
            if(commandHistory) {
                commandHistory.push({
                    command,
                    output: "Success (Mock)",
                    error: null,
                    time: new Date().toLocaleString()
                });
            }
            resolve("Success (Mock)");
            return;
        }

        const callbackName = `exec_callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        window[callbackName] = (errno, stdout, stderr) => {
            delete window[callbackName];
            if(commandHistory) {
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