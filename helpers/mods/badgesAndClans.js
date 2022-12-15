let props;
const path = require('path');
const config = new (require('electron-store'))();
const EventUtil = require(path.join(__dirname, '../util/eventUtil.js'));

module.exports = p => props = p;

let badges;
let clans;

let resolveClans;
let awaitClans = () => new Promise(resolve => {
    if(clans === undefined) resolveClans = resolve;
    resolve(clans);
});
let resolveBadges;
let awaitBadges = () => new Promise(resolve => {
    if(badges === undefined) resolveBadges = resolve;
    else resolve(badges);
});

fetch('https://raw.githubusercontent.com/z3db0y/rays-client/main/badges.json').then(res => res.json()).catch(_ => (badges = null) && (resolveBadges && resolveBadges())).then(json => {
    badges = json;
    if(resolveBadges) resolveBadges(badges);
}).catch(_ => (badges = null) && (resolveBadges && resolveBadges()));

fetch('https://raw.githubusercontent.com/z3db0y/rays-client/main/clans.json').then(res => res.json()).catch(_ => (clans = null) && (resolveClans && resolveClans())).then(json => {
    clans = json;
    if(resolveClans) resolveClans(clans);
}).catch(_ => (clans = null) && (resolveClans && resolveClans()));

function apply(event) {
    switch(event) {
        case 'leaderboardChanged':
            applyLeaderboard();
            break;
        case 'killCard':
            applyKillCard();
            break;
        case 'endTable':
            applyEndTable();
            break;
        case 'menuWindow':
            applyFriendsList();
            break;
    }
}

function applyLeaderboard() {
    let players = document.querySelectorAll('*[class^="leaderName"], *[class^="newLeaderName"]');
    if(!props?.game?.players?.list) return;
    for(var player of players) {
        let aliasElement = Array.from(player.childNodes).find(x => x.nodeType === 3);
        let playerAlias = aliasElement.textContent.trim();
        let playerName = props.game.players.list.find(x => x.alias === playerAlias)?.name;
        let clanElement = player.querySelector('span');
        let playerClan = clanElement ? clanElement.textContent.trim().slice(1, -1).toLowerCase() : null;
        if(!playerName) continue;
        let playerBadges = badges[Object.keys(badges).find(x => x.toLowerCase() === playerName.toLowerCase())];

        if(playerBadges && config.get('badges', true)) {
            for(var badge of playerBadges) {
                let html = `<img class="badge" src="https://cdn.z3db0y.com/rays-badges/${badge}.png" style="height: 23px; margin-top: 3px; vertical-align: middle">`;
                if(!player.parentElement.innerHTML.includes(html)) player.insertAdjacentHTML('beforebegin', html);
            }
        }
        let clan = clans[Object.keys(clans).find(x => x.toLowerCase() === playerClan)];
        if((!clan?.style && !clan?.addonHTML) || !config.get('clanTags', true)) continue;

        for(var key in clan.style) clanElement.style[key] = clan.style[key];
        if(clan.addonHTML && !player.innerHTML.includes(clan.addonHTML)) clanElement.insertAdjacentHTML('afterend', clan.addonHTML);
    }
}

function applyKillCard() {
    let kCName = document.getElementById('kCName');
    if(!kCName || !config.get('clanTags', true)) return;
    let clanElement = kCName.querySelector('span');
    if(!clanElement) return;
    let playerClan = clanElement.textContent.trim().slice(1, -1).toLowerCase();
    let clan = clans[Object.keys(clans).find(x => x.toLowerCase() === playerClan)];
    if(!clan?.style && !clan?.addonHTML) return;

    for(var key in clan.style) clanElement.style[key] = clan.style[key];
    if(clan.addonHTML && !kCName.innerHTML.includes(clan.addonHTML)) clanElement.insertAdjacentHTML('afterend', clan.addonHTML);
}

function applyEndTable() {
    let players = document.getElementsByClassName('endTableN');
    window.log('players', players);
    if(!props?.game?.players?.list) return;
    for(var player of players) {
        let playerAlias = Array.from(player.childNodes).find(x => x.nodeType === 3).textContent.trim();
        let playerName = props.game.players.list.find(x => x.alias === playerAlias)?.name;
        let playerBadges = badges[Object.keys(badges).find(x => x.toLowerCase() === playerName.toLowerCase())];
        let clanElement = player.querySelector('span');
        let playerClan = clanElement ? clanElement.textContent.trim().slice(1, -1).toLowerCase() : null;
        if(!playerName) continue;

        if(playerBadges && config.get('badges', true)) {
            for(var badge of playerBadges) {
                let html = `<img class="badge" src="https://cdn.z3db0y.com/rays-badges/${badge}.png" style="height: 28px">`;
                if(!player.parentElement.innerHTML.includes(html)) player.parentElement.insertAdjacentHTML('beforeend', html);
            }
        }

        let clan = clans[Object.keys(clans).find(x => x.toLowerCase() === playerClan)];
        if((!clan?.style && !clan?.addonHTML) || !config.get('clanTags', true)) continue;

        for(var key in clan.style) clanElement.style[key] = clan.style[key];
        if(clan.addonHTML && !player.innerHTML.includes(clan.addonHTML)) clanElement.insertAdjacentHTML('afterend', clan.addonHTML);
    }
}

function applyFriendsList() {
    if(document.getElementById('friendList') && config.get('badges', true)) {
        let names = document.getElementsByClassName('folInfHldr');
        for(var name of names) {
            let playerName = name.querySelector('.lName').textContent.trim();
            let playerBadges = badges[Object.keys(badges).find(x => x.toLowerCase() === playerName.toLowerCase())];
            if(!playerBadges) continue;
            for(var badge of playerBadges) {
                let badgeElement = document.createElement('img');
                badgeElement.src = 'https://cdn.z3db0y.com/rays-badges/' + badge + '.png';
                badgeElement.style.height = '28px';
                badgeElement.style.verticalAlign = 'sub';
                if(!name.innerHTML.includes(badgeElement.outerHTML)) name.insertAdjacentElement('afterbegin', badgeElement);
            }
        }
    }
}

function applyMenu() {
    let menuName = document.getElementById('menuClassNameTag');
    if(!menuName) return;
    let playerName = localStorage.getItem('krunker_username');
    if(!playerName) return;
    let playerBadges = badges[Object.keys(badges).find(x => x.toLowerCase() === playerName.toLowerCase())];
    let clanElement = menuName.querySelector('span.menuClassPlayerClan');
    
    if(clanElement && config.get('clanTags', true)) {
        let playerClan = clanElement.textContent.trim().slice(1, -1).toLowerCase();
        let clan = clans[Object.keys(clans).find(x => x.toLowerCase() === playerClan)];
        if(!clan?.style && !clan?.addonHTML) return;

        for(var key in clan.style) clanElement.style[key] = clan.style[key];
        if(clan.addonHTML && !menuName.innerHTML.includes(clan.addonHTML)) clanElement.insertAdjacentHTML('afterend', clan.addonHTML);
    }

    if(!playerBadges || !config.get('badges', true)) return;

    for(var badge of playerBadges) {
        let badgeElement = document.createElement('img');
        badgeElement.src = 'https://cdn.z3db0y.com/rays-badges/' + badge + '.png';
        badgeElement.style.height = '24px';
        badgeElement.style.verticalAlign = 'middle';
        if(!menuName.innerHTML.includes(badgeElement.outerHTML)) menuName.insertAdjacentElement('beforeend', badgeElement);
    }
}

async function init() {
    await awaitBadges();
    await awaitClans();

    ['leaderboardChanged', 'killCard', 'endTable', 'menuWindow'].forEach(event => EventUtil.on(event, _ => apply(event)));
    EventUtil.on('menuName', _ => applyMenu());
}
init();