const EventEmiiter = require('events');

const events = [
    {
        name: 'leaderboardChanged',
        targetNode: '#newLeaderDisplay'
    },
    {
        name: 'timerChanged',
        targetNode: '#timerVal',
        type: 'childList'
    },
    {
        name: 'chatMsg',
        targetNode: '#chatList',
        type: 'childList'
    },
    {
        name: 'killCard',
        targetNode: '#killCard'
    },
    {
        name: 'endTable',
        targetNode: '#endTable'
    },
    {
        name: 'menuWindow',
        targetNode: '#menuWindow'
    },
    {
        name: 'menuClan',
        targetNode: '#menuClassNameTag'
    },
    {
        name: 'instructionsUpdated',
        targetNode: '#instructions'
    },
    {
        name: 'timerUpdated',
        targetNode: '#timerVal'
    },
    {
        name: 'compMenu',
        targetNode: '#mMenuHolComp'
    },
    {
        name: 'windowHolder',
        targetNode: '#windowHolder'
    },
    {
        name: 'fpsChanged',
        targetNode: '#ingameFPS',
        type: 'childList'
    },
    {
        name: 'menuFpsChanged',
        targetNode: '#menuFPS',
        type: 'childList'
    }
];

class EventUtil extends EventEmiiter {
    constructor() {
        super();

        new MutationObserver(mutations => {
            mutations.forEach(m => {
                events.forEach(event => {
                    if(m.target.matches && m.target.matches(event.targetNode) && (m.type === event.type || !event.type)) {
                        this.emit(event.name, m);
                    }
                });
            });
        }).observe(document, { childList: true, subtree: true, attributes: true });
    }
}

if(global._eventUtilInstance) {
    module.exports = global._eventUtilInstance;
} else {
    module.exports = global._eventUtilInstance = new EventUtil();
}