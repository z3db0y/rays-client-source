const { app, BrowserWindow, shell, screen, ipcMain, dialog, globalShortcut } = require('electron');
const Store = require('electron-store');
const path = require('path');
const config = new Store();
const RPC = require(path.join(__dirname, '/rpc.js'));
const properties = require(path.join(__dirname, '../properties.json'));
const newGame = require(path.join(__dirname, '/util/newGame.js'));
let rpc = new RPC('977054900166987828');
let appName = "[RAYS] Client";

rpc.on('connect', () => {
    console.log(rpc.__client);
    updateActivity();
});
rpc.on('ACTIVITY_JOIN', ({ secret }) => {
    mainWindow.loadURL('https://krunker.io/?game=' + secret, { 'userAgent': USER_AGENT });
});

let gameActivity;
let idleTime = 0;

function updateActivity() {
    let win = BrowserWindow.getFocusedWindow();

    let winType = 0;
    let winURL;
    if(win) {
        winURL = new URL(win.webContents.getURL());

        if(winURL.pathname.startsWith('/editor.html')) {
            winType = 1;
        } else if(winURL.pathname.startsWith('/viewer.html')) {
            winType = 2;
        } else if(winURL.pathname.startsWith('/social.html')) {
            winType = 3;
        }
    }

    if(config.get('rpc', 'all') !== 'off') {
        if(!idleTime) idleTime = Date.now();
        switch(winType) {
            case 3:
                let state = 'Homepage';
                if(winURL.searchParams.has('p') && config.get('rpc', 'all') !== 'anon') {
                    switch(winURL.searchParams.get('p')) {
                        case 'itemsales': state = 'Checking the prices'; break;
                        case 'profile': state = 'Checking player stats'; break;
                        case 'clan': state = 'Looking at clans'; break;
                    }
                }
                rpc.setActivity({
                    details: 'Browsing the hub',
                    state,
                    largeImageKey: 'icon',
                    startTimestamp: idleTime
                });
                break;
            case 2:
                rpc.setActivity({
                    details: 'Viewing some skins',
                    largeImageKey: 'icon',
                    startTimestamp: idleTime
                });
                break;
            case 1:
                rpc.setActivity({
                    details: 'Making a map',
                    largeImageKey: 'icon',
                    startTimestamp: idleTime
                });
                break;
            case 0:
                if(!gameActivity) {
                    rpc.setActivity({
                        largeImageKey: 'icon',
                        startTimestamp: idleTime
                    });
                } else {
                    idleTime = 0;
                    let startTimestamp = new Date();
                    let endTimestamp = new Date(startTimestamp.getTime()+gameActivity.time*1000);
                    if(config.get('rpc', 'all') === 'all') {
                        rpc.setActivity({
                            details: gameActivity.mode + ' | ' + gameActivity.map,
                            state: gameActivity.custom ? 'In custom game' : 'In public game',
                            largeImageKey: 'icon',
                            // smallImageKey: 'https://assets.krunker.io/textures/classes/icon_' + gameActivity.class.index + '.png',
                            smallImageKey: 'class_' + gameActivity.class.index,
                            smallImageText: gameActivity.user,
                            startTimestamp,
                            endTimestamp,
                            partyId: 'party-' + gameActivity.id.split(':')[1],
                            joinSecret: gameActivity.id,
                            partySize: gameActivity.players.size,
                            partyMax: gameActivity.players.max
                        });
                    } else {
                        rpc.setActivity({
                            details: gameActivity.mode + ' | ' + gameActivity.map,
                            state: gameActivity.custom ? 'In custom game' : 'In public game',
                            largeImageKey: 'icon',
                            startTimestamp,
                            endTimestamp
                        });
                    }
                }
                break;
        }
    } else {
        rpc.clearActivity();
    }
}

app.on('browser-window-focus', _ => {
    updateActivity();
});

config.onDidChange('rpc', _ => {
    updateActivity();
});

ipcMain.on('gameActivity', (_, activity) => {
    gameActivity = activity;
    updateActivity();
});
ipcMain.on('exit', _ => app.quit());
ipcMain.on('alert', (ev, message) => {
    let win = BrowserWindow.getAllWindows().find(x => x.id === ev.sender.id);
    dialog.showMessageBoxSync(win, {
        message,
        title: appName,
        icon: path.join(__dirname, '../assets/icon.png')
    })
});

const USER_AGENT = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36`;

let primaryDisplay = screen.getPrimaryDisplay();
const mainWindow = new BrowserWindow(Object.assign(properties.windowOpts, {
    frame: true,
    width: primaryDisplay.workArea.width,
    height: primaryDisplay.workArea.height,
    webPreferences: {
        preload: path.join(__dirname, '/renderer/game.js'),
        contextIsolation: false,
        webSecurity: false,
        enableRemoteModule: true
    },
    minimizable: true,
    icon: path.join(__dirname, '../assets/icon.png'),
    title: appName
}));
mainWindow.setMenu(null);
mainWindow.loadURL('https://krunker.io', { 'userAgent': USER_AGENT });
mainWindow.on('page-title-updated', (ev) => ev.preventDefault());
mainWindow.once('ready-to-show', () => {
    mainWindow.show();
});

app.on('second-instance', () => mainWindow.focus());

function newWindowHandler(ev, url) {
    ev.preventDefault();
    let link = new URL(url);
    let domain = link.hostname.split('.').slice(link.hostname.split('.').length-2).join('.');
    if(domain === 'krunker.io') {
        if(link.pathname === '/') return mainWindow.loadURL(url, { userAgent: USER_AGENT });
        let win = new BrowserWindow(Object.assign(properties.windowOpts, {
            width: primaryDisplay.workArea.width/2,
            height: primaryDisplay.workArea.height/2,
            frame: true,
            webPreferences: {
                webSecurity: false,
                nodeIntegration: true,
                preload: link.pathname === '/social.html' ? path.join(__dirname, '/renderer/social.js') : null
            }
        }));
        win.setMenu(null);
        win.once('ready-to-show', () => win.show());
        win.webContents.on('new-window', newWindowHandler);
        win.webContents.on('will-prevent-unload', (ev) => ev.preventDefault());

        win.loadURL(url, { userAgent: USER_AGENT });
        win.webContents.on('will-navigate', (ev, url) => {
            url = new URL(url);
            if(!url.hostname.endsWith('krunker.io')) {
                ev.preventDefault();
                shell.openExternal(url.href);
            }
        });

        win.webContents.on('before-input-event', (_, i) => {
            if(i.key === 'F11') { _.preventDefault(); win.setFullScreen(!win.fullScreen); }
            if(i.key === 'F5') { _.preventDefault(); win.reload(); }
            if(i.key === 'F12' && !app.isPackaged) { _.preventDefault(); win.webContents.toggleDevTools(); }
        });
    } else {
        shell.openExternal(url);
    }
}

mainWindow.webContents.on('new-window', newWindowHandler);

mainWindow.webContents.on('before-input-event', (_, i) => {
    if(i.key === 'F11') { _.preventDefault(); mainWindow.setFullScreen(!mainWindow.fullScreen); }
    // if(i.key === 'F4') { mainWindow.loadURL('https://krunker.io', { 'userAgent': USER_AGENT }); }
    if(i.key === 'F4') { _.preventDefault(); newGame(mainWindow); }
    if(i.key === 'F5') { mainWindow.reload(); }
    if(i.key === 'F12' && !app.isPackaged) { _.preventDefault(); mainWindow.webContents.toggleDevTools() }
});

globalShortcut.register('Escape', () => {
    if(BrowserWindow.getFocusedWindow()) {
        BrowserWindow.getFocusedWindow().webContents.executeJavaScript('document.exitPointerLock()');
        BrowserWindow.getFocusedWindow().webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
        BrowserWindow.getFocusedWindow().webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
    }
});

mainWindow.webContents.on('will-navigate', (ev, url) => {
    url = new URL(url);
    if(!url.hostname.endsWith('krunker.io')) {
        ev.preventDefault();
        shell.openExternal(url.href);
    }
});

mainWindow.on('closed', () => app.quit());