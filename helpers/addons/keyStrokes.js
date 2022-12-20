let config = new (require('electron-store'))();

let keyNames = {
    16: 'Shift',
    38: '↑',
    40: '↓',
    37: '←',
    39: '→',
    17: 'Ctrl',
    18: 'Alt',
    9: 'Tab'
};

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

document.addEventListener('keydown', event => {
    updateVisibility(Object.keys(getKeys()).find(x => getKeys()[x] == event.which), event.which, true);
});

document.addEventListener('keyup', event => {
    updateVisibility(Object.keys(getKeys()).find(x => getKeys()[x] == event.which), event.which, false);
});

let hookedMouse = false;
let ac = Node.prototype.appendChild;
Node.prototype.appendChild = function(child) {
    if(!document.getElementsByTagName('canvas')[4] || hookedMouse) return ac.apply(this, [child]);
    hookedMouse = true;

    document.getElementsByTagName('canvas')[4]?.addEventListener('mousedown', event => {
    updateVisibility(Object.keys(getKeys()).find(x => getKeys()[x] == event.button + 10001), event.button + 10001, true);
});

    document.getElementsByTagName('canvas')[4]?.addEventListener('mouseup', event => {
    updateVisibility(Object.keys(getKeys()).find(x => getKeys()[x] == event.button + 10001), event.button + 10001, false);
});

    return ac.apply(this, [child]);
}

let keyEls = {
    forward: document.createElement('div'),
    reload: document.createElement('div'),
    left: document.createElement('div'),
    back: document.createElement('div'),
    right: document.createElement('div'),
    shoot: document.createElement('div'),
    crouch: document.createElement('div'),
    jump: document.createElement('div'),
    aim: document.createElement('div')
};

let container = document.createElement('div');
container.style.position = 'absolute';
container.style.top = config.get('keystrokes.offsetY') || '0';
container.style.left = config.get('keystrokes.offsetX') || '0';
container.style.width = '10vw';
container.style.height = '10vw';
container.style.fontSize = '0px';
container.style.transform = 'translate(-50%, -50%) scale(' + config.get('keystrokes.scale', 1) + ')';
container.style.gridTemplateColumns = '25% 25% 25% 25%';
container.style.gridTemplateRows = '25% 25% 25% 25%';
container.style.display = config.get('keystrokes.enable') ? 'grid' : 'none';
container.style.opacity = config.get('keystrokes.opacity', 0.5);

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
    let keyCode = getKeys()[keyEl];
    keyEls[keyEl].textContent = keyCode > 10000 ? 'M' + (keyCode - 10000) : (keyNames[keyCode] || String.fromCharCode(keyCode));
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
        let keyN = keyCode > 10000 ? 'M' + (keyCode - 10000) : (keyNames[keyCode] || String.fromCharCode(keyCode));
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
    }
}