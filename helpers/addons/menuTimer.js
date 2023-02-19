module.exports = () => {
    const config = {
        get: (k, d) => {
        let v = require('electron').ipcRenderer.sendSync('config.get', k);
        if (typeof v === 'undefined') return d;
        return v;
    },
        set: (k, v) => require('electron').ipcRenderer.sendSync('config.set', k, v)
    }
    if(!config.get('menuTimer', false)) return;
    let timerVal = document.getElementById('timerVal');
    let instructions = document.getElementById('instructions');
    let v;

    Object.defineProperty(timerVal, 'textContent', {
        set: function(val) {
            this.innerText = val;
            ([...instructions.childNodes].find(x => x.nodeType == 3) || instructions).textContent = val;
            v = val;
        }
    });

    let oSetter = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;
    Object.defineProperty(instructions, 'innerHTML', {
        set: function(val) {
            oSetter.call(this, val);
            ([...instructions.childNodes].find(x => x.nodeType == 3) || this).textContent = v;
        }
    });
}