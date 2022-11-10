const path = require('path');

let clans = {};
fetch('https://raw.githubusercontent.com/z3db0y/rays-client/main/clans.json').then(res => res.json()).catch(_ => {}).then(json => {
    clans = json;

    let EventUtil = require(path.join(__dirname, '../eventUtil.js'));
    ['leaderboardChanged', 'killCard', 'endTable', 'menuWindow'].forEach(event => EventUtil.on(event, _ => {
        log('event', event);
        document.querySelectorAll('*[class^="leaderName"] span, *[class^="newLeaderName"] span, .pListName span, #kCName span, .endTableN span').forEach(el => {
            for(var clanName in clans) {
                let style = clans[clanName].style;
                let addonHTML = clans[clanName].addonHTML;
                if(el.textContent.toLowerCase() === ' [' + clanName.toLowerCase() + ']') {
                    Object.keys(style).forEach(key => {
                        el.style[key] = style[key];
                    });
                    if(addonHTML && !el.parentElement.innerHTML.endsWith(addonHTML)) el.parentElement.innerHTML += addonHTML;
                }
            }
        });
    }));

    let menuClan = document.getElementById('menuClassNameTag');
    let clan = document.querySelector('span.menuClassPlayerClan');
    
    function applyMenuClan() {
        for(var clanName in clans) {
            let style = clans[clanName].style;
            let addonHTML = clans[clanName].addonHTML;
            if(clan && clan.textContent.toLowerCase() === '[' + clanName.toLowerCase() + ']') {
                Object.keys(style).forEach(key => {
                    clan.style[key] = style[key];
                });
                if(addonHTML && !clan.parentElement.innerHTML.endsWith(addonHTML)) clan.parentElement.innerHTML += addonHTML;
            }
        }
    }

    EventUtil.on('menuClan', _ => {
        clan = document.querySelector('span.menuClassPlayerClan');
        applyMenuClan();
    });

    if(clan) applyMenuClan();
}).catch(_ => {});