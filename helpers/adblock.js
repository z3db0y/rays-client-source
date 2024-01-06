const Store = require('electron-store');
const https = require('https');
const config = new Store();

const DEFAULT_ADBLOCK_URL = 'https://blocklistproject.github.io/Lists/ads.txt';

let adblockURL;
let cachedAdblock = [];

async function adblock(details) {
    if(!details.url.startsWith('http:') && !details.url.startsWith('https:')) return { cancel: false };
    let currentURL = config.get('adblockURL', DEFAULT_ADBLOCK_URL);
    if(adblockURL !== currentURL) {
        cachedAdblock = await new Promise(resolve => {
            https.get(currentURL, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data.split('\n').filter(x => x && x.startsWith('0.0.0.0 ')).map(x => x.split(' ')[1])));
            }).on('error', () => resolve([])).end();
        });
        console.log('Adblock list updated.', cachedAdblock);
        adblockURL = currentURL;
    }

    if(!cachedAdblock) return { cancel: false };
    if(cachedAdblock.includes(new URL(details.url).hostname)) return { cancel: true };
    return { cancel: false };
}

module.exports = adblock;