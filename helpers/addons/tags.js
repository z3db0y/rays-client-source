
module.exports = _ => {
    if(
        !document.getElementById('menuClassNameTag') ||
        !document.getElementById('newLeaderDisplay')
    ) return setTimeout(module.exports, 100);
    const leaderboard = document.getElementById('newLeaderDisplay');
    const oldLeaderboard = document.getElementById('leaderDisplay');
    const menuName = document.getElementById('menuClassNameTag');

    const { ipcRenderer } = require('electron');
    const config = new (require('electron-store'))();

    let applyBadges = config.get('badges', true);
    let applyClans = config.get('clans', true);

    if(!applyBadges && !applyClans) return;

    let badges = [];
    let clans = [];
    let ownBadges = [];

    ipcRenderer.on('getBadges', (event, data) => {
        badges.push(data);
    });

    ipcRenderer.send('getOwnBadges');
    ipcRenderer.on('getOwnBadges', (event, data) => {
        ownBadges = data;
        updateMenuTag();
    });

    ipcRenderer.send('getClans');
    ipcRenderer.on('getClans', (event, data) => {
        clans = data;
        updateMenuTag();
    });

    function find(array, func) {
        for(var i = 0; i < array.length; i++) if(func(array[i])) return array[i];
    }

    function updateMenuTag() {
        if(applyBadges) {
            for(var badge of ownBadges) {
                let badgeElement = document.createElement('img');
                badgeElement.src = badge;
                badgeElement.style.height = '24px';
                badgeElement.style.verticalAlign = 'middle';
                if(!menuName.innerHTML.includes(badgeElement.outerHTML)) menuName.insertAdjacentElement('beforeend', badgeElement);
            }
        }
        if(applyClans) {
            let playerClan = menuName.querySelector('span.menuClassPlayerClan')?.textContent.trim().slice(1, -1).toLowerCase();
            let clan = clans ? find(clans, x => x.name.toLowerCase() === playerClan) : null;
            if(!clan?.style && !clan?.addonHTML) return;

            for(var key in clan.style) menuName.querySelector('span.menuClassPlayerClan').style[key] = clan.style[key];
            if(clan.addonHTML && !menuName.innerHTML.includes(clan.addonHTML)) menuName.querySelector('span.menuClassPlayerClan').insertAdjacentHTML('afterend', clan.addonHTML);
        }
    }
    new MutationObserver(updateMenuTag).observe(menuName, { childList: true });

    let newLeaderDisplay = document.getElementById('newLeaderDisplay');

    function map(array, func) {
        let newa = [];
        for(var i = 0; i < array.length; i++) newa.push(func(array[i]));
        return newa;
    }

    new MutationObserver(_ => {
        let playerEls = [...map([...leaderboard.children[0].children[0].children[0].children].slice(2), child => child.children[0].children[0].lastChild), ...map([...oldLeaderboard.children[0].children], child => child.children[child.children.length - 2])];
        
        let players = [];
        for(let i = 0; i < playerEls.length; i++) {
            let playerEl = playerEls[i];
            let playerNode = find([...playerEl.childNodes], x => x.nodeType == 3);
            let playerName = playerNode?.textContent.trim();
            players.push(playerName);
            let player = find(badges, x => x.name == playerName);
            let playerBadges = badges ? player?.badges || [] : [];
            if(!player) ipcRenderer.send('getBadges', playerName); // Get badges for player if not found

            if(applyBadges) {
                playerBadges.forEach(badge => {
                    let html = `<img class="badge" src="${badge}" style="height: 23px; margin-top: 3px; vertical-align: middle">`;
                    if(!playerEl.parentElement.innerHTML.includes(html)) playerEl.insertAdjacentHTML('beforebegin', html);
                });
            }
            
            if(!applyClans) continue;
            let playerClan = playerEl.querySelector('span')?.textContent.trim().slice(1, -1).toLowerCase();
            let clan = clans ? find(clans, x => x.name.toLowerCase() === playerClan) : null;
            if(!clan?.style && !clan?.addonHTML) continue;

            for(var key in clan.style) playerEl.querySelector('span').style[key] = clan.style[key];
            if(clan.addonHTML && !playerEl.innerHTML.includes(clan.addonHTML)) playerEl.querySelector('span').insertAdjacentHTML('afterend', clan.addonHTML);
        }

        badges = badges.filter(x => players.includes(x.name)); // GC badges
    }).observe(newLeaderDisplay, { childList: true });
};