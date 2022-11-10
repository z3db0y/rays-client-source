const path = require('path');
const EventUtil = require(path.join(__dirname, '../eventUtil.js'));
const Store = require('electron-store');
const config = new Store();

let ingameFPS = document.getElementById('ingameFPS');
let menuFPS = document.getElementById('menuFPS');

EventUtil.on('fpsChanged', _ => {
    if(ingameFPS.classList.contains('m')) return ingameFPS.classList.remove('m');
    ingameFPS.textContent = Math.round((parseInt(ingameFPS.textContent) || 0) * config.get('fpsMult', 1));
    ingameFPS.classList.add('m');
});

EventUtil.on('menuFpsChanged', _ => {
    if(menuFPS.classList.contains('m')) return menuFPS.classList.remove('m');
    menuFPS.textContent = Math.round((parseInt(menuFPS.textContent) || 0) * config.get('fpsMult', 1));
    menuFPS.classList.add('m');
});