let ws = require('ws');
let msgpack = require('msgpack-lite');
let crypto = require('crypto');
let { Agent } = require('https');
const EventEmitter = require('events');
let socketKey = [116, 104, 110, 107, 115, 95, 115, 111, 114, 116, 101];

const getSocketKey = function() {
    let key = '';
    for (let i = 0; i < socketKey.length; i++) {
        key += String.fromCharCode(socketKey[i]);
    }
    return key;
};

class Client {
    constructor() {
        this.connect();
        this.url = 'https://cdn.z3db0y.com/rays-badges/';
        this.badges = [];
        this.deathCards = [];
        this.users = [];
        this.list = [];
        this.initSent = false;
        this._events = new EventEmitter();
        this._queue = [];
    }

    updateDisplayName(discordId, name, username, cardUrl) {
        if(!this.seed) return setTimeout(() => this.updateDisplayName(discordId, name, username, cardUrl), 1000);
        this.initSent ? this.send('u', name, username, cardUrl) : this.send('init', discordId, name, crypto.createHmac('sha256', this.seed || '').update(getSocketKey()).digest('hex'), username, cardUrl);
        this.initSent = true;
    }

    updateList() {
        this.list = [];
        this.users.forEach(user => {
            let badges = [];
            user[2] ? user[2].forEach(badge => {
                let badgeData = this.badges.find(b => b.id === badge);
                if (badgeData) {
                    badges.push(badgeData);
                }
            }) : null;
            if (!badges.length) return;
            if(!user[1]) return;

            this.list.push({
                name: user[1],
                uname: user[3],
                badges: badges.sort((a, b) => b.p - a.p).map(b => this.url + b.n + '.png'),
                deathCard: user[4]
            });
        });
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
            case 'init':
                this.seed = args[0];
                this.badges = args[1];
                this.deathCards = args[2] ? args[2].map(card => { return {
                    name: card.n,
                    url: card.u
                }}) : [];
                break;
            case 'au':
                this.users = args;
                this.updateList();
                break;
            case 'u':
                console.log('User updated', args);
                // get user by their discord id
                let user = this.users.find(user => user[0] === args[0]);

                // if the user exists, update each data property for the user instead of updating the reference to the user
                if (user) {
                    for (let i = 0; i < args.length; i++) {
                        user[i] = args[i];
                    }
                } else {
                    // otherwise, add them to the list
                    this.users.push(args);
                }
                this.updateList();
                this._events.emit('userUpdate');
                break;
            case 'c':
                this.clans = args;
                break;
            default:
                console.log('Unknown packet', packet);
                break;
        }
    }

    connect() {
        if(this.ws) this.ws.terminate();
        this.ws = new ws('wss://api.z3db0y.com/rays/ws', {
            agent: new Agent({
                rejectUnauthorized: false
            })
        });
        this.ws.on('open', this.open.bind(this));
        this.ws.on('close', this.close.bind(this));
        this.ws.on('message', this.message.bind(this));
        this.ws.on('error', () => {});
    }

    open() {
        console.log('Connected to server');
        this._queue.forEach(packet => {
            this.send(...packet);
            this._queue.splice(this._queue.indexOf(packet), 1);
        });
    }

    close() {
        console.log('Disconnected from server, reconnecting in 5 seconds...');
        setTimeout(() => {
            this.connect();
        }, 5000);
    }

    send(arg, ...data) {
        try { this.ws.send(msgpack.encode([arg, ...data])); }
        catch {
            this._queue.push([arg, ...data]);
        }
    }
}

module.exports = Client;