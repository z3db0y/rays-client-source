let EventEmitter = require('events');
let events = new EventEmitter();
let fs = require('fs');
let path = require('path');

let props = {};
let inj = false;
window.props = props;

let ac = Node.prototype.appendChild;
Node.prototype.appendChild = function (child) {
    let _r = ac.call(this, child);

    if (child instanceof HTMLIFrameElement && child.contentWindow) {
        child.contentWindow.Object.preventExtensions = async function() {
            window.WebSocket = new Proxy(window.WebSocket, {
                construct: function(target, args) {
                    let ws = new target(...args);
                    if(new URL(ws.url).hostname.endsWith('krunker.io')) {
                        props.ws = ws;
                        events.emit('ws');
                    }
                    return ws;
                }
            });
            Object.defineProperties(Object.prototype, {
                'canvas': {
                    'set': function(v) {
                        Object.defineProperties(this, {
                            'render': {
                                'set': function(va) {
                                    this._r = new Proxy(va, {
                                        apply: function(target, thisArg, argumentsList) {
                                            ['scale', 'game', 'controls', 'renderer', 'me'].forEach((arg, i) => {
                                                props[arg] = argumentsList[i];
                                            });
                                            if(props.serializeNetworkMessage) events.emit('variables');
                                            return target.apply(thisArg, argumentsList);
                                        }
                                    });
                                },
                                'get': function() {
                                    return this._r;
                                }
                            }
                        });
                        this._canvas = v;
                    },
                    'get': function() {
                        return this._canvas;
                    }
                }
            });
        };
    }
    return _r;
};

['variables', 'ws', 'msgpack'].forEach(ev => events.on(ev, () => {
    if(props && props.ws && props.game && !inj) {
        inj = true;
        // load mods
        let mods = fs.readdirSync(path.join(__dirname, '../mods'));
        for(let i = 0; i < mods.length; i++) {
            let mod = mods[i];
            if(mod.endsWith('.js')) {
                try {
                    require(path.join(__dirname, '../mods', mod))(props);
                } catch(e) {
                    alert('Failed to load mod: ' + mod + '\nPlease report this bug to the developer\n' + e.toString());
                }
            }
        }
    }
}));