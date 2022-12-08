const Store = require('electron-store');
const config = new Store();
const path = require('path');
const EventUtil = require(path.join(__dirname, '../util/eventUtil.js'));

let instructions = document.getElementById('instructions');
let timerVal = document.getElementById('timerVal');

function applyReplacer() {
    if(config.get('clickToPlayReplacer', false)) {
        let text = Array.from(instructions.childNodes).find(x => x.nodeType == 3);
        if(!text) return;
        text.nodeValue = timerVal.textContent || '00:00';
    }
}

['timerChanged', 'instructionsUpdated'].forEach(event => EventUtil.on(event, applyReplacer));

if(config.get('clickToPlayReplacer', false)) timerVal.textContent = '00:00';