const { autoUpdater } = require('electron-updater');
const EventEmitter = require('events');
class Updater extends EventEmitter {
    async update() {
        let self = this;
        return new Promise(async function (resolve) {
            autoUpdater.once('update-available', () => {
                // Progress event.
                autoUpdater.on('download-progress', (obj) => {
                    self.emit('progress', Math.round(obj.percent));
                });
                resolve(true);
                autoUpdater.on('update-downloaded', () => {
                    setTimeout(() => { autoUpdater.quitAndInstall(true, true); }, 1000);
                });
            });
            autoUpdater.once('error', () => { resolve(false); });
            autoUpdater.once('update-not-available', () => {
                resolve(false);
            });
            try {
                await autoUpdater.checkForUpdates().catch(_ => resolve(false));
            } catch(err) {
                resolve(false);
            }
            
        });
    }

}

module.exports = Updater;