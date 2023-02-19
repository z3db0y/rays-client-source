const path = require('path');
const Store = require('electron-store');
const defaultConfig = require(path.join(__dirname, '../properties.json')).defaultSettings;
const config = new Store({ defaults: defaultConfig });
const { app } = require('electron');
let configCache = config.store;
if(!global._configInit) {
    if(!app) return;
    global._configInit = true;
    app.on('before-quit', () => {
        config.set(configCache);
    });
}

function getter(obj, k) {
    return k.split('.').reduce((o, i) => typeof o !== 'undefined' ? o[i] : undefined, obj);
}

function setter(obj, k, v) {
    k.split('.').reduce((o, i, idx, arr) => {
        if(idx == arr.length - 1) o[i] = v;
        else return o[i];
    }, obj);
}

module.exports = {
    get: (k, d) => {
        let v = getter(configCache, k);
        if (typeof v === 'undefined') return d;
        return v;
    },
    set: (k, v) => {
        setter(configCache, k, v);
    }
}

require('fs').watchFile(config.path, _ => {
    configCache = config.store;
});