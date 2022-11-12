const { app, BrowserWindow, screen, protocol, session } = require('electron');
const fs = require('fs');
const path = require('path');
const properties = require(path.join(__dirname, '/properties.json'));
const Updater = require(path.join(__dirname, '/helpers/updater.js'));
const initializeConfig = require(path.join(__dirname, '/helpers/config.js'));
const loadSwapper = require(path.join(__dirname, '/helpers/resourceSwapper.js'));
const Store = require('electron-store');
const config = new Store();
const swapDir = path.normalize(`${app.getPath('documents')}/KrunkerResourceSwapper`);

const SPLASH_FILE = path.join(__dirname, '/html/splash.html');
const MAIN_FILE = path.join(__dirname, './helpers/main.js');

function createSplash() {
    let screenSize = screen.getPrimaryDisplay().workAreaSize;
    let windowSize = {
        width: Math.floor(Math.max(screenSize.width, screenSize.height)/4),
        height: Math.floor(Math.max(screenSize.width, screenSize.height)/4/16*9)
    }
    let splash = new BrowserWindow(Object.assign(properties.windowOpts, {
        width: windowSize.width,
        height: windowSize.height,
        frame: false,
        minimizable: false,
        title: '[RAYS] Client',
        icon: path.join(__dirname, '/assets/icon.png')
    }));
    splash.setMenu(null);
    splash.loadFile(SPLASH_FILE);
    return new Promise(resolve => {
        splash.once('ready-to-show', () => {
            splash.show();
            resolve(splash);
        });
    });
}

function destroySplash(win) {
    let allClosed = (ev) => { ev.preventDefault(); };
    app.on('window-all-closed', allClosed);
    win.close();
    app.off('window-all-closed', allClosed);
}

function setSplashTitle(win, title) {
    win.webContents.executeJavaScript(`setTitle("${title.replace(/"/g, '\"')}")`);
}

function launchKrunker() {
    require(MAIN_FILE);
}

async function init() {
    if(!app.requestSingleInstanceLock()) {
        app.quit();
    };

    protocol.registerFileProtocol('client-asset', function (request, callback) {
        callback(path.normalize(`${__dirname}/assets/${request.url.replace('client-asset://', '')}`));
    });
    protocol.registerFileProtocol('client-swapfile', function (request, callback) {
        callback(path.normalize(`${app.getPath('documents')}/KrunkerResourceSwapper/${request.url.replace('client-swapfile://', '')}`));
    });

    let splash = await createSplash();
    initializeConfig();
    let updater = new Updater();
    let updateAvail = false;
    if(config.get('update', true)) {
        setSplashTitle(splash, 'Checking for updates...');
        if(app.isPackaged) updateAvail = await updater.update();
    }
    if(updateAvail) {
        updater.on('progress', prog => { setSplashTitle(splash, 'Updating... ' + prog + '%') });
    } else {
        if(config.get('update', true)) setSplashTitle(splash, 'No update available.');
        setTimeout(() => {
            destroySplash(splash);
            if(config.get('resourceSwapper')) {
                if(!fs.existsSync(swapDir)) fs.mkdirSync(swapDir);
                loadSwapper(session, swapDir);
            }
            launchKrunker();
        }, 1000);
    }
    
};

app.whenReady().then(init);
if(config.get('uncapFrames')) {
    app.commandLine.appendSwitch('disable-frame-rate-limit');
    app.commandLine.appendSwitch('disable-gpu-vsync');
}
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,MediaSessionService');