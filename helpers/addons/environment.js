module.exports = _ => {
    const Store = require('electron-store');
    const config = new Store();

    function colorToInt(color) {
        let ctx = document.createElement('canvas').getContext('2d');
        ctx.fillStyle = color;
        let col = parseInt(ctx.fillStyle.slice(1), 16);
        ctx.canvas.remove();
        return col;
    }

    let oFetch = window.fetch;
    window.fetch = function fetch(v) {
        let r = oFetch.apply(this, arguments);
        
        return new Promise((resolve, reject) => {
            r.then(res => {
                let oJSON = res.json;
                res.json = function json() {
                    return new Promise((resolve1, reject1) => {
                        oJSON.apply(this, arguments).then(json => {
                            if(json.spawns && json.objects) {
                                // It's a map!
                                if(config.get('environment.sky.enable', false)) json = Object.assign(json, {
                                    sky: config.get('environment.sky.color', '#000000'),
                                    skyDome: false
                                });
                                if(config.get('environment.fog.enable', false)) json = Object.assign(json, {
                                    fogD: config.get('environment.fog.distance', 1000),
                                    fog: colorToInt(config.get('environment.fog.color', 0))
                                });
                                if(config.get('environment.lighttweaks.enable', false)) json = Object.assign(json, {
                                    ambient: colorToInt(config.get('environment.lighttweaks.ambient.color', 0)),
                                    ambientI: config.get('environment.lighttweaks.ambient.intensity', 1),
                                    light: colorToInt(config.get('environment.lighttweaks.sky.color', 0)),
                                    lightI: config.get('environment.lighttweaks.sky.intensity', 1)
                                });
                            }
                            resolve1(json);
                        }).catch(err => {
                            reject1(err);
                        });
                    });
                };
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    }
}