const WebSocket = require('ws');
const msgpack = require('msgpack-lite');

function encode(msg) {
    return Buffer.concat([msgpack.encode(msg), Buffer.from([0, 0])]);
}

function wsOpen() {
    return new Promise(resolve => {
        if(module.exports._ws.readyState === 1) return resolve();
        module.exports._ws.once('open', resolve);
    });
}

module.exports = {
    _ws: new WebSocket('wss://social.krunker.io/ws', {
        headers: {
            'Origin': 'https://krunker.io'
        }
    }),
    getPlayer: async name => {
        await wsOpen();
        module.exports._ws.send(encode(['r', 'profile', name, null, null]));
        console.log('sent', name);
        return new Promise(resolve => {
            module.exports._ws.on('message', data => {
                data = msgpack.decode(data);
                if(data[0] === '0' && data[1] === 'profile' && data[2] == name) {
                    resolve(data[3]);
                }
            });
            module.exports._ws.once('close', async () => {
                resolve(await module.exports.getPlayer(name));
            });
        });
    },
    getSkin: async id => {
        await wsOpen();
        module.exports._ws.send(encode(['st', id, 4]));
        return new Promise(resolve => {
            module.exports._ws.on('message', data => {
                data = msgpack.decode(data);
                if(data[0] === 'gd' && data[2] == id) {
                    resolve(data[1]);
                }
            });
            module.exports._ws.once('close', async () => {
                resolve(await module.exports.getSkin(id));
            });
        });
    }
}
function initWS() {
    module.exports._ws.on('error', () => {
        module.exports._ws = new WebSocket('wss://social.krunker.io/ws', {
            headers: {
                'Origin': 'https://krunker.io'
            }
        });
        initWS();
    });
    module.exports._ws.on('message', data => {
        try {
            data = msgpack.decode(data);
            if(data[0] === 'pi') {
                module.exports._ws.send(encode(['po']));
            } else if(data[0] === 'error') {
                module.exports._ws.close();
                module.exports._ws = new WebSocket('wss://social.krunker.io/ws', {
                    headers: {
                        'Origin': 'https://krunker.io'
                    }
                });
                initWS();
            }
        } catch {}
    });
}
initWS();