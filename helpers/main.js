const { BrowserWindow, screen, app, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const properties = require(path.join(__dirname, '../properties.json'));
const loadProxy = require(path.join(__dirname, '/util/proxy.js'));
const windowOpts = properties.windowOpts;
const config = new (require('electron-store'))({ defaults: properties.defaultSettings });

const RPC = require('discord-rpc-revamp');
const newGame = require(path.join(__dirname, '/util/newGame.js'));
const krunkerws = new (require(path.join(__dirname, './stats.js')))();
const Client = require(path.join(__dirname, './sock.js'));

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36';

let controls  = Object.assign({
    fullscreen: 'F11',
    reload: 'F5',
    newgame: 'F6',
    lastlobby: 'F4',
    devtools: 'F12'
}, config.get('controls', {}));

let mainWindow = new BrowserWindow(Object.assign({}, windowOpts, {
    width: config.get('window.width', screen.getPrimaryDisplay().workAreaSize.width),
    height: config.get('window.height', screen.getPrimaryDisplay().workAreaSize.height),
    minWidth: 800,
    minHeight: 600,
    fullscreen: config.get('window.fullscreen', false),
    simpleFullscreen: true,
    x: config.get('window.x', 0),
    y: config.get('window.y', 0),
    title: '[RAYS] Client',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
        webSecurity: false,
        preload: path.join(__dirname, '/renderer/game.js'),
        enableRemoteModule: true
    }
}));
mainWindow.setMenu(null);
console.log('Main window created. Size: ' + mainWindow.getSize()[0] + 'x' + mainWindow.getSize()[1] + ' Position: ' + mainWindow.getPosition()[0] + 'x' + mainWindow.getPosition()[1]);

if(config.get('window.maximized', false)) mainWindow.maximize();
mainWindow.loadURL('https://krunker.io', { 'userAgent': USER_AGENT });
mainWindow.on('page-title-updated', (ev) => ev.preventDefault());
mainWindow.webContents.on('did-start-loading', () => loadProxy());
mainWindow.webContents.on('did-fail-load', (ev, ec, edesc, url, isMainFrame) => isMainFrame && mainWindow.loadFile(path.join(__dirname, '/../html/disconnected.html')));
mainWindow.once('ready-to-show', () => {
    mainWindow.show();
});

mainWindow.on('close', () => {
    config.set('window.width', mainWindow.getSize()[0]);
    config.set('window.height', mainWindow.getSize()[1]);
    config.set('window.x', mainWindow.getPosition()[0]);
    config.set('window.y', mainWindow.getPosition()[1]);
    config.set('window.fullscreen', mainWindow.isFullScreen());
    config.set('window.maximized', mainWindow.isMaximized());
    app.quit();
});

mainWindow.webContents.on('before-input-event', (ev, input) => {
    if(input.control || input.alt || input.meta) return;
    if(input.type !== 'keyDown') return;

    if(input.key === controls.fullscreen) (ev.preventDefault(), mainWindow.setFullScreen(!mainWindow.isFullScreen()));
    if(input.key === controls.reload) (ev.preventDefault(), mainWindow.reload());
    if(input.key === controls.newgame) (ev.preventDefault(), newGame(mainWindow));
    if(input.key === controls.lastlobby) (ev.preventDefault(), mainWindow.webContents.goBack());
    if(input.key === controls.devtools && !app.isPackaged) (ev.preventDefault(), mainWindow.webContents.openDevTools());
});

ipcMain.on('log_info', (ev, ...args) => console.log('\x1b[35m[RENDERER]\x1b[0m', ...args));
ipcMain.on('log_warn', (ev, ...args) => console.warn('\x1b[35m[RENDERER]\x1b[0m', ...args));
ipcMain.on('log_error', (ev, ...args) => console.error('\x1b[35m[RENDERER]\x1b[0m', ...args));
ipcMain.on('log_debug', (ev, ...args) => console.debug('\x1b[35m[RENDERER]\x1b[0m', ...args));
ipcMain.on('alert', (ev, ...args) => dialog.showMessageBox(mainWindow, { type: 'info', buttons: ['OK'], message: args.join(' '), title: mainWindow.getTitle() }));
ipcMain.on('confirm', (ev, ...args) => ev.returnValue = !dialog.showMessageBoxSync(mainWindow, { type: 'question', buttons: ['Yes', 'No'], message: args.join(' '), title: mainWindow.getTitle() }, (res) => ev.returnValue = res === 0));

ipcMain.on('krunkerws.getPlayer', (ev, id) => krunkerws.getPlayer(id).then((res) => ev.returnValue = res).catch((err) => ev.returnValue = err));
ipcMain.on('krunkerws.getSkin', (ev, id) => krunkerws.getSkin(id).then((res) => ev.returnValue = res).catch((err) => ev.returnValue = err));
ipcMain.on('krunkerws.getPlayerAsync', (ev, id) => krunkerws.getPlayer(id).then((res) => ev.sender.send('krunkerws.getPlayerAsync', id, res)).catch((err) => ev.sender.send('krunkerws.getPlayerAsync', id, err)));
ipcMain.on('krunkerws.getSkinAsync', (ev, id) => krunkerws.getSkin(id).then((res) => ev.sender.send('krunkerws.getSkinAsync', id, res)).catch((err) => ev.sender.send('krunkerws.getSkinAsync', id, err)));

function getURLType(url) {
    url = new URL(url);
    if(url.hostname === 'krunker.io') {
        if(url.pathname === '/editor.html') return 'editor';
        if(url.pathname === '/social.html') return 'social';
        if(url.pathname === '/viewer.html') return 'viewer';
        if(url.pathname === '/') return 'game';
    }
    return 'external';
}

function onNewWindow(ev, url) {
    ev.preventDefault();
    if(getURLType(url) === 'external') require('electron').shell.openExternal(url);
    else if(getURLType(url) === 'game') mainWindow.loadURL(url, { 'userAgent': USER_AGENT });
    else {
        let win = new BrowserWindow(Object.assign({}, windowOpts, {
            width: Math.round(screen.getPrimaryDisplay().workAreaSize.width/2),
            height: Math.round(screen.getPrimaryDisplay().workAreaSize.height/2),
            minWidth: 800,
            minHeight: 600,
            fullscreen: false,
            title: '[RAYS] Client',
            icon: path.join(__dirname, '../assets/icon.png'),
            webPreferences: {
                preload: fs.existsSync(path.join(__dirname, '/renderer/' + getURLType(url) + '.js')) ? path.join(__dirname, '/renderer/' + getURLType(url) + '.js') : null
            }
        }));
        win.setMenu(null);
        win.loadURL(url, { 'userAgent': USER_AGENT });
        win.on('page-title-updated', (ev, title) => (ev.preventDefault(), win.setTitle('[RAYS] Client - ' + title)));
        win.once('ready-to-show', () => win.show());
        win.webContents.on('new-window', onNewWindow);
        win.webContents.on('will-navigate', onNewWindow);
        win.webContents.on('before-input-event', (ev, input) => {
            if(input.control || input.alt || input.meta) return;
            if(input.type !== 'keyDown') return;

            if(input.key === controls.fullscreen) (ev.preventDefault(), win.setFullScreen(!win.isFullScreen()));
            if(input.key === controls.reload) (ev.preventDefault(), win.reload());
            if(input.key === controls.devtools && !app.isPackaged) (ev.preventDefault(), win.webContents.openDevTools());
        });
        win.webContents.on('will-prevent-unload', (ev) => ev.preventDefault());
    }
}

mainWindow.webContents.on('new-window', onNewWindow);
mainWindow.webContents.on('will-navigate', onNewWindow);
mainWindow.webContents.on('will-prevent-unload', (ev) => ev.preventDefault());

let rpc = new RPC.Client({ transport: 'ipc' });

function rpcLogin() {
    rpc.connect({ clientId: '977054900166987828' }).catch(_ => (console.error('RPC: ' + _.message), setTimeout(rpcLogin, 10000)));
}
rpcLogin();

let lastDisplayName;
let lastUsername;
let lastCardUrl;
const client = new Client();

rpc.on('close', () => setTimeout(rpcLogin, 10000));

rpc.on('ready', () => {
    rpc.subscribe('ACTIVITY_JOIN');
    console.log('RPC: ready');
    if(lastDisplayName) client.updateDisplayName(rpc.user.id, lastDisplayName, lastUsername, lastCardUrl);

    let self = client.list.find(c => c.uname == lastUsername);
    if(self) mainWindow.webContents.send('getSelf', self);
});

rpc.on('ACTIVITY_JOIN', ({ secret }) => mainWindow.loadURL('https://krunker.io/?game=' + secret, { 'userAgent': USER_AGENT }));
ipcMain.on('rpc', (ev, activity) => {
    if(!rpc.user) return;
    if(config.get('rpc.type', 'all') === 'off') return rpc.clearActivity().catch(_ => console.error('RPC: ' + _.message));
    let focusedWindow = BrowserWindow.getFocusedWindow();
    let focusedWindowType = focusedWindow ? getURLType(focusedWindow.webContents.getURL()) : 'game';
    let idleTimer = 0;
    switch(focusedWindowType) {
        case 'game':
            idleTimer = 0;
            let startTimestamp = Date.now();
            let endTimestamp = new Date(startTimestamp + 1000 * activity.time);
            rpc.setActivity({
                details: activity.mode + ' - ' + activity.map,
                state: (activity.comp ? 'Competitive' : (activity.custom ? 'Custom' : 'Public')) + ' Game',
                smallImageKey: config.get('rpc.type', 'all') == 'all' ? ('https://assets.krunker.io/textures/classes/icon_' + activity.class.index + '.png') : null,
                smallImageText: config.get('rpc.type', 'all') == 'all' ? activity.user : null,
                largeImageKey: 'icon',
                largeImageText: 'RAYS Client v' + app.getVersion(),
                startTimestamp: endTimestamp.getTime(),
                endTimestamp: endTimestamp.getTime(),
                partyId: 'party-' + (activity.id && activity.id.split(':')[1]),
                partySize: activity.players.size,
                partyMax: activity.players.max,
                joinSecret: config.get('rpc.type', 'all') == 'all' ? activity.id : null,
                buttons: config.get('rpc.type', 'all') == 'all' ? null : (config.get('rpc.buttons', []).length ? config.get('rpc.buttons', []) : null)
            }).catch(_ => console.error('RPC: ' + _.message));
            break;
        case 'editor':
            (idleTimer == 0) && (idleTimer = Date.now());
            rpc.setActivity({
                details: 'Creating a Map',
                largeImageKey: 'icon',
                largeImageText: 'RAYS Client v' + app.getVersion(),
                startTimestamp: idleTimer
            }).catch(_ => console.error('RPC: ' + _.message));
            break;
        case 'social':
            (idleTimer == 0) && (idleTimer = Date.now());
            rpc.setActivity({
                details: 'Browsing the Hub',
                largeImageKey: 'icon',
                largeImageText: 'RAYS Client v' + app.getVersion(),
                startTimestamp: idleTimer
            }).catch(_ => console.error('RPC: ' + _.message));
            break;
        case 'viewer':
            (idleTimer == 0) && (idleTimer = Date.now());
            rpc.setActivity({
                details: 'Viewing Skins',
                largeImageKey: 'icon',
                largeImageText: 'RAYS Client v' + app.getVersion(),
                startTimestamp: idleTimer
            }).catch(_ => console.error('RPC: ' + _.message));
            break;
    }
});

ipcMain.on('updateDisplayName', (ev, name, name2) => {
    let cardT = config.get('deathCard', [-1, -1])[0];
    let cardI = config.get('deathCard', [-1, -1])[1];
    let card = cardT == -1 ? {} : cardT == 1 ? config.get('customDeathCards', [])[cardI] : client.deathCards[cardI];
    let cardUrl = card ? card.url : null;

    if(lastDisplayName == name && lastCardUrl == cardUrl && client.initSent) return;
    console.log('set display name');
    lastDisplayName = name;
    lastUsername = name2;
    lastCardUrl = cardUrl;
    client.updateDisplayName(rpc.user ? rpc.user.id : null, name, name2, cardUrl);
});
let getBadges = (ev) => {
    if(!client.list || !client.list.length) return setTimeout(() => getBadges(ev), 1000);
    ev.sender.send('getBadges', client.list);
};
ipcMain.on('getBadges', getBadges);

let getSelf = (ev) => {
    if(!client.initSent) return setTimeout(() => getSelf(ev), 1000);
    let self = client.list.find(x => x.uname == lastUsername);
    if(self) ev.sender.send('getSelf', self);
};
ipcMain.on('getSelf', getSelf);

let getClans = (ev) => {
    if(!client.initSent) return setTimeout(() => getClans(ev), 1000);
    ev.sender.send('getClans', client.clans);
};
ipcMain.on('getClans', getClans);

let getDeathCards = (ev) => {
    if(!client.deathCards) return setTimeout(() => getDeathCards(ev), 1000);
    ev.sender.send('getDeathCards', client.deathCards);
};
ipcMain.on('getDeathCards', getDeathCards);

let updateUser = _ => {
    let self = client.list.find(x => x.uname == lastUsername);
    if(self) mainWindow.webContents.send('getSelf', self);
    mainWindow.webContents.send('getBadges', client.list);
};
client.on('userUpdate', updateUser);

ipcMain.on('config.onDidAnyChange', ev => (ev.sender.send('config.onDidAnyChange'), controls = Object.assign({
    fullscreen: 'F11',
    reload: 'F5',
    newgame: 'F6',
    lastlobby: 'F4',
    devtools: 'F12'
}, config.get('controls', {}))));

// Addons
fs.readdirSync(path.join(__dirname, 'addons')).forEach(addon => {
    if(!addon.endsWith('.js')) return;
    require(path.join(__dirname, 'addons', addon));
});

process.on('uncaughtException', (err) => {
    console.error(err);
});

process.on('unhandledRejection', (err) => {
    console.error(err);
});