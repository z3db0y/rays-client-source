module.exports = () => {
    const config = {
        get: (k, d) => {
        let v = require('electron').ipcRenderer.sendSync('config.get', k);
        if (typeof v === 'undefined') return d;
        return v;
    },
        set: (k, v) => require('electron').ipcRenderer.sendSync('config.set', k, v)
    }
    let multiplier = config.get('placeboFPS', 1);
    if(multiplier == 1) return;
    let ingameFPS = document.getElementById('ingameFPS');
    let menuFPS = document.getElementById('menuFPS');
    let lastVal = '';

    Object.defineProperty(ingameFPS, 'textContent', {
        set: function(val) {
            let randomAdd = Math.floor(Math.random() * multiplier * 2) - multiplier;
            this.innerText = Math.floor(parseInt(val) * multiplier + randomAdd);
            menuFPS.innerText = Math.floor(parseInt(val) * multiplier + randomAdd);
        }
    });

    Object.defineProperty(menuFPS, 'textContent', {
        set: function(_) {}
    });
}