const ws = require('ws');
const msgpack = require('msgpack-lite');
const { Agent } = require('https');
const EventEmitter = require('events');

class Stats {
    constructor() {
        this.connect();
        this._events = new EventEmitter();
        this._queue = [];
    }

    on(event, callback) {
        this._events.on(event, callback);
    }

    once(event, callback) {
        this._events.once(event, callback);
    }

    off(event, callback) {
        this._events.off(event, callback);
    }

    message(data) {
        let packet = msgpack.decode(data);
        let key = packet[0];
        let args = packet.slice(1);
        switch (key) {
            case 'pi':
                this.send('po');
                break;
            case 'pir':
                break;
            case 'error':
                console.log('KRUNKER server error', args);
                if(this.connectTimeout) clearTimeout(this.connectTimeout);
                this.connectTimeout = setTimeout(() => {
                    this.connect();
                }, 5000);
                break;
            case '0':
                if(args[0] === 'profile') {
                    let name = args[1];
                    let data = args[2];
                    this._queue.forEach((item, i) => {
                        if(item.req === 'profile' && item.name === name) {
                            item.resolve(data);
                            this._queue.splice(i, 1);
                        }
                    });
                } else if(args[0] === 'skin') {
                    let id = args[1];
                    let data = args[2];
                    this._queue.forEach((item, i) => {
                        if(item.req === 'skin' && item.id === id) {
                            item.resolve(data);
                            this._queue.splice(i, 1);
                        }
                    });
                }
                break;
            default:
                console.log('Unknown packet', packet);
                break;
        }
    }

    connect() {
        if(this.ws) this.ws.terminate();
        this.ws = new ws('wss://social.krunker.io/ws', {
            agent: new Agent({
                rejectUnauthorized: false
            }),
            headers: {
                'Origin': 'https://krunker.io'
            }
        });
        this.ws.on('open', this.open.bind(this));
        this.ws.on('close', this.close.bind(this));
        this.ws.on('message', this.message.bind(this));
        this.ws.on('error', () => {});
    }

    open() {
        console.log('Connected to KRUNKER server');
        if(this._queue.length > 0) {
            this._queue.forEach(item => {
                if(item.req === 'profile') {
                    this.getPlayer(item.name).then(item.resolve);
                } else if(item.req === 'skin') {
                    this.getSkin(item.id).then(item.resolve);
                }
            });
            this._queue = [];
        }
    }

    close() {
        console.log('Disconnected from KRUNKER server, reconnecting in 5 seconds...');
        if(this.connectTimeout) clearTimeout(this.connectTimeout);
        this.connectTimeout = setTimeout(() => {
            this.connect();
        }, 5000);
    }

    send(arg, ...data) {
        try { this.ws.send(Buffer.concat([msgpack.encode([arg, ...data]), Buffer.from([0x0, 0x0])])); } catch {}
    }

    getPlayer(name) {
        this.send('r', 'profile', name, null, null);
        return new Promise(resolve => {
            this._queue.push({
                req: 'profile',
                name,
                resolve
            });
        });
    }

    getSkin(id) {
        this.send('st', id, 4);
        return new Promise(resolve => {
            this._queue.push({
                req: 'skin',
                id,
                resolve
            });
        });
    }
}

module.exports = Stats;