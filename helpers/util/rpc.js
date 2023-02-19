const path = require('path');
const config = new (require('electron-store'))();

window.rpcButtonEditor = () => {
    let menuWindow = document.getElementById('menuWindow');

    menuWindow.innerHTML = `<div id="referralHeader">Custom RPC Buttons</div><div id="rpcButtons" class="setBodH"></div><div id="addRPCBtn" class="button buttonP" style="width:calc(100% - 55px);padding:12px 16px;position:relative;left:50%;transform:translateX(-50%)" onmouseenter="playTick()">Add New</div>`;

    let rpcButtons = document.getElementById('rpcButtons');
    let buttonList = config.get('rpc.buttons', []);
    for (let i = 0; i < buttonList.length; i++) {
        let btn = buttonList[i];
        let btnDiv = document.createElement('div');
        btnDiv.className = 'settName';
        btnDiv.innerHTML = btn.label;

        let buttonCont = document.createElement('div');
        buttonCont.style.display = 'inline';
        btnDiv.appendChild(buttonCont);

        let editButton = document.createElement('div');
        editButton.className = 'settingsBtn';
        editButton.innerHTML = 'Edit';
        editButton.setAttribute('onmouseenter', 'playTick()');
        editButton.onclick = () => buttonEditor(i);

        let deleteButton = document.createElement('div');
        deleteButton.className = 'settingsBtn';
        deleteButton.innerHTML = 'Delete';
        deleteButton.style.backgroundColor = '#f00';
        deleteButton.setAttribute('onmouseenter', 'playTick()');
        deleteButton.onclick = () => {
            window.playSelect?.call();
            buttonList.splice(i, 1);
            config.set('rpc.buttons', buttonList);
            window.rpcButtonEditor();
        }

        buttonCont.appendChild(deleteButton);
        buttonCont.appendChild(editButton);
        rpcButtons.appendChild(btnDiv);
    }
    if(buttonList.length == 0) rpcButtons.innerHTML = '<div class="settName">You have no custom RPC buttons</div>';

    let addRPCBtn = document.getElementById('addRPCBtn');
    if(buttonList.length >= 2) addRPCBtn.style.display = 'none';
    else addRPCBtn.onclick = () => buttonEditor();

    let windowHolder = document.getElementById('windowHolder');
    windowHolder.style.display = 'block';
    windowHolder.classList = 'popupWin';
    menuWindow.style.width = '1000px';
    menuWindow.style.overflowY = 'auto';
    menuWindow.classList = 'dark';
}

function buttonEditor(i) {
    let menuWindow = document.getElementById('menuWindow');

    menuWindow.innerHTML = `<div id="referralHeader">${i !== undefined ? 'Edit' : 'Add'} RPC Button</div><input class="accountInput" id="rpcBtnLabel" placeholder="Enter label"><input class="accountInput" id="rpcBtnURL" placeholder="Enter URL"><div id="saveRPCButton" class="button buttonG" style="width:calc(100% - 55px);padding:12px 20px;position:relative;left:50%;transform:translateX(-50%);margin-top:20px" onmouseenter="playTick()">Save</div>`;

    let label = document.getElementById('rpcBtnLabel');
    let url = document.getElementById('rpcBtnURL');

    if(i !== undefined) {
        var buttonList = config.get('rpc.buttons', []);
        label.value = buttonList[i].label;
        url.value = buttonList[i].url;
    }

    let saveRPCButton = document.getElementById('saveRPCButton');
    saveRPCButton.onclick = () => {
        window.playSelect?.call();
        var buttonList = config.get('rpc.buttons', []);
        if(label.value.length == 0 || url.value.length == 0) return window.rpcButtonEditor();

        if(i !== undefined) {
            buttonList[i] = {
                label: label.value,
                url: url.value
            };
        } else {
            buttonList.push({
                label: label.value,
                url: url.value
            });
        }
        config.set('rpc.buttons', buttonList);
        window.rpcButtonEditor();
    };
}