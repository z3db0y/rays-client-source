const { ipcRenderer } = require('electron');
const { app, session } = require('electron').remote;
const path = require('path');
require(path.join(__dirname, 'common.js'));
const fs = require('fs');
const defaultSettings = require(path.join(__dirname, '../../properties.json')).defaultSettings;
const config = new (require('electron-store'))({ defaults: defaultSettings });
const injectSettings = require(path.join(__dirname, '../util/settInject.js'));
const injectChatCategorizer = require(path.join(__dirname, '../util/chatCategorizer.js'));
const loadGameFixes = () => require(path.join(__dirname, '../util/gameFixes.js'));
const loadChangelog = () => require(path.join(__dirname, '../util/changelog.js'));
const loadAltManager = () => require(path.join(__dirname, '../util/altManager.js'));
const loadWatermark = () => require(path.join(__dirname, '../util/watermark.js'));
const loadRPCEditor = () => require(path.join(__dirname, '../util/rpc.js'));
window.alert = (msg) => ipcRenderer.send('alert', msg);

<<<<<<< HEAD
function loadAddons() {
    fs.readdirSync(path.join(__dirname, '../addons')).forEach(file => {
        if(file.endsWith('.js')) require(path.join(__dirname, '../addons', file))();
=======
// Preload background image
if(config.get('loadingBackground')) new Image().src = config.get('loadingBackground');

function escapeRegex(str) {
    return str.replace(/[\[\]\(\)\{\}\*\+\?\!\^\$\.\\\-\|]/g, '\\$&');
}

function getter(obj, key) {
    key = key.split('.');
    if(key.length > 1) {
        return getter(obj[key.shift()], key.join('.'));
    } else {
        return obj[key[0]];
    }
}

String.prototype.parse = function(opts) {
    let n = this.toString();
    for(var k in opts) {
        n = n.replace(new RegExp(escapeRegex('$' + k), 'g'), opts[k]);
    }
    return n;
}

function togglePopupContainer() {
    if(document.getElementById('clientPopupCont').style.display === 'flex') hidePopupContainer();
    else showPopupContainer();
}

function showPopupContainer() {
    playSelect();
    document.getElementById('clientPopupCont').style.display = 'flex';
}

function hidePopupContainer() {
    playSelect();
    document.getElementById('clientPopupCont').style.display = 'none';
}

window.setClientSetting = function(sett, value) {
    if(getter(properties.defaultSettings, sett) === undefined) return;
    config.set(sett, value);

    // Live update some settings.
    settingProcessor(sett, value);
}

function settingProcessor(sett, value) {
    switch(sett) {
        case 'kpd_ping_addon':
            if(value) { document.body.classList.add('kpdPingAddon'); }
            else { document.body.classList.remove('kpdPingAddon'); }
        case 'adBlock':
            if(value) { document.body.classList.add('adBlock'); }
            else { document.body.classList.remove('adBlock'); }
        case 'clickToPlayReplacer':
            if(value) document.getElementById('instructions').textContent = document.getElementById('timerVal').textContent;
            else document.getElementById('instructions').textContent = 'CLICK TO PLAY';
            break;
        case 'fastClasses':
            if(typeof window.updateFastClasses === 'function') window.updateFastClasses();
            break;
    }
}

function toggleSettings() {
    if(document.getElementById('clientPopupCont').style.display !== 'none') return hidePopupContainer();

    if(window.windows && window.showWindow) {
        if(window.windows[0].tabIndex != window.windows[0].tabs[window.windows[0].settingType].findIndex(t => t.name === 'Client') || document.getElementById('windowHolder').style.display === 'none' || !document.getElementById('settHolder')) {
            window.windows[0].tabIndex = window.windows[0].tabs[window.windows[0].settingType].findIndex(t => t.name === 'Client');
            window.showWindow(1);
            if(document.getElementById('windowHolder').style.display === 'none') window.showWindow(1);
            window.playSelect();

            document.getElementById('clientVersion').textContent = 'v' + version;
        } else {
            window.closWind();
        }
    }
}

function openAltManager() {
    document.getElementById('clientPopup').innerHTML = fs.readFileSync(path.join(__dirname, '../../html/altManager.html'));

    let elCont = document.getElementById('alts');
    let alts = config.get('alts');
    alts.sort((a, b) => a.username.toLowerCase() > b.username.toLowerCase() ? 1 : -1);
    for(var i in alts) {
        let alt = alts[i];

        let el = document.createElement('div');
        el.classList.add('clientItem');
        el.dataset.id = i;
        el.textContent = alt.username || 'Error';

        let btns = Array.from({ length: 3 }, () => {
            let btn = document.createElement('button');
            btn.classList.add('material-icons');
            el.appendChild(btn);
            return btn;
        });
        btns[0].textContent = 'login';
        btns[0].onclick = () => loginWithAlt(el.dataset.id);
        btns[1].textContent = 'edit'
        btns[1].onclick = () => editAlt(el.dataset.id);
        btns[2].textContent = 'delete';
        btns[2].onclick = () => deleteAlt(el.dataset.id);
        elCont.appendChild(el);
    }
    document.getElementById('addAlt').onclick = () => editAlt();

    showPopupContainer();
}


function injectPopup() {
    for(var sett in config.store) {
        settingProcessor(sett, config.get(sett));
    }

    let settingCont = document.createElement('div');
    settingCont.id = 'clientPopupCont';
    settingCont.style.display = 'none';
    settingCont.onclick = () => togglePopupContainer();
    let content = document.createElement('div');
    content.id = 'clientPopup';
    content.onclick = (event) => event.stopPropagation();
    settingCont.appendChild(content);
    document.body.appendChild(settingCont);

    document.addEventListener('keydown', (ev) => {
        if(ev.key === 'F1') {
            document.exitPointerLock();
            toggleSettings();
        }
>>>>>>> 93531a3d30c10dcab64b5a3eddd674e6158aceec
    });
}

function injectClientStylesheet() {
    let style = document.createElement('style');
    style.textContent = fs.readFileSync(path.join(__dirname, '../../html/styles.css')).toString();
    document.head.appendChild(style);
    if(config.get('adBlock', false)) document.body.classList.add('adBlock');
    if(config.get('kpdPingAddon', false)) document.body.classList.add('kpdPingAddon');
}

function injectExitButton() {
    document.getElementById('clientExit').style.display = 'flex';
    document.getElementById('clientExit').addEventListener('click', () => {
        document.getElementById('confirmBtn').onclick = () => app.quit();
    });
}

function injectLoadingScreen() {
    let initLoader = document.getElementById('initLoader');
    if(!initLoader) return setTimeout(injectLoadingScreen, 100);
    initLoader.style.backgroundSize = 'cover';
    if(config.get('loadingScreen', '')) initLoader.style.backgroundImage = `url(${config.get('loadingScreen', '')})`;
}

loadChangelog();
injectLoadingScreen();
document.addEventListener('DOMContentLoaded', async function() {
    loadAddons();
    loadGameFixes();
    injectClientStylesheet();
    injectExitButton();
    loadAltManager();
    loadWatermark();
    loadRPCEditor();
    injectSettings();
    injectChatCategorizer();
    rpc();
});

function rpc() {
    function sendRPC() {
        fetch('https://matchmaker.krunker.io/game-info?game=' + new URLSearchParams(window.location.search).get('game')).then(res => res.ok && res.json()).then(data => {
            if(!data) return;
            window.getGameActivity ? ipcRenderer.send('rpc', Object.assign({
                players: {
                    size: data[2],
                    max: data[3]
                },
                comp: document.getElementById('uiBase')?.classList?.contains('onCompMenu') || false
            }, getGameActivity())) : null;
        }).catch(_ => {});
    }
    setInterval(sendRPC, 10e3);
    sendRPC();
}

window.setClientSetting = (key, value) => {
    if(defaultSettings[key] == undefined) return;
    if(typeof value != typeof defaultSettings[key]) return;
    config.set(key, value);
};

document.addEventListener('keydown', e => {
    if(e.key == 'Escape') {
        document.exitPointerLock();
    }
});
<<<<<<< HEAD

window.clearCache = () => {
    session.defaultSession.clearCache();
    alert('Cache cleared! Please refresh the game to apply changes.');
};

window.exportClientSettings = () => {
    let settings = Object.assign(defaultSettings, config.store);
    delete settings['alts'];
    if(settings['twitch'] && settings['twitch'].token) delete settings['twitch'].token;
    let data = JSON.stringify(settings);
    let blob = new Blob([data], { type: 'text/plain' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = 'clientsettings.txt';
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
};

window.importClientSettingsPopup = () => {
    window.genericPopup('<div class="pubHed">Import Settings</div><div style="color:rgba(255,255,255,0.7);font-size:19px;text-align:center;margin-bottom:15px;">Copy Paste Settings Text Here</div><textarea id="importTxt" rows="3" onkeydown="if(event.keyCode == 13) importClientSettings();"></textarea><div class="mapFndB" onclick="importClientSettings()" onmouseover="playTick(0.1)" style="margin-left: 0px;margin-top: 10px;background-color:#4ca9f5;width: 380px;">Import</div>','importPop');
    document.getElementById('importTxt').focus();
};

window.importClientSettings = () => {
    let txt = document.getElementById('importTxt').value;
    window.clearPops();
    if(!txt) return;

    try {
        let settings = JSON.parse(txt);
        Object.keys(settings).forEach(key => {
            if(!Object.keys(defaultSettings).includes(key)) return;
            if(typeof settings[key] != typeof defaultSettings[key]) return;
            config.set(key, settings[key]);
        });
    } catch {
        alert('Failed to import client settings!');
    }
};

window.resetClientSettings = () => {
    config.clear();
    alert('Client settings reset! Please restart the client to apply changes.');
}
=======
ipcRenderer.send('gameActivity', null); // Reset
>>>>>>> 93531a3d30c10dcab64b5a3eddd674e6158aceec
