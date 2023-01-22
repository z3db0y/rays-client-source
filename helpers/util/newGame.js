let { request } = require('https');
const Store = require('electron-store');
let config = new Store();

module.exports = function (window) {
    if(!config.get('betterMatchmaker.enable', false)) return window.loadURL('https://krunker.io');

    let req = request('https://matchmaker.krunker.io/game-list?hostname=krunker.io', res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', async _ => {
            let games = JSON.parse(data);
            let region = await window.webContents.executeJavaScript('localStorage.getItem("kro_setngss_defaultRegion")') || 'de-fra';
            if(!games.games) return;
            games = games.games.filter(game => game[1] === region); // filter by region
            games = games.filter(game => game[2] >= config.get('betterMatchmaker.minPlayers', 0) && game[2] <= config.get('betterMatchmaker.maxPlayers', 4)); // filter by player count
            games = games.filter(game => game[4].c === (config.get('betterMatchmaker.allowCustoms', false) ? 1 : 0)); // filter custom games
            games = games.filter(game => game[4].oc === (config.get('betterMatchmaker.allowOfficialCustoms', false) ? 1 : undefined)); // filter official custom games
            games = games.filter(game => (config.get('betterMatchmaker.map', '') === '') || (game[4].i === config.get('betterMatchmaker.map', ''))); // filter by map
            games = games.filter(game => (config.get('betterMatchmaker.mode', -1) === -1) || (game[4].g === config.get('betterMatchmaker.mode', -1))); // filter by mode
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