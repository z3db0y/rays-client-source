const EventEmiiter = require('events');

const events = [
    {
        name: 'leaderboardChanged',
        targetNode: '#newLeaderDisplay'
    },
    {
        name: 'timerChanged',
        targetNode: '#timerVal'
    },
    {
        name: 'chatMsg',
        targetNode: '#chatList'
    },
    {
        name: 'killCard',
        targetNode: '#killCard'
    },
    {
        name: 'endTable',
        targetNode: '#endTable',
        type: 'subtree'
    },
    {
        name: 'menuWindow',
        targetNode: '#menuWindow'
    },
    {
        name: 'menuName',
        targetNode: '#menuClassNameTag'
    },
    {
        name: 'instructionsUpdated',
        targetNode: '#instructions'
    },
    {
        name: 'compMenu',
        targetNode: '#mMenuHolComp',
        type: 'attributes',
        attributeFilter: ['style']
    },
    {
        name: 'fpsChanged',
        targetNode: '#ingameFPS'
    },
    {
        name: 'menuFpsChanged',
        targetNode: '#menuFPS'
    }
];

class EventUtil extends EventEmiiter {
    constructor() {
        super();

        let track = (event) => {
            if(!document.querySelector(event.targetNode)) return setTimeout(() => track(event), 100);
            this.emit(event.name);
            let opts = {};
            if(event.type) {opts[event.type] = true; event.type === 'subtree' ? opts.childList = true : null; }
            else opts.childList = true;
            if(event.attributeFilter) opts.attributeFilter = event.attributeFilter;
            new MutationObserver(mutations => {
                for(let m of mutations) {
                    if(m.type === event.type || !event.type) this.emit(event.name);
                }
            }).observe(document.querySelector(event.targetNode), opts);
        }

        events.forEach(track);
    }
}

if(globalThis._eventUtilInstance) {
    module.exports = globalThis._eventUtilInstance;
    
} else {
    module.exports = globalThis._eventUtilInstance = new EventUtil();
}