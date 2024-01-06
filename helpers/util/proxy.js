const Store = require('electron-store');
const { session } = require('electron');
const config = new Store();

module.exports = () => {
    let proxy = config.get('proxy', {});
    if(!proxy.enabled) {
        session.defaultSession.setProxy({ proxyRules: '' });
        return;
    }

    if(proxy.protocol && proxy.host && proxy.port && !isNaN(parseInt(proxy.port))) session.defaultSession.setProxy({ proxyRules: `${proxy.protocol}://${proxy.host}:${proxy.port}` });
    else session.defaultSession.setProxy({ proxyRules: '' });
};