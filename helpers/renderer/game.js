const { ipcRenderer } = require('electron');
const { app, session, shell } = require('electron').remote;
const path = require('path');
require(path.join(__dirname, 'common.js'));
const fs = require('fs');
const properties = require(path.join(__dirname, '../../properties.json'));
const defaultSettings = properties.defaultSettings;
const config = new (require('electron-store'))();
const injectSettings = require(path.join(__dirname, '../util/settInject.js'));
const injectChatCategorizer = require(path.join(__dirname, '../util/chatCategorizer.js'));
const loadGameFixes = () => require(path.join(__dirname, '../util/gameFixes.js'));
const loadChangelog = () => require(path.join(__dirname, '../util/changelog.js'));
const loadAltManager = () => require(path.join(__dirname, '../util/altManager.js'));
const loadWatermark = () => require(path.join(__dirname, '../util/watermark.js'));
const loadRPCEditor = () => require(path.join(__dirname, '../util/rpc.js'));
const loadServerBrowserUtil = () => require(path.join(__dirname, '../util/serverBrowserUtil.js'));
window.alert = (msg) => ipcRenderer.send('alert', msg);
window.confirm = (msg) => ipcRenderer.sendSync('confirm', msg);

ipcRenderer.on('krUsername', () => {
    ipcRenderer.send('krUsername', localStorage.getItem('krunker_username'));
});

function loadAddons(dev = false) {
    fs.readdirSync(path.join(__dirname, '../addons')).forEach(file => {
        if(file.endsWith('.js')) {
            if(!dev || file.startsWith('DEVONLY_')) require(path.join(__dirname, '../addons', file))();
        }
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
    let onclick = () => {
        if(!document.getElementById('confirmBtn')) return setTimeout(onclick, 100);
        document.getElementById('confirmBtn').onclick = () => app.quit();
    };
    document.getElementById('clientExit').addEventListener('click', onclick);
}

function injectLoadingScreen() {
    let initLoader = document.getElementById('initLoader');
    if(!initLoader) return setTimeout(injectLoadingScreen, 100);
    initLoader.style.backgroundSize = 'cover';
    if(config.get('loadingScreen', '')) initLoader.style.backgroundImage = `url(${config.get('loadingScreen', '')})`;
}

loadChangelog();
injectLoadingScreen();
loadServerBrowserUtil();
loadAddons(true);
document.addEventListener('DOMContentLoaded', async function() {
    if(window.location.protocol == 'file:') return disconnected();

    loadAddons();
    loadGameFixes();
    injectClientStylesheet();
    injectExitButton();
    loadAltManager();
    loadWatermark();
    loadRPCEditor();
    injectSettings();
    injectChatCategorizer();
    modEsportsBtn();
    rpc();
});

function modEsportsBtn() {
    let title = document.getElementById('menuBtnEsports');
    switch(config.get('esportsBtn', 'doNothing')) {
        case 'hide':
            title.parentElement.style.display = 'none';
            break;
        case 'hostComp':
            title.parentElement.setAttribute('onclick', 'openHostWindow(false,1)');
            title.textContent = 'Host Comp Game';
            break;
    }
}

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
        if(document.getElementById('signedInHeaderBar')?.style.display !== 'none') {
            window.getGameActivity ? ipcRenderer.send('updateDisplayName', getGameActivity().user, window.localStorage.getItem('krunker_username')) : null;
        }
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
    if(settings['twitch'] && settings['twitch'].token) delete settings['twitch'].token;
    if(settings['spotify'] && settings['spotify'].tokens) delete settings['spotify'].tokens;
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
    if(!confirm('Are you sure you want to reset your client settings?')) return;
    config.clear();
    alert('Client settings reset! Please restart the client to apply changes.');
}

window.openResourceSwapper = () => {
    let dir = path.join(app.getPath('documents'), 'KrunkerResourceSwapper');
    if(!fs.existsSync(dir)) return alert('Resource Swapper folder not found!');
    shell.openPath(dir);
};

function openMatchmakerUI() {
    let menuWindow = document.getElementById('menuWindow');
    menuWindow.innerHTML = `<div class="button buttonG" style="width:calc(100% - 55px);padding:12px 16px;position:relative;left:50%;transform:translateX(-50%)" onmouseenter="playTick()" onclick="showWindow(0),showWindow(1)">Back to settings</div><div class="settingsHeader" style="position:unset"><div style="padding-top:10px;padding-right:10px;text-align:right;float:right"></div><div id="allOn" class="settingsBtn">All on</div><div id="allOff" class="settingsBtn">All off</div><div id="togAll" class="settingsBtn">Toggle</div></div><div id="matchmakerSett" style="display:inline-block" class="setBodH"></div>`;

    let windowHolder = document.getElementById('windowHolder');
    windowHolder.style.display = 'block';
    windowHolder.classList = 'popupWin';
    menuWindow.style.width = '1000px';
    menuWindow.style.overflowY = 'auto';
    menuWindow.classList = 'dark';
}

window.openMatchmakerModes = () => {
    openMatchmakerUI();

    let matchmakerSett = document.getElementById('matchmakerSett');
    let gamemodes = properties.matchmaker.gamemodes;
    for(let mode in gamemodes) {
        let sett = document.createElement('div');
        sett.classList = 'settName';
        sett.innerHTML = `${mode} <label class="switch" style="margin-left:10px"><input type="checkbox"><span class="slider" style="width: 65px"><span class="grooves"></span></span></label>`;

        let modes = config.get('betterMatchmaker.modes', []);
        sett.getElementsByTagName('input')[0].checked = modes.includes(gamemodes[mode]);
        sett.getElementsByTagName('input')[0].addEventListener('change', e => {
            modes = config.get('betterMatchmaker.modes', []);
            if(e.target.checked && !modes.includes(gamemodes[mode])) modes.push(gamemodes[mode]);
            else if(!e.target.checked && modes.includes(gamemodes[mode])) modes.splice(modes.indexOf(gamemodes[mode]), 1);
            config.set('betterMatchmaker.modes', modes);
        });

        matchmakerSett.appendChild(sett);
    }

    document.getElementById('allOn').addEventListener('click', () => {
        [...document.getElementById('matchmakerSett').getElementsByTagName('input')].forEach(input => {
            input.checked = true;
        });
        config.set('betterMatchmaker.modes', Object.values(properties.matchmaker.gamemodes));
    });

    document.getElementById('allOff').addEventListener('click', () => {
        [...document.getElementById('matchmakerSett').getElementsByTagName('input')].forEach(input => {
            input.checked = false;
        });
        config.set('betterMatchmaker.modes', []);
    });

    document.getElementById('togAll').addEventListener('click', () => {
        [...document.getElementById('matchmakerSett').getElementsByTagName('input')].forEach(input => {
            input.checked = !input.checked;
        });
        let modes = config.get('betterMatchmaker.modes', []);
        let newModes = [];
        for(let mode in gamemodes) {
            if(modes.includes(gamemodes[mode])) continue;
            newModes.push(gamemodes[mode]);
        }
        config.set('betterMatchmaker.modes', newModes);
    });
};

window.openMatchmakerMaps = () => {
    openMatchmakerUI();

    let matchmakerSett = document.getElementById('matchmakerSett');
    let maps = properties.matchmaker.maps;
    for(let map of maps) {
        let sett = document.createElement('div');
        sett.classList = 'settName';
        sett.innerHTML = `${map} <label class="switch" style="margin-left:10px"><input type="checkbox"><span class="slider" style="width: 65px"><span class="grooves"></span></span></label>`;
        sett.getElementsByTagName('input')[0].checked = config.get('betterMatchmaker.maps', []).includes(map);
        sett.getElementsByTagName('input')[0].addEventListener('change', e => {
            let maps1 = config.get('betterMatchmaker.maps', []);
            if(e.target.checked && !maps1.includes(map)) maps1.push(map);
            else if(!e.target.checked && maps1.includes(map)) maps1.splice(maps1.indexOf(map), 1);
            config.set('betterMatchmaker.maps', maps1);
        });

        matchmakerSett.appendChild(sett);
    }

    document.getElementById('allOn').addEventListener('click', () => {
        [...document.getElementById('matchmakerSett').getElementsByTagName('input')].forEach(input => {
            input.checked = true;
        });
        config.set('betterMatchmaker.maps', maps);
    });

    document.getElementById('allOff').addEventListener('click', () => {
        [...document.getElementById('matchmakerSett').getElementsByTagName('input')].forEach(input => {
            input.checked = false;
        });
        config.set('betterMatchmaker.maps', []);
    });

    document.getElementById('togAll').addEventListener('click', () => {
        [...document.getElementById('matchmakerSett').getElementsByTagName('input')].forEach(input => {
            input.checked = !input.checked;
        });
        let maps1 = config.get('betterMatchmaker.maps', []);
        let newMaps = [];
        for(let map of maps) {
            if(maps1.includes(map)) continue;
            newMaps.push(map);
        }
        config.set('betterMatchmaker.maps', newMaps);
    });
};

window.openMatchmakerRegions = () => {
    openMatchmakerUI();

    let matchmakerSett = document.getElementById('matchmakerSett');
    let regions = properties.matchmaker.regions;
    for(let region in regions) {
        let sett = document.createElement('div');
        sett.classList = 'settName';
        sett.innerHTML = `${regions[region] == 0 ? region + ' (' + Object.keys(regions).find(r => regions[r] == (window.localStorage.getItem('kro_setngss_defaultRegion') || 'de-fra')) + ')' : region} <label class="switch" style="margin-left:10px"><input type="checkbox"><span class="slider" style="width: 65px"><span class="grooves"></span></span></label>`;
        sett.getElementsByTagName('input')[0].checked = config.get('betterMatchmaker.regions', []).includes(regions[region]);
        sett.getElementsByTagName('input')[0].addEventListener('change', e => {
            let regions1 = config.get('betterMatchmaker.regions', []);
            if(e.target.checked && !regions1.includes(regions[region])) regions1.push(regions[region]);
            else if(!e.target.checked && regions1.includes(regions[region])) regions1.splice(regions1.indexOf(regions[region]), 1);
            config.set('betterMatchmaker.regions', regions1);
        });

        matchmakerSett.appendChild(sett);
    }

    document.getElementById('allOn').addEventListener('click', () => {
        [...document.getElementById('matchmakerSett').getElementsByTagName('input')].forEach(input => {
            input.checked = true;
        });
        config.set('betterMatchmaker.regions', Object.values(properties.matchmaker.regions));
    });

    document.getElementById('allOff').addEventListener('click', () => {
        [...document.getElementById('matchmakerSett').getElementsByTagName('input')].forEach(input => {
            input.checked = false;
        });
        config.set('betterMatchmaker.regions', []);
    });

    document.getElementById('togAll').addEventListener('click', () => {
        [...document.getElementById('matchmakerSett').getElementsByTagName('input')].forEach(input => {
            input.checked = !input.checked;
        });
        let regions1 = config.get('betterMatchmaker.regions', []);
        let newRegions = [];
        for(let region in regions) {
            if(regions1.includes(regions[region])) continue;
            newRegions.push(regions[region]);
        }
        config.set('betterMatchmaker.regions', newRegions);
    });
};

window.openFlagEditor = () => {
    openMatchmakerUI();

    let matchmakerSett = document.getElementById('matchmakerSett');
    let flags = config.get('flags', {});
    for(let flag in flags) {
        let sett = document.createElement('div');
        sett.classList = 'settName';
        sett.innerHTML = `${flag} <label class="switch" style="margin-left:10px"><input type="checkbox"><span class="slider" style="width: 65px"><span class="grooves"></span></span></label>`;
        sett.getElementsByTagName('input')[0].checked = flags[flag];
        sett.getElementsByTagName('input')[0].addEventListener('change', e => {
            flags = config.get('flags', {});
            flags[flag] = e.target.checked;
            config.set('flags', flags);
        });

        matchmakerSett.appendChild(sett);
    }

    document.getElementById('allOn').addEventListener('click', () => {
        [...document.getElementById('matchmakerSett').getElementsByTagName('input')].forEach(input => {
            input.checked = true;
        });
        flags = config.get('flags', {});
        for(let flag in flags) {
            flags[flag] = true;
        }
        config.set('flags', flags);
    });

    document.getElementById('allOff').addEventListener('click', () => {
        [...document.getElementById('matchmakerSett').getElementsByTagName('input')].forEach(input => {
            input.checked = false;
        });
        flags = config.get('flags', {});
        for(let flag in flags) {
            flags[flag] = false;
        }
        config.set('flags', flags);
    });

    document.getElementById('togAll').addEventListener('click', () => {
        [...document.getElementById('matchmakerSett').getElementsByTagName('input')].forEach(input => {
            input.checked = !input.checked;
        });
        flags = config.get('flags', {});
        for(let flag in flags) {
            flags[flag] = !flags[flag];
        }
        config.set('flags', flags);
    });
};

function disconnected() {
    let resetProxy = document.getElementById('resetProxy');
    let refresh = document.getElementById('refresh');

    resetProxy.onclick = () => {
        config.set('proxy.enabled', false);
        resetProxy.disabled = true;
        resetProxy.textContent = 'Proxy disabled!';
        setTimeout(() => {
            resetProxy.textContent = 'Reset proxy';
            resetProxy.disabled = false;
        }, 2000);
    };

    refresh.onclick = () => window.location = 'https://krunker.io';
}