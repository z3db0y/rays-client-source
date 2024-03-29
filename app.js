const { app, BrowserWindow, screen, protocol, session } = require('electron');
const fs = require('fs');
const path = require('path');
const properties = require(path.join(__dirname, '/properties.json'));
const Updater = require(path.join(__dirname, '/helpers/updater.js'));
const config = new (require('electron-store'))({ defaults: properties.defaultSettings });
const swapper = require(path.join(__dirname, '/helpers/resourceSwapper.js'));
const adblock = require(path.join(__dirname, '/helpers/adblock.js'));
const swapDir = path.normalize(`${app.getPath('documents')}/KrunkerResourceSwapper`);

const SPLASH_FILE = path.join(__dirname, '/html/splash.html');
const MAIN_FILE = path.join(__dirname, './helpers/main.js');

let oLog = console.log;
console.log = (...args) => oLog.apply(console, ['\x1b[32m[INFO]\x1b[0m', ...args]);
console.warn = (...args) => oLog.apply(console, ['\x1b[33m[WARN]\x1b[0m', ...args]);
console.error = (...args) => oLog.apply(console, ['\x1b[31m[ERROR]\x1b[0m', ...args]);
console.debug = (...args) => oLog.apply(console, ['\x1b[36m[DEBUG]\x1b[0m', ...args]);

function createSplash() {
    let screenSize = screen.getPrimaryDisplay().workAreaSize;
    let windowSize = {
        width: Math.floor(Math.max(screenSize.width, screenSize.height)/4),
        height: Math.floor(Math.max(screenSize.width, screenSize.height)/4/16*9)
    }
    console.log('Creating splash screen... Size: ' + windowSize.width + 'x' + windowSize.height);
    let splash = new BrowserWindow(Object.assign({}, properties.windowOpts, {
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
    console.log('Destroying splash screen...');
    let allClosed = (ev) => { ev.preventDefault(); };
    app.on('window-all-closed', allClosed);
    win.close();
    app.off('window-all-closed', allClosed);
    
    app.on('window-all-closed', app.quit);
    // Ensure process exits when supposed to
    app.on('before-quit', () => {
        mainWindow.removeAllListeners('close');
        mainWindow.close();
    });

    console.log('Splash screen destroyed.');
}

function setSplashTitle(win, title) {
    win.webContents.executeJavaScript(`setTitle("${title.replace(/"/g, '\"')}")`);
    console.debug('Set splash title to: ' + title);
}

function launchKrunker() {
    console.log('Launching Krunker...');
    require(MAIN_FILE);
}

async function init() {
    console.log('Initializing...');
    if(!app.requestSingleInstanceLock()) {
        console.error('Another instance of the client is already running!');
        app.quit();
    };
    console.log('Single instance lock acquired.');

    protocol.registerFileProtocol('client-asset', function (request, callback) {
        callback(path.normalize(`${__dirname}/assets/${request.url.replace('client-asset://', '')}`));
    });
    protocol.registerFileProtocol('client-swapfile', function (request, callback) {
        callback(path.normalize(`${app.getPath('documents')}/KrunkerResourceSwapper/${request.url.replace('client-swapfile://', '')}`));
    });
    console.log('Registered protocols. (client-asset, client-swapfile)');

    let splash = await createSplash();
    let updater = new Updater();
    let updateAvail = false;
    if(config.get('update', true)) {
        setSplashTitle(splash, 'Checking for updates...');
        if(app.isPackaged) updateAvail = await updater.update();
        else console.debug('Running in dev mode, skipping update check.');
    }
    console.log('Update check complete. (updateAvail: ' + JSON.stringify(updateAvail) + ' )');
    if(updateAvail) {
        setSplashTitle(splash, 'Update found! (v' + updateAvail.version + ')');
        updater.on('progress', prog => { setSplashTitle(splash, 'Updating... ' + prog + '%') });
    } else {
        if(config.get('update', true)) setSplashTitle(splash, 'No update available.');
        console.debug('No update available.');
        setTimeout(() => {
            destroySplash(splash);

            session.defaultSession.webRequest.onBeforeRequest(async (details, callback) => {
                if(config.get('resourceSwapper', false)) {
                    let swapperResult = swapper(swapDir, details);
                    if(swapperResult.cancel || swapperResult.redirectURL) {
                        return callback(swapperResult);
                    }
                };

                if(config.get('adblock', false)) {
                    let adblockResult = await adblock(details);
                    if(adblockResult.cancel || adblockResult.redirectURL) {
                        return callback(adblockResult);
                    }
                }

                callback({ cancel: false });
            });

            launchKrunker();
        }, 1000);
    }
    
};

if(config.get('uncapFrames')) {
    app.commandLine.appendSwitch('disable-frame-rate-limit');
    app.commandLine.appendSwitch('disable-gpu-vsync');
    app.commandLine.appendSwitch('max-gum-fps', '9999');
}

let flags = [
    ['renderer-process-limit', '100'],
    ['max-active-webgl-contexts', '100'],
    ['disable-dev-shm-usage'],
    ['enable-gpu-rasterization'],
    ['enable-oop-rasterization'],
    ['enable-webgl'],
    ['enable-javascript-harmony'],
    ['enable-future-v8-vm-features'],
    ['enable-quic'],
    ['enable-accelerated-2d-canvas'],
    ['enable-highres-timer'],
    ['disable-accelerated-video-decode', 'false'],
    ['disable-accelerated-video-encode', 'false'],
    ['disable-print-preview'],
    ['disable-metrics-repo'],
    ['disable-metrics'],
    ['disable-breakpad'],
    ['disable-logging'],
    ['no-sandbox'],
    ['disable-component-update'],
    ['disable-bundled-ppapi-flash'],
    ['disable-2d-canvas-clip-aa'],
    ['disable-hang-monitor'],
    ['autoplay-policy', 'no-user-gesture-required'],
    ['high-dpi-support', '1'],
    ['ignore-gpu-blacklist'],
    ['disable-background-timer-throttling'],
    ['disable-renderer-backgrounding']
];

let flagConf = config.get('flags', {});
for(let i = 0; i < flags.length; i++) {
    let flag = flags[i];
    if(flagConf[flag.join('=')] == false) continue;
    app.commandLine.appendSwitch(flag[0], flag[1]);
}
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,MediaSessionService');

if(!config.get('hardwareAcceleration', true)) app.commandLine.appendSwitch('disable-gpu');
if(config.get('angleBackend', 'default') !== 'default') app.commandLine.appendSwitch('use-angle', config.get('angleBackend', 'default'));
if(config.get('webgl2', false)) app.commandLine.appendSwitch('enable-webgl2-compute-context');
if(config.get('inProcessGPU', false)) app.commandLine.appendSwitch('in-process-gpu');
app.whenReady().then(init);