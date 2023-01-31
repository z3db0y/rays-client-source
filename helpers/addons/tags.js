module.exports = _ => {
    if(
        !document.getElementById('menuClassNameTag') ||
        !document.getElementById('newLeaderDisplay')
    ) return setTimeout(module.exports, 100);
    const leaderboard = document.getElementById('newLeaderDisplay');
    const oldLeaderboard = document.getElementById('leaderDisplay');
    const menuName = document.getElementById('menuClassNameTag');

    const Store = require('electron-store');
    const config = new Store();
    if(!config.get('badges', true)) return;

    let premiumNames = [];
    let badges;
    let clans;
    // TODO: rewrite badges

    fetch('https://raw.githubusercontent.com/z3db0y/rays-client/main/badges.json').then(res => res.json()).catch(_ => (badges = null) && (resolveBadges && resolveBadges())).then(json => {
        badges = json;

        for(var player in badges) {
            fetch('https://api.z3db0y.com/krunker/r/profile/' + player).then(res => res.json()).then(json => {
                if(json[3] && json[3].player_alias && json[3].player_premium > 0) premiumNames.push({
                    name: json[3].player_name,
                    alias: json[3].player_alias || json[3].player_name
                });
            });
        }
    });

    fetch('https://raw.githubusercontent.com/z3db0y/rays-client/main/clans.json').then(res => res.json()).catch(_ => (clans = null) && (resolveClans && resolveClans())).then(json => {
        clans = json;
    });

    new MutationObserver(_ => {
        let playerName = localStorage.getItem('krunker_username');
        if(!playerName) return;
        
        let playerBadges = badges ? badges[Object.keys(badges).find(x => x.toLowerCase() === playerName.toLowerCase())] || [] : [];
        for(var badge of playerBadges) {
            let badgeElement = document.createElement('img');
            badgeElement.src = 'https://cdn.z3db0y.com/rays-badges/' + badge + '.png';
            badgeElement.style.height = '24px';
            badgeElement.style.verticalAlign = 'middle';
            if(!menuName.innerHTML.includes(badgeElement.outerHTML)) menuName.insertAdjacentElement('beforeend', badgeElement);
        }

        let playerClan = menuName.querySelector('span.menuClassPlayerClan')?.textContent.trim().slice(1, -1).toLowerCase();
        let clan = clans ? clans[Object.keys(clans).find(x => x.toLowerCase() === playerClan)] : null;
        if(!clan?.style && !clan?.addonHTML) return;

        for(var key in clan.style) menuName.querySelector('span.menuClassPlayerClan').style[key] = clan.style[key];
        if(clan.addonHTML && !menuName.innerHTML.includes(clan.addonHTML)) menuName.querySelector('span.menuClassPlayerClan').insertAdjacentHTML('afterend', clan.addonHTML);
    }).observe(menuName, { childList: true });

    let newLeaderDisplay = document.getElementById('newLeaderDisplay');
    new MutationObserver(_ => {
        let playerEls = [...[...leaderboard.children[0].children[0].children[0].children].slice(2).map(child => child.children[0].children[0].lastChild), ...[...oldLeaderboard.children[0].children].map(child => child.children[child.children.length - 2])];
        window.playerEls = playerEls;
        for(let playerEl of playerEls) {
            let playerNode = [...playerEl.childNodes].find(x => x.nodeType == 3);
            let playerName = playerNode?.textContent.trim();
            let playerBadges = badges ? badges[Object.keys(badges).find(x => x.toLowerCase() === (premiumNames.find(x => x.alias == playerName)?.name || playerName).toLowerCase())] || [] : [];

            playerBadges.forEach(badge => {
                let html = `<img class="badge" src="https://cdn.z3db0y.com/rays-badges/${badge}.png" style="height: 23px; margin-top: 3px; vertical-align: middle">`;
                if(!playerEl.parentElement.innerHTML.includes(html)) playerEl.insertAdjacentHTML('beforebegin', html);
            });
            
            let playerClan = playerEl.querySelector('span')?.textContent.trim().slice(1, -1).toLowerCase();
            let clan = clans ? clans[Object.keys(clans).find(x => x.toLowerCase() === playerClan)] : null;
            if(!clan?.style && !clan?.addonHTML) continue;

            for(var key in clan.style) playerEl.querySelector('span').style[key] = clan.style[key];
            if(clan.addonHTML && !playerEl.innerHTML.includes(clan.addonHTML)) playerEl.querySelector('span').insertAdjacentHTML('afterend', clan.addonHTML);
        }
    }).observe(newLeaderDisplay, { childList: true });
};