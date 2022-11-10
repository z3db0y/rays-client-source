const path = require('path');
const Store = require('electron-store');
const config = new Store();
const defaultConfig = require(path.join(__dirname, '../properties.json')).defaultSettings;
module.exports = function () {
    // Fix invalid settings and initialize on first start.
    for(var key in defaultConfig) {
        if(!config.has(key) || typeof config.get(key) !== typeof defaultConfig[key]) {
            config.set(key, defaultConfig[key]);
        }
    }
}