const Store = require('electron-store');
const config = new Store();
const fs = require('fs');
const path = require('path');
const EventUtil = require(path.join(__dirname, '../util/eventUtil.js'));

let fastClasses = document.createElement('div');
fastClasses.style.background = 'none';
fastClasses.innerHTML = fs.readFileSync(path.join(__dirname, '../../html/classHolder.html'), 'utf8');
fastClasses.style.width = '100%';
fastClasses.style.position = 'absolute';
fastClasses.style.top = '0';
fastClasses.style.left = '0';
fastClasses.style.zIndex = '5';
fastClasses.style.padding = '20px 0';
fastClasses.style.textAlign = 'center';
fastClasses.style.display = 'none';
document.getElementById('menuHolder').prepend(fastClasses);

function updateState(enable) {
    if(document.getElementById('initLoader').style.display != 'none') {
        return setTimeout(() => updateState(enable), 100);
    }
    if(enable && document.getElementById('mMenuHolComp').style.display == 'none') {
        fastClasses.style.display = 'block';
        document.getElementById('mainLogo').style.display = 'none';
    } else {
        fastClasses.style.display = 'none';
        if(document.getElementById('mMenuHolComp').style.display == 'none') document.getElementById('mainLogo').style.display = 'block';
    }
}

updateState(config.get('fastClasses', false));

window.updateFastClasses = () => updateState(config.get('fastClasses', false));

EventUtil.on('compMenu', _ => updateState(config.get('fastClasses', false)));