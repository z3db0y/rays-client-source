const { ipcRenderer } = require('electron');
const path = require('path');
require(path.join(__dirname, 'common.js'));

let wsHook;
let resolveWsHook = () => {};
let awaitWsHook = () => new Promise(resolve => {
    if(wsHook === undefined) resolveWsHook = resolve;
    else resolve();
});

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

ipcRenderer.send('getBadges');
ipcRenderer.on('getBadges', (event, data) => {
    badges = data;
    if(resolveBadges) resolveBadges(badges);
});

ipcRenderer.send('getClans');
ipcRenderer.on('getClans', (event, data) => {
    clans = data;
    if(resolveClans) resolveClans(clans);
});

window.WebSocket = new Proxy(window.WebSocket, {
    construct(target, args) {
        const ws = new target(...args);
        const url = new URL(args[0]);
        if(url.hostname == 'social.krunker.io') {
            wsHook = ws;
            resolveWsHook();
        }
        return ws;
    }
});

function applyPostBadges() {
    let postInfoNames = document.getElementsByClassName('postLink');
    for(var postInfoName of postInfoNames) {
        let playerName = Array.from(postInfoName.children).find(x => x.tagName === 'A').textContent;
        let clanElement = Array.from(postInfoName.children).find(x => x.tagName === 'SPAN' && !x.classList.contains('postTime'));
        let playerClan = clanElement?.textContent?.slice(1, -1).trim();
        let playerBadges = badges.find(x => x.uname == playerName)?.badges;

        if(playerBadges) {
            for(var badge of playerBadges) {
                let html = `<img src="${badge}" style="height: 25px; vertical-align: middle; margin-bottom: 5px; margin-left: 0.3em">`;
                if(!postInfoName.innerHTML.includes(html)) postInfoName.insertAdjacentHTML('beforeend', html);
            }
        }

        if(!playerClan) continue;
        let clan = clans.find(x => x.name.toLowerCase() == playerClan.toLowerCase());
        if(clan) {
            for(var key in clan.style) clanElement.style[key] = clan.style[key];
            if(clan.addonHTML && !postInfoName.innerHTML.includes(clan.addonHTML)) clanElement.insertAdjacentHTML('afterend', clan.addonHTML);
        }
    }
}

function applyLeaderAndSearchBadges() {
    let leaderNames = document.querySelectorAll('a.lName');
    for(var leaderName of leaderNames) {
        let playerName = leaderName.textContent;
        let playerBadges = badges.find(x => x.uname == playerName)?.badges;
        if(playerBadges) {
            for(var badge of playerBadges) {
                let html = `<img src="${badge} style="height: 26px; margin-right: 5px">`;
                if(!leaderName.parentElement.innerHTML.includes(html)) leaderName.parentElement.insertAdjacentHTML('afterbegin', html);
            }
        }

        let clanElement = Array.from(leaderName.parentElement.children).find(x => x.tagName === 'SPAN') || Array.from(leaderName.parentElement.children).find(x => x.tagName === 'A' && !x.classList.contains('lName'));
        let playerClan = clanElement?.textContent?.slice(1, -1).trim();
        if(!playerClan) continue;
        let clan = clans.find(x => x.name.toLowerCase() == playerClan.toLowerCase());
        if(clan) {
            for(var key in clan.style) clanElement.style[key] = clan.style[key];
            if(clan.addonHTML && !leaderName.parentElement.innerHTML.includes(clan.addonHTML.replace(/vertical-align: middle(;?)/g, ''))) clanElement.insertAdjacentHTML('afterend', `<span style="cursor: pointer" onclick="openLink(\'/social.html?p=clan&q=${encodeURIComponent(playerClan)}\', \'_blank\')">` + clan.addonHTML.replace(/vertical-align: middle(;?)/g, '')) + '</span>';
        }
    }
}

function applyClanBadges() {
    let clanElement = document.querySelector('.clanInfH > span');
    if(!clanElement) return;
    let clanName = clanElement.textContent.slice(1, -1).trim();
    let clan = clans.find(x => x.name.toLowerCase() == clanName.toLowerCase());
    if(clan) {
        for(var key in clan.style) clanElement.style[key] = clan.style[key];
        if(clan.addonHTML && !clanElement.parentElement.innerHTML.includes(clan.addonHTML.replace(/vertical-align: middle(;?)/g, ''))) clanElement.insertAdjacentHTML('afterend', clan.addonHTML.replace(/vertical-align: middle(;?)/g, ''));
    }

    let members = document.getElementById('clanRoster').getElementsByClassName('lName');
    for(var member of members) {
        let playerName = member.textContent;
        let playerBadges = badges.find(x => x.uname == playerName)?.badges;
        if(playerBadges) {
            for(var badge of playerBadges) {
                let html = `${badge}" style="height: 26px; margin-right: 1px; margin-top: -8px; vertical-align: middle">`;
                if(!member.parentElement.innerHTML.includes(html)) member.parentElement.insertAdjacentHTML('afterbegin', html);
            }
        }
    }
}

function applyProfileBadges() {
    let nameElement = document.getElementById('nameSwitch');
    let playerName = nameElement?.textContent;
    if(!playerName) return;
    let playerBadges = badges.find(x => x.uname == playerName)?.badges;
    if(playerBadges) {
        for(var badge of playerBadges) {
            let html = `<img src="${badge}" style="height: 32px; vertical-align: middle; margin-top: -14px">`;
            if(!nameElement.parentElement.innerHTML.includes(html)) nameElement.parentElement.insertAdjacentHTML('afterbegin', html);
        }
    }

    let clanElement = Array.from(nameElement.parentElement.children).find(x => x.tagName === 'A');
    let playerClan = clanElement?.textContent?.slice(1, -1).trim();
    if(!playerClan) return;
    let clan = clans.find(x => x.name.toLowerCase() == playerClan.toLowerCase());
    if(clan) {
        for(var key in clan.style) clanElement.style[key] = clan.style[key];
        if(clan.addonHTML && !nameElement.parentElement.innerHTML.includes(clan.addonHTML.replace(/vertical-align: middle(;?)/g, ''))) clanElement.insertAdjacentHTML('afterend', `<a target="_blank" href="/social.html?p=clan&q=${encodeURIComponent(playerClan)}">` + clan.addonHTML.replace(/vertical-align: middle(;?)/g, '') + '</a>');
    }
}

function onChatChange({ target }) {}

function onFeedChange({ target }) {
    applyPostBadges();
}

function onMarketChange({ target }) {}

function onItemsChange({ target }) {}

function onItemsalesChange({ target }) {}

function onListingChange({ target }) {}

function onClanChange({ target }) {
    applyClanBadges();
}

function onLeaderChange({ target }) {
    applyLeaderAndSearchBadges();
}

function onMapChange({ target }) {}

function onModChange({ target }) {}

function onProfileChange({ target }) {
    applyPostBadges();
    applyProfileBadges();
}

function onSearchChange({ target }) {
    applyLeaderAndSearchBadges();
}

async function wsHookFunc() {
    await awaitWsHook();
    console.log('ws hooked');
    window.ws = wsHook;
    // Do stuff with wsHook
}

window.onload = async () => {
    wsHookFunc();
    await awaitBadges();
    await awaitClans();
    console.log(badges);
    applyPostBadges();
    applyLeaderAndSearchBadges();
    applyClanBadges();
    applyProfileBadges();
    new MutationObserver((mutations) => mutations.forEach((mutation) => onChatChange(mutation))).observe(document.getElementById('chatHolder'), { childList: true, subtree: true });
    new MutationObserver((mutations) => mutations.forEach((mutation) => onFeedChange(mutation))).observe(document.getElementById('feedHolder'), { childList: true, subtree: true });
    new MutationObserver((mutations) => mutations.forEach((mutation) => onMarketChange(mutation))).observe(document.getElementById('marketHolder'), { childList: true, subtree: true });
    new MutationObserver((mutations) => mutations.forEach((mutation) => onItemsChange(mutation))).observe(document.getElementById('itemsHolder'), { childList: true, subtree: true });
    new MutationObserver((mutations) => mutations.forEach((mutation) => onItemsalesChange(mutation))).observe(document.getElementById('itemsalesHolder'), { childList: true, subtree: true });
    new MutationObserver((mutations) => mutations.forEach((mutation) => onListingChange(mutation))).observe(document.getElementById('listingHolder'), { childList: true, subtree: true });
    new MutationObserver((mutations) => mutations.forEach((mutation) => onClanChange(mutation))).observe(document.getElementById('clanHolder'), { childList: true, subtree: true });
    new MutationObserver((mutations) => mutations.forEach((mutation) => onLeaderChange(mutation))).observe(document.getElementById('leaderHolder'), { childList: true, subtree: true });
    new MutationObserver((mutations) => mutations.forEach((mutation) => onMapChange(mutation))).observe(document.getElementById('mapHolder'), { childList: true, subtree: true });
    new MutationObserver((mutations) => mutations.forEach((mutation) => onModChange(mutation))).observe(document.getElementById('modHolder'), { childList: true, subtree: true });
    new MutationObserver((mutations) => mutations.forEach((mutation) => onProfileChange(mutation))).observe(document.getElementById('profileHolder'), { childList: true, subtree: true });
    new MutationObserver((mutations) => mutations.forEach((mutation) => onSearchChange(mutation))).observe(document.getElementById('searchHolder'), { childList: true, subtree: true });
};