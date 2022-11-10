const fs = require('fs');
const path = require('path');
/**
 * 
 * @param {session} s 
 */
function loadSwapper(s, dir) {
    s.defaultSession.webRequest.onBeforeRequest({ urls: [ '*:\/\/*.krunker.io/*' ] }, (details, callback) => {
        let url = new URL(details.url);
        if(fs.existsSync(path.join(dir, url.pathname)) && url.pathname !== '/') return callback({ redirectURL: `client-swapfile:/${url.pathname}` });
        callback({ cancel: false });
    });
}

module.exports = loadSwapper;