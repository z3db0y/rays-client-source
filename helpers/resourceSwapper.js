const fs = require('fs');
const path = require('path');

function resourceSwapper(dir, details) {
    let url = new URL(details.url);
    if(fs.existsSync(path.join(dir, url.pathname)) && url.pathname !== '/') return { redirectURL: `client-swapfile:/${url.pathname}` };
    return { cancel: false };
}

module.exports = resourceSwapper;