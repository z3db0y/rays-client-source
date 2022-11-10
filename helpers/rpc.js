const RPC = require('discord-rpc');
const { EventEmitter } = require('events');
class RPCWrap extends EventEmitter {
    __initInProg = 0;

    constructor(clientID) {
        super();
        this.__clientID = clientID;
        this.__init();
    }

    __init() {
        if(this.__initInProg) return;
        this.__initInProg = 1; // Lock
        this.__client = new RPC.Client({ transport: 'ipc' });
        this.__client.login({ clientId: this.__clientID }).then(_ => {
            this.__initInProg = 0;
            RPC.register(this.__clientID);
            this.__client.on('disconnected', () => this.__init());
            this.__subEvents();
            this.emit('connect');
        }).catch(_ => {
            // console.log(_);
            this.__initInProg = 0;
            setTimeout(() => { this.__init() }, 5000);
        });
    }

    __subEvents() {
        this.__client.subscribe('ACTIVITY_JOIN', {});
        // this.__client.subscribe('ACTIVITY_JOIN_REQUEST', {});
        this.__client.on('ACTIVITY_JOIN', (ev) => this.emit('ACTIVITY_JOIN', ev));
        // this.__client.on('ACTIVITY_JOIN_REQUEST', (ev) => this.emit('ACTIVITY_JOIN_REQUEST', ev));
    }

    setActivity() {
        if(this.__client.user) this.__client.setActivity(...arguments).catch(_ => {
            this.emit('disconnect');
            this.__init();
        });
    }

    clearActivity() {
        if(this.__client.user) this.__client.clearActivity().catch(_ => {
            this.emit('disconnect');
            this.__init();
        });
    }
}
module.exports = RPCWrap;