let { request } = require('https');
const path = require('path');
const config = new (require('electron-store'))();

module.exports = function (window) {
    if(!config.get('betterMatchmaker.enable', false)) return window.loadURL('https://krunker.io');

    let req = request('https://matchmaker.krunker.io/game-list?hostname=krunker.io', res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', async _ => {
            let games = JSON.parse(data);
            let defaultRegion = await window.webContents.executeJavaScript('localStorage.getItem("kro_setngss_defaultRegion")') || 'de-fra';
            let regions = config.get('betterMatchmaker.regions', []);
            if(regions.includes(0)) {
                regions = regions.filter(r => r !== 0);
                if(!regions.includes(defaultRegion)) regions.push(defaultRegion);
            }
            if(!games.games) return;
            games = games.games.filter(game => regions.includes(game[1])); // filter by region
            games = games.filter(game => game[2] >= config.get('betterMatchmaker.minPlayers', 0) && game[2] <= config.get('betterMatchmaker.maxPlayers', 4)); // filter by player count
            games = games.filter(game => game[4].c === (config.get('betterMatchmaker.allowCustoms', false) ? 1 : 0)); // filter custom games
            games = games.filter(game => game[4].oc === (config.get('betterMatchmaker.allowOfficialCustoms', false) ? 1 : undefined)); // filter official custom games
            games = games.filter(game => (config.get('betterMatchmaker.maps', []).length == 0) || (config.get('betterMatchmaker.maps', []).includes(game[4].i))); // filter by map
            games = games.filter(game => (config.get('betterMatchmaker.modes', []).length == 0) || (config.get('betterMatchmaker.modes', []).includes(game[4].g))); // filter by mode
            games = games.filter(game => game[5] >= (config.get('betterMatchmaker.minTime', 2) * 60)); // filter by time
            games = games.sort((a, b) => (b[2] - a[2]) || (b[5] - a[5])); // sort by players and time left
            console.log(games[0]);
            if(!games[0]) return window.loadURL('https://krunker.io');
            window.loadURL('https://krunker.io/?game=' + games[0][0]);
        });
        res.on('error', err => window.loadURL('https://krunker.io'));
    });
    req.on('error', _ => window.loadURL('https://krunker.io'));
    req.end();
}