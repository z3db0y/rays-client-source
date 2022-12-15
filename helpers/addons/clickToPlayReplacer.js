const Store = require('electron-store');
const config = new Store();
const path = require('path');

let instructions = document.getElementById('instructions');
let timerVal = document.getElementById('timerVal');

function applyReplacer() {
    if(config.get('clickToPlayReplacer', false)) {
        let text = Array.from(instructions.childNodes).find(x => x.nodeType == 3);
        if(!text) return;
        text.nodeValue = timerVal.textContent || '00:00';
    }
}

setInterval(applyReplacer, 100);

if(config.get('clickToPlayReplacer', false)) timerVal.textContent = '00:00';