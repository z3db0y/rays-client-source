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

function loadAddons() {
    fs.readdirSync(path.join(__dirname, '../addons')).forEach(file => {
        if(file.endsWith('.js')) require(path.join(__dirname, '../addons', file))();
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