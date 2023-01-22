const Store = require('electron-store');
const config = new Store();

function openAltManager() {
    window.playSelect?.call();
    let menuWindow = document.getElementById('menuWindow');

    menuWindow.innerHTML = '<div id="referralHeader">Alt Manager</div><div class="setBodH" id="alts"></div><div id="addAlt" class="button buttonP" style="width:calc(100% - 55px);padding:12px 16px;position:relative;left:50%;transform:translateX(-50%)" onmouseenter="playTick()">Add New</div>';

    let alts = document.getElementById('alts');
    let altList = config.get('alts', []).sort((a, b) => a.username.toLowerCase().localeCompare(b.username.toLowerCase()));
    for (let i = 0; i < altList.length; i++) {
        let alt = altList[i];
        let altDiv = document.createElement('div');
        altDiv.className = 'settName';
        
        let altName = document.createElement('span');
        altName.innerHTML = alt.username;
        altName.style.color = 'inherit';
        altName.style.cursor = 'pointer';
        altName.onclick = _ => {
            window.playSelect?.call();
            window.showWindow?.call(null, 5);
            window.logoutAcc?.call();
            document.getElementById('accName').value = alt.username;
            document.getElementById('accPass').value = window.atob(alt.password);
            setTimeout(() => window.loginAcc?.call(), 100);
        };
        altDiv.appendChild(altName);

        let buttonCont = document.createElement('div');
        buttonCont.style.display = 'inline';
        altDiv.appendChild(buttonCont);

        let loginButton = document.createElement('div');
        loginButton.className = 'settingsBtn';
        loginButton.innerHTML = 'Login';
        loginButton.style.backgroundColor = '#0a0';
        loginButton.setAttribute('onmouseenter', 'playTick()');
        loginButton.onclick = () => {
            window.playSelect?.call();
            window.showWindow?.call(null, 5);
            window.logoutAcc?.call();
            document.getElementById('accName').value = alt.username;
            document.getElementById('accPass').value = window.atob(alt.password);
            setTimeout(() => window.loginAcc?.call(), 100);
        };

        let editButton = document.createElement('div');
        editButton.className = 'settingsBtn';
        editButton.innerHTML = 'Edit';
        editButton.setAttribute('onmouseenter', 'playTick()');
        editButton.onclick = () => openAltEditor(i);

        let deleteButton = document.createElement('div');
        deleteButton.className = 'settingsBtn';
        deleteButton.innerHTML = 'Delete';
        deleteButton.style.backgroundColor = '#f00';
        deleteButton.setAttribute('onmouseenter', 'playTick()');
        deleteButton.onclick = () => {
            window.playSelect?.call();
            altList.splice(i, 1);
            config.set('alts', altList);
            openAltManager();
        };

        buttonCont.appendChild(deleteButton);
        buttonCont.appendChild(editButton);
        buttonCont.appendChild(loginButton);
        alts.appendChild(altDiv);
    }
    if(altList.length == 0) alts.innerHTML = '<div class="settName">You have no alts</div>';
    document.getElementById('addAlt').onclick = () => openAltEditor();

    let windowHolder = document.getElementById('windowHolder');
    windowHolder.style.display = 'block';
    windowHolder.classList = 'popupWin';
    menuWindow.style.width = '1000px';
    menuWindow.style.overflowY = 'auto';
    menuWindow.classList = 'dark';
}

function openAltEditor(id) {
    window.playSelect?.call();
    let menuWindow = document.getElementById('menuWindow');

    menuWindow.innerHTML = `<div id="referralHeader">${id !== undefined ? 'Edit' : 'Add'} Alt</div><input class="accountInput" id="altUsername" placeholder="Enter username"><input class="accountInput" id="altPassword" type="password" placeholder="Enter password"><div id="saveAlt" class="button buttonG" style="width:calc(100% - 55px);padding:12px 20px;position:relative;left:50%;transform:translateX(-50%);margin-top:20px" onmouseenter="playTick()">Save</div>`;
    
    let usernameInput = document.getElementById('altUsername');
    let passwordInput = document.getElementById('altPassword');

    if(id !== undefined) {
        let alt = config.get('alts', []).sort((a, b) => a.username.toLowerCase().localeCompare(b.username.toLowerCase()))[id];
        usernameInput.value = alt.username;
        passwordInput.value = window.atob(alt.password);
    }

    document.getElementById('saveAlt').onclick = () => {
        window.playSelect?.call();
        let altList = config.get('alts', []).sort((a, b) => a.username.toLowerCase().localeCompare(b.username.toLowerCase()));
        if(id !== undefined) {
            altList[id] = {
                username: usernameInput.value,
                password: window.btoa(passwordInput.value)
            };
        } else {
            passwordInput.value && usernameInput.value && altList.push({
                username: usernameInput.value,
                password: window.btoa(passwordInput.value)
            });
        }
        config.set('alts', altList);
        openAltManager();
    };

    let windowHolder = document.getElementById('windowHolder');
    windowHolder.style.display = 'block';
    windowHolder.classList = 'popupWin';
    menuWindow.style.width = '1000px';
    menuWindow.style.overflowY = 'auto';
    menuWindow.classList = 'dark';
}

// Inject alt manager button
let btn = document.createElement('div');
btn.innerHTML = 'Alt Manager';
btn.style.cssText = 'margin-left:2px;border-color:#0f0';
btn.className = 'button bigShadowT';
btn.id = 'customizeButton';
btn.onclick = openAltManager;
btn.setAttribute('onmouseenter', 'playTick()');
document.getElementById('menuClassContainer').appendChild(btn);

document.addEventListener('keydown', e => (e.key == config.get('controls.altmanager', 'Unbound')) && (document.exitPointerLock(), openAltManager()));