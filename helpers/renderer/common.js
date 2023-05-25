let { ipcRenderer } = require('electron');
// console.log = (...args) => ipcRenderer.send('log_info', ...JSON.parse(JSON.stringify(args)));
console.error = (...args) => ipcRenderer.send('log_error', ...JSON.parse(JSON.stringify(args)));
console.debug = (...args) => ipcRenderer.send('log_debug', ...JSON.parse(JSON.stringify(args)));
console.warn = (...args) => ipcRenderer.send('log_warn', ...JSON.parse(JSON.stringify(args)));

document.addEventListener('DOMContentLoaded', () => {
    let imgs = [...document.getElementsByTagName('img')];
    imgs.forEach(img => {
        img.setAttribute('onerror', 'this.style.display = "none"');
    });
});