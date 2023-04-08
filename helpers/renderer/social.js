// TODO: remake badges & clan tags on hub ASAP
let { ipcRenderer } = require('electron');
let badges = [];
let clans = [];

ipcRenderer.on('getBadges', (event, data) => {
    badges = data;
});

ipcRenderer.on('getClans', (event, data) => {
    clans = data;
});

ipcRenderer.send('getBadges');
ipcRenderer.send('getClans');

function find(array, fn) {
    for (let i = 0; i < array.length; i++) {
        if (fn(array[i])) return array[i];
    }
}

function map(array, fn) {
    let result = [];
    for (let i = 0; i < array.length; i++) {
        result.push(fn(array[i]));
    }
    return result;
}

function waitFor(o) {
    return new Promise((resolve) => {
        let check = setInterval(() => {
            if(o()) {
                clearInterval(check);
                resolve(o());
            }
        }, 10);
    });
};

// waitFor(_ => window.updateWindow).then(updateWindow => {
//     window.updateWindow = function() {
//         let _r = updateWindow.apply(this, arguments);
//         setTimeout(() => onWindowUpdate(arguments[0]));
//         return _r;
//     };
// });

// waitFor(_ => window.switchFeedTab).then(switchFeedTab => {
//     window.switchFeedTab = function() {
//         let _r = switchFeedTab.apply(this, arguments);
//         setTimeout(() => onFeedSwitchTab(arguments[0]));
//         return _r;
//     };
// });

waitFor(_ => document.getElementById('loadMessage')).then(_ => {
    new MutationObserver((mutations) => {
        if (mutations[0].target.style.display !== 'none') return;
        onWindowUpdate();
    }).observe(document.getElementById('loadMessage'), { attributeFilter: ['style'], attributes: true, attributeOldValue: true });
});

function onWindowUpdate () {
    onFeedSwitchTab();
    modLeaderboard();
}

async function onFeedSwitchTab () {
    await waitFor(_ => document.getElementById('postHolder'));
    let posts = document.getElementById('postHolder');
    for(let i = 0; i < posts.children.length; i++) {
        let post = posts.children[i];
        let link = post.querySelector('span.postLink');
    }
}

async function modLeaderboard () {
    await waitFor(_ => document.getElementById('leaderList'));
    let list = document.getElementById('leaderList');
    await waitFor(_ => list.children[0]);
    list = list.children[0];
    let items = [...list.children];
    for(let i = 0; i < items.length; i++) {
        let item = items[i];
        let name = item.querySelector('a.lName');
        
        if(!name) {
            let cname = item.querySelector('div.clanNameFixed');
            if(!cname) continue;
            let clanTag = find(clans, clan => clan.name.toLowerCase() === cname.innerText.toLowerCase());
            console.log(clanTag);
            if(clanTag) {
                for(let i = 0; i < Object.keys(clanTag.style).length; i++) {
                    let key = Object.keys(clanTag.style)[i];
                    cname.parentElement.style[key] = clanTag.style[key];
                }
                if(clanTag.style['color']) cname.style.color = 'inherit';
                if(clanTag.addonHTML) cname.parentElement.insertAdjacentHTML('beforebegin', '<a href="' + cname.parentElement.href + '">' + clanTag.addonHTML + '</a>');
            }
            continue;
        }

        let clan = [...item.children[0].children][[...item.children[0].children].indexOf(name) + 1];

        if(clan) {
            let clanName = clan.innerText.toLowerCase().slice(1, -1);
            let clanTag = find(clans, clan => clan.name.toLowerCase() === clanName);
            if(clanTag) {
                for(let i = 0; i < Object.keys(clanTag.style).length; i++) {
                    let key = Object.keys(clanTag.style)[i];
                    clan.style[key] = clanTag.style[key];
                }
                if(clanTag.addonHTML) clan.insertAdjacentHTML('afterend', '<a href="' + clan.href + '">' + clanTag.addonHTML + '</a>');
            }
        }

        let player = find(badges, player => player.uname === name.innerText);
        if(player) {
            let badges = map(player.badges, badge => '<img src="' + badge + '" style="height:26px;margin-right:5px">');
            name.insertAdjacentHTML('beforebegin', badges.join(''));
        }
    }
}