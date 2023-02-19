module.exports = _ => {
    let config = {
        get: (k, d) => {
        let v = require('electron').ipcRenderer.sendSync('config.get', k);
        if (typeof v === 'undefined') return d;
        return v;
    },
        set: (k, v) => require('electron').ipcRenderer.sendSync('config.set', k, v)
    }
    if(!config.get('keystrokes.enable', false)) return;

    let keyNames = {
        16: 'Shift',
        38: '↑',
        40: '↓',
        37: '←',
        39: '→',
        17: 'Ctrl',
        18: 'Alt',
        9: 'Tab',
        20000: '↕'
    };

    let rgbC = 'crimson';
    function startRGBLoop() {
        let cols = ['crimson', 'orange', 'yellow', 'lime', 'mediumblue'];
        setInterval(() => {
            rgbC = cols[cols.indexOf(rgbC) + 1] || cols[0];

            let rgbCol = [...document.getElementsByClassName('rgbKey_col')];
            for(var i = 0; i < rgbCol.length; i++) rgbCol[i].style.color = rgbC;
            let rgbBg = [...document.getElementsByClassName('rgbKey_bg')];
            for(var i = 0; i < rgbBg.length; i++) rgbBg[i].style.background = rgbC;
        }, 200);
    }
    startRGBLoop();

    function getKeys() {
        return {
            forward: parseInt(localStorage.getItem('cont_0')) || 87,
            reload: parseInt(localStorage.getItem('cont_reloadKey')) || 82,
            left: parseInt(localStorage.getItem('cont_2')) || 65,
            back: parseInt(localStorage.getItem('cont_1')) || 83,
            right: parseInt(localStorage.getItem('cont_3')) || 68,
            jump: parseInt(localStorage.getItem('cont_jumpKey')) || 32,
            crouch: parseInt(localStorage.getItem('cont_crouchKey')) || 16,
            shoot: parseInt(localStorage.getItem('cont_shoot1Key')) || 10001,
            aim: parseInt(localStorage.getItem('cont_aim1Key')) || 10003
        };
    }

    function find(array, func) {
        for(var i = 0; i < array.length; i++) if(func(array[i])) return array[i];
    }

    document.addEventListener('keydown', event => {
        updateVisibility(find(Object.keys(getKeys()), x => getKeys()[x] == event.which), event.which, true);
    });

    document.addEventListener('keyup', event => {
        updateVisibility(find(Object.keys(getKeys()), x => getKeys()[x] == event.which), event.which, false);
    });

    function hookMouse() {
        if(!document.getElementsByTagName('canvas')[4]) return setTimeout(hookMouse, 100);
        document.getElementsByTagName('canvas')[4]?.addEventListener('mousedown', event => {
            updateVisibility(find(Object.keys(getKeys()), x => getKeys()[x] == event.button + 10001), event.button + 10001, true);
        });

        document.getElementsByTagName('canvas')[4]?.addEventListener('mouseup', event => {
            updateVisibility(find(Object.keys(getKeys()), x => getKeys()[x] == event.button + 10001), event.button + 10001, false);
        });

        document.getElementsByTagName('canvas')[4]?.addEventListener('wheel', event => {
            updateVisibility(find(Object.keys(getKeys()), x => getKeys()[x] == 20000), 20000, true);
            setTimeout(() => updateVisibility(find(Object.keys(getKeys()), x => getKeys()[x] == 20000), 20000, false), 100);
        });
    }
    hookMouse();

    let keyEls = {
        forward: document.createElement('div'),
        reload: document.createElement('div'),
        left: document.createElement('div'),
        back: document.createElement('div'),
        right: document.createElement('div'),
        shoot: document.createElement('div'),
        crouch: document.createElement('div'),
        aim: document.createElement('div'),
        jump: document.createElement('div')
    };

    let container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.width = '10vw';
    container.style.height = '10vw';
    container.style.fontSize = '0px';
    container.style.gridTemplateColumns = '25% 25% 25% 25%';
    container.style.gridTemplateRows = '25% 25% 25% 25%';
    container.style.display = config.get('keystrokes.enable') ? 'grid' : 'none';
    container.style.opacity = config.get('keystrokes.opacity', 0.5);
    container.style.transform = 'translate(-50%, -50%) scale(' + config.get('keystrokes.scale', 1) + ')';
    container.style.top = (config.get('keystrokes.offsetY') + 'vh') || '0';
    container.style.left = (config.get('keystrokes.offsetX') + 'vw') || '0';

    for(var keyEl in keyEls) {
        keyEls[keyEl].style.display = 'flex';
        keyEls[keyEl].style.justifyContent = 'center';
        keyEls[keyEl].style.alignItems = 'center';
        keyEls[keyEl].style.width = '100%';
        keyEls[keyEl].style.height = '100%';
        keyEls[keyEl].style.fontSize = '0.75vw';
        keyEls[keyEl].style.borderRadius = config.get('keystrokes.borderRadius', 8) + '%';
        keyEls[keyEl].style.transition = '.2s';
        keyEls[keyEl].style.color = config.get('keystrokes.color.normal', '#ffffff');
        keyEls[keyEl].style.background = config.get('keystrokes.bg.normal', '#000000');
        if(config.get('keystrokes.color.normal', '#ffffff') == 'rgb') keyEls[keyEl].classList.add('rgbKey_col');
        if(config.get('keystrokes.bg.normal', '#000000') == 'rgb') keyEls[keyEl].classList.add('rgbKey_bg');
        let keyCode = getKeys()[keyEl];
        keyEls[keyEl].textContent = (keyNames[keyCode] || (keyCode > 10000 ? 'M' + (keyCode - 10000) : String.fromCharCode(keyCode)));
    }

    keyEls.forward.style.gridArea = '1 / 2 / 1 / 2';
    keyEls.reload.style.gridArea = '1 / 4 / 1 / 4';
    keyEls.left.style.gridArea = '2 / 1 / 2 / 1';
    keyEls.back.style.gridArea = '2 / 2 / 2 / 2';
    keyEls.right.style.gridArea = '2 / 3 / 2 / 3';
    keyEls.shoot.style.gridArea = '2 / 4 / 2 / 4';
    keyEls.crouch.style.gridArea = '3 / 1 / 3 / 1';
    keyEls.jump.style.gridArea = '3 / 2 / 3 / 4';
    keyEls.aim.style.gridArea = '3 / 4 / 3 / 4';

    for(var keyEl in keyEls) container.appendChild(keyEls[keyEl]);
    document.getElementById('inGameUI').appendChild(container);

    function updateStyles() {
        container.style.opacity = config.get('keystrokes.opacity', 0.5);
        container.style.transform = 'translate(-50%, -50%) scale(' + config.get('keystrokes.scale', 1) + ')';
        container.style.top = (config.get('keystrokes.offsetY') + '%') || '0';
        container.style.left = (config.get('keystrokes.offsetX') + '%') || '0';
    }

    function updateVisibility(keyName, keyCode, isDown) {
        updateStyles();
        if(keyEls[keyName]) {
            let keyN = (keyNames[keyCode] || (keyCode > 10000 ? 'M' + (keyCode - 10000) : String.fromCharCode(keyCode)));
            keyEls[keyName].textContent != keyN ? keyEls[keyName].textContent = keyN : null;
            let color;
            let bg;
            if(isDown) {
                color = config.get('keystrokes.color.pressed', '#000000');
                bg = config.get('keystrokes.bg.pressed', '#ffffff');
            } else {
                color = config.get('keystrokes.color.normal', '#ffffff');
                bg = config.get('keystrokes.bg.normal', '#000000');
            }

            keyEls[keyName].style.color != color ? keyEls[keyName].style.color = color : null;
            keyEls[keyName].style.backgroundColor != bg ? keyEls[keyName].style.backgroundColor = bg : null;
            keyEls[keyName].style.borderRadius = config.get('keystrokes.borderRadius', 8) + '%';

            if(color == 'rgb') keyEls[keyName].classList.add('rgbKey_col');
            else keyEls[keyName].classList.remove('rgbKey_col');

            if(bg == 'rgb') keyEls[keyName].classList.add('rgbKey_bg');
            else keyEls[keyName].classList.remove('rgbKey_bg');
        }
    }
};