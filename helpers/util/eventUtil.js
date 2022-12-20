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
        name: 'timerVal',
        targetNode: 'timerVal'
    }
];

class EventUtil extends EventEmiiter {
    constructor() {
        super();

        // let track = (event) => {
        //     if(!document.getElementById(event.targetNode)) return setTimeout(() => track(event), 100);
        //     this.emit(event.name);
        //     let opts = {};
        //     if(event.type) opts[event.type] = true;
        //     if(event.type == 'subtree') opts.childList = true;
        //     else opts.childList = true;
        //     if(event.attributeFilter) opts.attributeFilter = event.attributeFilter;
        //     new MutationObserver(mutations => {
        //         for(let m of mutations) {
        //             if(m.type === event.type || !event.type) this.emit(event.name);
        //             window.log(event.name);
        //         }
        //     }).observe(document.getElementById(event.targetNode), opts);
        // }

        // events.forEach(track);

        new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                let event = events.find(e => e.targetNode == mutation.target.id);
                if(!event) return;
                if(event.type && event.type != mutation.type) return;
                if(event.attributeFilter && !event.attributeFilter.includes(mutation.attributeName)) return;
                window.log(event.name);
                this.emit(event.name);
            });
        }).observe(document.getElementById('uiBase'), { childList: true, subtree: true, attributes: true });
    }
}

if(globalThis._eventUtilInstance) {
    module.exports = globalThis._eventUtilInstance;
    
} else {
    module.exports = globalThis._eventUtilInstance = new EventUtil();
}