const path = require('path');
require(path.join(__dirname, 'common.js'));

window.GM_getValue = (key, defaultValue) => {
    return localStorage.getItem('GM_' + key) || defaultValue;
};

window.GM_setValue = (key, value) => {
    return localStorage.setItem('GM_' + key, value);
};

window.unsafeWindow = window;

// Load krunker editor plus
fetch('https://github.com/j4k0xb/Krunker-Editor-Plus/raw/master/userscript.user.js').then(res => res.text()).then(text => new Function(text)());