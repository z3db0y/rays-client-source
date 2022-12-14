let keysdown = [];
let config = new (require('electron-store'))();

document.addEventListener('keydown', event => {
    if(!keysdown.find(x => x === event.which)) keysdown.push(event.which);
});

document.addEventListener('keyup', event => {
    keysdown = keysdown.filter(key => key !== event.which);
});

let hookedMouse = false;
let ac = Node.prototype.appendChild;
Node.prototype.appendChild = function(child) {
    if(!document.getElementsByTagName('canvas')[4] || hookedMouse) return ac.apply(this, [child]);
    hookedMouse = true;

    document.getElementsByTagName('canvas')[4]?.addEventListener('mousedown', event => {
        window.log(event);
        if(!keysdown.find(x => x === event.button + 10001)) keysdown.push(event.button + 10001);
    });

    document.getElementsByTagName('canvas')[4]?.addEventListener('mouseup', event => {
        window.log(event);
        keysdown = keysdown.filter(key => key !== event.button + 10001);
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
// container.style.scale = config.get('keystrokes.scale', 1);

for(var keyEl in keyEls) {
    keyEls[keyEl].style.display = 'flex';
    keyEls[keyEl].style.justifyContent = 'center';
    keyEls[keyEl].style.alignItems = 'center';
    keyEls[keyEl].style.width = '100%';
    keyEls[keyEl].style.height = '100%';
    keyEls[keyEl].style.fontSize = '0.75vw';
    keyEls[keyEl].style.borderRadius = config.get('keystrokes.borderRadius', 8) + '%';
    keyEls[keyEl].style.transition = '.2s';
    keyEls[keyEl].style.animationPlayState = 'paused, paused';
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

let cols = ['crimson', 'orange', 'yellow', 'lime', 'mediumblue'];
let col = cols[0];
function nextColor(col) {
    return cols[cols.indexOf(col) + 1 % cols.length] || cols[0];
}

function updatekeystrokes() {
    container.style.top = (config.get('keystrokes.offsetY') || '0') + '%';
    container.style.left = (config.get('keystrokes.offsetX') || '0') + '%';
    container.style.display = config.get('keystrokes.enable', false) ? 'grid' : 'none';
    container.style.opacity = config.get('keystrokes.opacity', 0.5);
    container.style.transform = 'translate(-50%, -50%) scale(' + config.get('keystrokes.scale', 1) + ')';

    let keys = {
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

    for(let key in keyEls) updateVisibility(key, keys[key]);
    col = nextColor(col);
}
updateVisibility();

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

function updateVisibility(keyName, keyCode) {
    let key = keysdown.find(x => x === keyCode);
    if(keyEls[keyName]) {
        keyEls[keyName].textContent = keyCode > 10000 ? 'M' + (keyCode - 10000) : (keyNames[keyCode] || String.fromCharCode(keyCode));
        let color;
        let bg;
        if(key) {
            color = config.get('keystrokes.color.pressed', '#000000');
            bg = config.get('keystrokes.bg.pressed', '#ffffff');
        } else {
            color = config.get('keystrokes.color.normal', '#ffffff');
            bg = config.get('keystrokes.bg.normal', '#000000');
        }

        if(color !== 'rgb') keyEls[keyName].style.animationPlayState = 'paused';
        else keyEls[keyName].style.animationPlayState = 'running';

        if(bg !== 'rgb') keyEls[keyName].style.animationPlayState = 'paused';
        else keyEls[keyName].style.animationPlayState = 'running';

        keyEls[keyName].style.color = (color === 'rgb' ? col : color);
        keyEls[keyName].style.borderRadius = config.get('keystrokes.borderRadius', 8) + '%';
        keyEls[keyName].style.backgroundColor = (bg === 'rgb' ? col : bg);
    }
}

setInterval(() => updatekeystrokes(), 100);