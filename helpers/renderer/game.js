const Store = require('electron-store');
const fs = require('fs');
const path = require('path');
let config = new Store();
let properties = require(path.join(__dirname, '../../properties.json'));
let { ipcRenderer } = require('electron');
let { app } = require('electron').remote;
let version = app.getVersion();
window.alert = (message) => { ipcRenderer.send('alert', message); };

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
        case 'skyImage':
            if(typeof window.updateSkyImage === 'function') window.updateSkyImage();
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
    });
}

function injectStyles() {
    let styleElement = document.createElement('style');
    styleElement.textContent = fs.readFileSync(path.join(__dirname, '../../html/styles.css'));
    document.body.appendChild(styleElement);
}

function injectAltManager() {
    let n = document.getElementById('customizeButton');
    let p = n.parentNode;
    p.removeChild(n);
    p.style.display = 'inherit';
    let c = document.createElement('div');
    let b = document.createElement('div');
    let i = document.createElement('span');
    i.textContent = 'person';
    i.classList.add('material-icons');
    i.style.cssText = n.children[0].style.cssText;
    b.classList.add('button');
    b.classList.add('buttonG');
    b.classList.add('bigShadowT');
    b.id = 'altManager';
    b.innerHTML = ' Alt Manager ';
    let cssText = `
        padding: 15px 15px 22px;
        font-size: 27px!important;
    `;
    let borderRed = `
    border: 4px solid #0A0!important;`;
    let borderWhite = `
    border: 4px solid #FFF!important;`;
    b.style.cssText = cssText + borderRed;
    b.appendChild(i);
    b.onmouseenter = function () { playTick(); this.style.cssText = cssText + borderWhite;  };
    b.onmouseleave = function () { this.style.cssText = cssText + borderRed; };
    b.onclick = function () { window.playSelect(0.1); openAltManager() };
    c.style.display = 'flex';
    c.style.flexDirection = 'column';
    c.appendChild(n);
    c.appendChild(b);
    p.appendChild(c);
}

function editAlt(id) {
    document.getElementById('clientPopup').innerHTML = fs.readFileSync(path.join(__dirname, '../../html/addAlt.html'));

    let altU = document.getElementById('altU');
    let altP = document.getElementById('altP');

    let alt = config.get('alts').sort((a, b) => a.username.toLowerCase() > b.username.toLowerCase() ? 1 : -1)[id];
    if(alt && alt.username) altU.value = alt.username;
    if(alt && alt.password) altP.value = window.atob(alt.password);

    function saveAlt() {
        let alts = config.get('alts');
        let user = altU.value;
        let pass = altP.value;
        let i = alts.findIndex(x => x.username.toLowerCase() === user.toLowerCase());
        if(i != -1) {
            alts[i].password = window.btoa(pass);
        } else {
            alts.push({
                username: user,
                password: window.btoa(pass)
            });
        }
        config.set('alts', alts);
        openAltManager();
    }

    document.getElementById('altSave').onclick = () => saveAlt();
    document.getElementById('altCancel').onclick = () => openAltManager();

    showPopupContainer();
}

function deleteAlt(id) {
    hidePopupContainer();
    let alts = config.get('alts').sort((a, b) => a.username.toLowerCase() > b.username.toLowerCase() ? 1 : -1);
    alts.splice(parseInt(id), 1);
    config.set('alts', alts);
    openAltManager();
}

function loginWithAlt(id) {
    hidePopupContainer();
    let alts = config.get('alts').sort((a, b) => a.username.toLowerCase() > b.username.toLowerCase() ? 1 : -1);
    let alt = alts[parseInt(id)];
    logoutAcc();
    showWindow(5);
    if(document.getElementById('windowHolder').style.display != 'block') document.getElementById('windowHolder').style.display = 'block';
    document.getElementById('accName').value = alt.username;
    document.getElementById('accPass').value = window.atob(alt.password);
    setTimeout(() => loginAcc(), 200);
}

function activitySender() {
    
    let i = setInterval(() => {
        if(typeof getGameActivity == 'undefined') return;
        clearInterval(i);

        function getActivity() {
            let activity = getGameActivity();
            if(activity.id) fetch('https://matchmaker.krunker.io/game-info?game=' + activity.id).then(r => r.json()).then(data => {
                activity.players = {
                    size: data[2],
                    max: data[3]
                };
                ipcRenderer.send('gameActivity', activity);
            });
        };
        
        setInterval(getActivity, 1000);
        getActivity();
    }, 100);
}

function injectExitBtn() {
    let btn = document.createElement('div');
    btn.classList.add('button', 'small', 'buttonPI');
    btn.textContent = 'Exit Game';
    btn.id = 'exitClient';
    btn.onmouseenter = () => playTick();
    btn.onclick = () => { ipcRenderer.send('exit'); };
    document.getElementById('subLogoButtons').appendChild(btn);
}

function loadAddons() {
    let addons = fs.readdirSync(path.join(__dirname, '../addons'));
    for(var filename of addons) {
        if(filename.endsWith('.js') && fs.statSync(path.join(__dirname, '../addons', filename)).isFile()) {
            try {
                require(path.join(__dirname, '../addons', filename));
            } catch(err) {
                alert('Couldn\'t load addon: ' + filename + '\nPlease report this bug to the developer.\n\n' + err.toString());
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    require(path.join(__dirname, '../util/settInject.js'))();
    activitySender();
    injectExitBtn();
    injectStyles();
    injectPopup();
    injectAltManager();
    loadAddons();
});
ipcRenderer.send('gameActivity', null); // Reset
require(path.join(__dirname, '../util/patcher.js'));