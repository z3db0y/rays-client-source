const EventEmiiter = require('events');

const events = [
    {
        name: 'leaderboardChanged',
        targetNode: 'newLeaderDisplay'
    },
    {
        name: 'chatMsg',
        targetNode: 'chatList'
    },
    {
        name: 'killCard',
        targetNode: 'killCard'
    },
    {
        name: 'endTable',
        targetNode: 'endTabbedView',
        type: 'subtree'
    },
    {
        name: 'endTable',
        targetNode: 'endUI',
        type: 'attributes',
        attributeFilter: ['style']
    },
    {
        name: 'menuWindow',
        targetNode: 'menuWindow'
    },
    {
        name: 'menuName',
        targetNode: 'menuClassNameTag'
    },
    {
        name: 'compMenu',
        targetNode: 'mMenuHolComp',
        type: 'attributes',
        attributeFilter: ['style']
    },
    {
        name: 'fpsChanged',
        targetNode: 'ingameFPS'
    }
];

class EventUtil extends EventEmiiter {
    constructor() {
        super();

        let track = (event) => {
            if(!document.getElementById(event.targetNode)) return setTimeout(() => track(event), 100);
            this.emit(event.name);
            let opts = {};
            if(event.type) {opts[event.type] = true; event.type === 'subtree' ? opts.childList = true : null; }
            else opts.childList = true;
            if(event.attributeFilter) opts.attributeFilter = event.attributeFilter;
            new MutationObserver(mutations => {
                for(let m of mutations) {
                    if(m.type === event.type || !event.type) this.emit(event.name);
                    window.log(event.name);
                }
            }).observe(document.getElementById(event.targetNode), opts);
        }

        events.forEach(track);
    }
}

if(globalThis._eventUtilInstance) {
    module.exports = globalThis._eventUtilInstance;
    
} else {
    module.exports = globalThis._eventUtilInstance = new EventUtil();
}